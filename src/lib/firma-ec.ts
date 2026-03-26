/**
 * firma-ec.ts — Módulo de firma electrónica para Ecuador
 *
 * Requisitos normativos implementados:
 * - AM 0009-2017: Firma electrónica obligatoria en documentos médicos
 * - Ley de Comercio Electrónico (Ley 67): solo certificados de entidades acreditadas BCE
 * - Entidades acreditadas BCE: Security Data, ANF AC, ESEC, BCE, Banco Central
 * - PAdES-T (RFC 3161): sello de tiempo TSA para validez a largo plazo (LOPDP retención 15 años)
 *
 * Niveles de firma soportados:
 *   PAdES-B — firma básica con certificado BCE (siempre)
 *   PAdES-T — + sello de tiempo TSA (si TSA_URL está configurado en env o se pasa explícitamente)
 */

import forge from 'node-forge'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'
import signpdf from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import crypto from 'crypto'

// ─── TSA Constants ────────────────────────────────────────────────────────────

/** OID id-aa-signatureTimeStampToken (RFC 3161, ETSI TS 101 733) */
const OID_TSA_TIMESTAMP_TOKEN = '1.2.840.113549.1.9.16.2.14'

/** OID SHA-256 */
const OID_SHA256 = '2.16.840.1.101.3.4.2.1'

/** Tamaño reservado para la firma en el PDF (bytes). Aumentado para acomodar el TSA token (~3-4 KB). */
const SIGNATURE_PLACEHOLDER_BYTES = 16384

// Entidades de certificación acreditadas por el BCE de Ecuador (Ley 67)
const BCE_ACCREDITED_ISSUERS = [
  'security data',
  'securitydata',
  'anf ac',
  'anfac',
  'anf autoridad de certificacion',
  'esec',
  'empresa de seguridad',
  'banco central del ecuador',
  'bce',
  'consejo de la judicatura',
  'registro civil',
]

// ─── encryptPassword ──────────────────────────────────────────────────────────

export function encryptPassword(plainPassword: string): {
  iv: string
  tag: string
  encPass: string
} {
  const masterKeyHex = process.env.FIRMA_EC_MASTER_KEY
  if (!masterKeyHex) {
    throw new Error('FIRMA_EC_MASTER_KEY not configured')
  }

  const key = Buffer.from(masterKeyHex, 'hex')
  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plainPassword, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    encPass: encrypted.toString('hex'),
  }
}

// ─── decryptPassword ──────────────────────────────────────────────────────────

export function decryptPassword(iv: string, tag: string, encPass: string): string {
  const masterKeyHex = process.env.FIRMA_EC_MASTER_KEY
  if (!masterKeyHex) {
    throw new Error('FIRMA_EC_MASTER_KEY not configured')
  }

  const key = Buffer.from(masterKeyHex, 'hex')
  const ivBuf = Buffer.from(iv, 'hex')
  const tagBuf = Buffer.from(tag, 'hex')
  const encBuf = Buffer.from(encPass, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf)
  decipher.setAuthTag(tagBuf)

  const decrypted = Buffer.concat([decipher.update(encBuf), decipher.final()])
  return decrypted.toString('utf8')
}

// ─── validateP12 ─────────────────────────────────────────────────────────────

export function validateP12(
  p12Buffer: Buffer,
  password: string
): {
  valid: boolean
  subject: string
  issuer: string
  notAfter: Date
  isAccreditedBce: boolean
  error?: string
} {
  try {
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'))
    const p12Asn1 = forge.asn1.fromDer(p12Der)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const bags = certBags[forge.pki.oids.certBag]

    if (!bags || bags.length === 0) {
      return { valid: false, subject: '', issuer: '', notAfter: new Date(), isAccreditedBce: false, error: 'No certificates found in .p12 file' }
    }

    const cert = bags[0]?.cert
    if (!cert) {
      return { valid: false, subject: '', issuer: '', notAfter: new Date(), isAccreditedBce: false, error: 'Could not extract certificate from .p12 file' }
    }

    // Extract CN from subject
    const cnAttr = cert.subject.getField('CN')
    const subject = cnAttr
      ? (cnAttr.value as string)
      : cert.subject.attributes
          .map((a: { shortName?: string; value?: unknown }) => `${a.shortName}=${a.value}`)
          .join(', ')

    // Extract issuer DN
    const issuerAttrs = cert.issuer.attributes as Array<{ shortName?: string; value?: unknown }>
    const issuer = issuerAttrs.map(a => `${a.shortName}=${a.value}`).join(', ')

    const notAfter = cert.validity.notAfter

    // Verify issuer is a BCE-accredited CA (Ley 67 Ecuador)
    const issuerLower = issuer.toLowerCase()
    const isAccreditedBce = BCE_ACCREDITED_ISSUERS.some(ca => issuerLower.includes(ca))

    return { valid: true, subject, issuer, notAfter, isAccreditedBce }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      subject: '',
      issuer: '',
      notAfter: new Date(),
      isAccreditedBce: false,
      error: `Failed to parse .p12: ${message}`,
    }
  }
}

