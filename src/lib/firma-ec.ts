import forge from 'node-forge'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'
import signpdf from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import crypto from 'crypto'

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
): { valid: boolean; subject: string; notAfter: Date; error?: string } {
  try {
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'))
    const p12Asn1 = forge.asn1.fromDer(p12Der)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

    // Find the first certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const bags = certBags[forge.pki.oids.certBag]

    if (!bags || bags.length === 0) {
      return {
        valid: false,
        subject: '',
        notAfter: new Date(),
        error: 'No certificates found in .p12 file',
      }
    }

    const cert = bags[0]?.cert
    if (!cert) {
      return {
        valid: false,
        subject: '',
        notAfter: new Date(),
        error: 'Could not extract certificate from .p12 file',
      }
    }

    // Extract CN from subject
    const cnAttr = cert.subject.getField('CN')
    const subject = cnAttr ? (cnAttr.value as string) : cert.subject.attributes
      .map((a: { shortName?: string; value?: unknown }) => `${a.shortName}=${a.value}`)
      .join(', ')

    const notAfter = cert.validity.notAfter

    return { valid: true, subject, notAfter }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      subject: '',
      notAfter: new Date(),
      error: `Failed to parse .p12: ${message}`,
    }
  }
}

// ─── signPdf ──────────────────────────────────────────────────────────────────

export async function signPdf(
  pdfBytes: Buffer,
  p12Buffer: Buffer,
  password: string,
  metadata: {
    reason: string
    contactInfo: string
    name: string
    location: string
  }
): Promise<Buffer> {
  try {
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: pdfBytes,
      reason: metadata.reason,
      contactInfo: metadata.contactInfo,
      name: metadata.name,
      location: metadata.location,
    })

    const signer = new P12Signer(p12Buffer, { passphrase: password })

    const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer)

    return Buffer.from(signedPdf)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to sign PDF: ${message}`)
  }
}
