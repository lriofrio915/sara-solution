'use client'

import { QRCodeSVG } from 'qrcode.react'

/**
 * Sello visual de firma electrónica al estilo FirmaEC: QR + titular + fecha.
 * El QR codifica los datos de verificación (misma convención que las
 * aplicaciones de firma del sistema FirmaEC); la firma criptográfica PAdES
 * se aplica al PDF después del render. Sin `signedAt` (vista previa) se
 * omiten fecha y línea de validación.
 */
export default function FirmaStamp({ signedBy, signedAt }: { signedBy: string; signedAt: string | null }) {
  const fecha = signedAt
    ? new Date(signedAt).toLocaleString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'America/Guayaquil',
      })
    : null
  const qrData =
    `FIRMADO POR: ${signedBy.toUpperCase()}\n` +
    `RAZON: Documento médico firmado electrónicamente\n` +
    (fecha ? `FECHA: ${fecha}\n` : '') +
    `VALIDAR CON: www.firmadigital.gob.ec\n` +
    `FIRMA DIGITAL - FirmaEC`
  return (
    <div className="inline-flex items-center gap-2.5 text-left mb-1">
      <QRCodeSVG value={qrData} size={54} level="M" className="flex-shrink-0" />
      <div>
        <p style={{ fontSize: '7px', color: '#4a5568' }}>Firmado electrónicamente por:</p>
        <p className="font-bold" style={{ fontSize: '11px', color: '#111827', lineHeight: 1.25, maxWidth: '130px' }}>
          {signedBy.toUpperCase()}
        </p>
        {fecha && (
          <p style={{ fontSize: '6.5px', color: '#6b7280', marginTop: '2px' }}>
            {fecha}<br />Validar en www.firmadigital.gob.ec
          </p>
        )}
      </div>
    </div>
  )
}