// ─── checkCertificateExpiry ───────────────────────────────────────────────────

export function checkCertificateExpiry(p12Buffer: Buffer, password: string): {
  expired: boolean
  notAfter: Date
  daysRemaining: number
} {
  const { notAfter } = validateP12(p12Buffer, password)
  const now = new Date()
  const daysRemaining = Math.floor((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { expired: notAfter < now, notAfter, daysRemaining }
}

// ─── TSA helpers (PAdES-T — RFC 3161) ────────────────────────────────────────

/**
 * Construye un TimeStampReq (RFC 3161) para el hash SHA-256 dado.
 * certReq=true para que el TSA incluya su certificado en el token.
 */
function buildTimeStampReq(hash: Buffer): Buffer {
  const a = forge.asn1
  const tsq = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
    a.create(a.Class.UNIVERSAL, a.Type.INTEGER, false, '\x01'),           // version v1
    a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [                  // messageImprint
      a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [               // AlgorithmIdentifier SHA-256
        a.create(a.Class.UNIVERSAL, a.Type.OID, false,
          a.oidToDer(OID_SHA256).getBytes()),
        a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ''),
      ]),
      a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false,
        hash.toString('binary')),
    ]),
    a.create(a.Class.UNIVERSAL, a.Type.INTEGER, false,                    // nonce (8 bytes random)
      crypto.randomBytes(8).toString('binary')),
    a.create(a.Class.UNIVERSAL, a.Type.BOOLEAN, false, '\xff'),           // certReq = true
  ])
  return Buffer.from(a.toDer(tsq).getBytes(), 'binary')
}

/**
 * Solicita un sello de tiempo RFC 3161 al servidor TSA.
 * Devuelve el TimeStampToken (ContentInfo DER) listo para incrustar.
 * Timeout: 10 segundos. Lanza si el servidor rechaza la solicitud.
 */
async function fetchTsaToken(signatureValue: Buffer, tsaUrl: string): Promise<Buffer> {
  const hash = crypto.createHash('sha256').update(signatureValue).digest()
  const tsqBytes = buildTimeStampReq(hash)

  const resp = await fetch(tsaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/timestamp-query',
      'Accept': 'application/timestamp-reply',
    },
    body: new Uint8Array(tsqBytes),
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) throw new Error(`TSA returned HTTP ${resp.status} ${resp.statusText}`)

  const tsrBytes = Buffer.from(await resp.arrayBuffer())

  // TimeStampResp ::= SEQUENCE { status PKIStatusInfo, timeStampToken ContentInfo OPTIONAL }
  const tsrAsn1 = forge.asn1.fromDer(forge.util.createBuffer(tsrBytes.toString('binary')))
  const tsrFields = tsrAsn1.value as forge.asn1.Asn1[]

  if (tsrFields.length < 2) throw new Error('TSA response does not contain a TimeStampToken')

  // PKIStatusInfo[0] es el INTEGER de estado (0=granted, 1=grantedWithMods, 2+=error)
  const pkiStatus = (tsrFields[0].value as forge.asn1.Asn1[])[0]
  const statusCode = (pkiStatus.value as string).charCodeAt(0)
  if (statusCode !== 0 && statusCode !== 1) {
    throw new Error(`TSA refused the request with PKIStatus=${statusCode}`)
  }

  return Buffer.from(forge.asn1.toDer(tsrFields[1]).getBytes(), 'binary')
}

/**
 * Extrae el CMS embebido en /Contents del PDF firmado.
 * Devuelve el buffer del CMS y la posición exacta del hex en el PDF.
 */
function extractCmsFromPdf(pdfBuf: Buffer): {
  cms: Buffer
  hexStart: number
  hexLength: number
} {
  // Buscar la última ocurrencia de /Contents < (la firma siempre está al final)
  const marker = Buffer.from('/Contents <')
  let markerPos = -1
  for (let i = pdfBuf.length - marker.length; i >= 0; i--) {
    if (pdfBuf.slice(i, i + marker.length).equals(marker)) {
      markerPos = i
      break
    }
  }
  if (markerPos === -1) throw new Error('No se encontró /Contents en el PDF firmado')

  const hexStart = markerPos + marker.length
  let hexEnd = hexStart
  while (hexEnd < pdfBuf.length && pdfBuf[hexEnd] !== 0x3e /* '>' */) hexEnd++

  const hexStr = pdfBuf.slice(hexStart, hexEnd).toString('ascii')
  const rawBytes = Buffer.from(hexStr, 'hex')

  // Determinar longitud exacta del CMS via cabecera DER (0x30 = SEQUENCE)
  if (rawBytes[0] !== 0x30) throw new Error('CMS no comienza con SEQUENCE tag (0x30)')
  let cmsBodyLen: number
  let headerLen: number
  if (rawBytes[1] & 0x80) {
    const numLen = rawBytes[1] & 0x7f
    cmsBodyLen = 0
    for (let i = 0; i < numLen; i++) cmsBodyLen = (cmsBodyLen << 8) | rawBytes[2 + i]
    headerLen = 2 + numLen
  } else {
    cmsBodyLen = rawBytes[1]
    headerLen = 2
  }

  return { cms: rawBytes.slice(0, headerLen + cmsBodyLen), hexStart, hexLength: hexEnd - hexStart }
}

/**
 * Navega la estructura CMS SignedData y devuelve una referencia mutable
 * al array de campos del primer SignerInfo.
 */
function getSignerInfoFields(cmsAsn1: forge.asn1.Asn1): forge.asn1.Asn1[] {
  // ContentInfo → [0] EXPLICIT wrapper → SignedData SEQUENCE → ... → signerInfos SET
  const contentInfoFields = cmsAsn1.value as forge.asn1.Asn1[]
  const explicitWrapper = contentInfoFields[1]
  const signedData = (explicitWrapper.value as forge.asn1.Asn1[])[0]
  const sdFields = signedData.value as forge.asn1.Asn1[]

  // signerInfos es el último SET de clase UNIVERSAL en SignedData
  for (let i = sdFields.length - 1; i >= 0; i--) {
    const f = sdFields[i]
    if (f.tagClass === forge.asn1.Class.UNIVERSAL && f.type === forge.asn1.Type.SET) {
      const sis = f.value as forge.asn1.Asn1[]
      if (sis.length === 0) throw new Error('signerInfos está vacío')
      return sis[0].value as forge.asn1.Asn1[]
    }
  }
  throw new Error('No se encontró signerInfos SET en SignedData')
}

/**
 * Extrae el valor de firma (OCTET STRING) del SignerInfo.
 * Es el primer OCTET STRING de clase UNIVERSAL (no los signedAttrs [0]).
 */
function getSignatureValue(signerInfoFields: forge.asn1.Asn1[]): Buffer {
  for (const field of signerInfoFields) {
    if (
      field.tagClass === forge.asn1.Class.UNIVERSAL &&
      field.type === forge.asn1.Type.OCTETSTRING
    ) {
      return Buffer.from(field.value as string, 'binary')
    }
  }
  throw new Error('No se encontró el valor de firma (OCTET STRING) en SignerInfo')
}

/**
 * Añade el TSA token como atributo no firmado [1] { id-aa-signatureTimeStampToken }
 * en el SignerInfo del CMS. Devuelve el CMS modificado en DER.
 */
function addTsaTokenToCms(cmsBytes: Buffer, tsaTokenBytes: Buffer): Buffer {
  const cmsAsn1 = forge.asn1.fromDer(forge.util.createBuffer(cmsBytes.toString('binary')))
  const signerInfoFields = getSignerInfoFields(cmsAsn1)

  const tsaTokenAsn1 = forge.asn1.fromDer(
    forge.util.createBuffer(tsaTokenBytes.toString('binary'))
  )

  // unsignedAttrs [1] IMPLICIT ::= SEQUENCE { OID, SET { TimeStampToken } }
  const unsignedAttrs = forge.asn1.create(0x80, 1, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false,
        forge.asn1.oidToDer(OID_TSA_TIMESTAMP_TOKEN).getBytes()),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
        tsaTokenAsn1,
      ]),
    ]),
  ])

  // Eliminar unsignedAttrs previos (si se llama dos veces) y agregar el nuevo
  while (signerInfoFields.length > 0) {
    const last = signerInfoFields[signerInfoFields.length - 1]
    if (last.tagClass === 0x80 && last.type === 1) {
      signerInfoFields.pop()
    } else break
  }
  signerInfoFields.push(unsignedAttrs)

  return Buffer.from(forge.asn1.toDer(cmsAsn1).getBytes(), 'binary')
}

/**
 * Reemplaza los bytes de /Contents en el PDF firmado con el CMS modificado.
 * El ByteRange NO cubre /Contents, por lo que la firma original permanece válida.
 */
function embedCmsInPdf(
  pdfBuf: Buffer,
  newCms: Buffer,
  hexStart: number,
  hexLength: number,
): Buffer {
  const newHex = newCms.toString('hex').toUpperCase()
  if (newHex.length > hexLength) {
    throw new Error(
      `CMS con TSA (${newHex.length / 2} bytes) supera el espacio reservado en el PDF ` +
      `(${hexLength / 2} bytes). Aumentar SIGNATURE_PLACEHOLDER_BYTES.`
    )
  }
  const paddedHex = Buffer.from(newHex.padEnd(hexLength, '0'))
  return Buffer.concat([pdfBuf.slice(0, hexStart), paddedHex, pdfBuf.slice(hexStart + hexLength)])
}

/**
 * Añade un sello de tiempo RFC 3161 (PAdES-T) a un PDF ya firmado.
 * Si falla por cualquier motivo, devuelve el PDF original sin modificar (PAdES-B).
 */
async function applyTsaToPdf(signedPdf: Buffer, tsaUrl: string): Promise<Buffer> {
  // 1. Extraer CMS del PDF
  const { cms, hexStart, hexLength } = extractCmsFromPdf(signedPdf)

  // 2. Obtener el valor de firma del SignerInfo
  const cmsAsn1 = forge.asn1.fromDer(forge.util.createBuffer(cms.toString('binary')))
  const signerInfoFields = getSignerInfoFields(cmsAsn1)
  const sigValue = getSignatureValue(signerInfoFields)

  // 3. Solicitar token TSA para la firma
  const tsaToken = await fetchTsaToken(sigValue, tsaUrl)

  // 4. Incrustar TSA token en el CMS
  const cmsWithTsa = addTsaTokenToCms(cms, tsaToken)

  // 5. Reemplazar CMS en el PDF
  return embedCmsInPdf(signedPdf, cmsWithTsa, hexStart, hexLength)
}

// ─── signPdf ──────────────────────────────────────────────────────────────────

/**
 * Firma un PDF con el certificado .p12 proporcionado (PAdES-B).
 * Si tsaUrl está configurado (o la variable de entorno TSA_URL), aplica
 * también un sello de tiempo RFC 3161 (PAdES-T). Si el TSA falla, devuelve
 * el PDF firmado sin sello (PAdES-B) — nunca lanza por error de TSA.
 *
 * @param tsaUrl  URL explícita del servidor TSA. Si se omite, usa process.env.TSA_URL.
 *                Para deshabilitar TSA incluso si TSA_URL está en env, pasar cadena vacía ''.
 */
export async function signPdf(
  pdfBytes: Buffer,
  p12Buffer: Buffer,
  password: string,
  metadata: {
    reason: string
    contactInfo: string
    name: string
    location: string
  },
  tsaUrl?: string,
): Promise<Buffer> {
  // Verificar que el certificado no esté expirado antes de firmar (AM 0009-2017)
  const { expired, notAfter } = checkCertificateExpiry(p12Buffer, password)
  if (expired) {
    throw new Error(
      `El certificado FirmaEC venció el ${notAfter.toLocaleDateString('es-EC')}. ` +
      'Renueve su firma digital en securitydata.net.ec o su proveedor BCE.'
    )
  }

  // PAdES-B: firma básica con P12
  let signedPdf: Buffer
  try {
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: pdfBytes,
      reason: metadata.reason,
      contactInfo: metadata.contactInfo,
      name: metadata.name,
      location: metadata.location,
      signatureLength: SIGNATURE_PLACEHOLDER_BYTES,
    })

    const signer = new P12Signer(p12Buffer, { passphrase: password })
    signedPdf = Buffer.from(await signpdf.sign(pdfWithPlaceholder, signer))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to sign PDF: ${message}`)
  }

  // PAdES-T: sello de tiempo TSA (no bloquea si falla)
  const effectiveTsaUrl = tsaUrl !== undefined ? tsaUrl : (process.env.TSA_URL ?? '')
  if (effectiveTsaUrl) {
    try {
      signedPdf = await applyTsaToPdf(signedPdf, effectiveTsaUrl)
      console.log(`[firma-ec] PAdES-T: sello TSA aplicado desde ${effectiveTsaUrl}`)
    } catch (tsaErr) {
      console.warn('[firma-ec] PAdES-T: sello TSA falló, se devuelve PAdES-B:', tsaErr)
    }
  }

  return signedPdf
}
