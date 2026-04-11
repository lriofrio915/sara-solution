import { Resend } from 'resend'

// Lazy init so the constructor doesn't throw during build (missing env var)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'not-configured')
}

export async function sendWelcomeEmail(email: string, name: string) {
  const firstName = name.split(' ')[0]
  await getResend().emails.send({
    from: 'Sara Medical <noreply@consultorio.site>',
    to: email,
    subject: `Tu consultorio digital está listo, ${firstName} 🚀`,
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Sara Medical</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A8A 0%,#0F766E 100%);border-radius:16px 16px 0 0;padding:40px 48px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:900;line-height:48px;">S</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Sara Medical</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.3;">
                Bienvenido/a, ${firstName} 👋
              </h1>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.8);font-size:16px;line-height:1.5;">
                Tu consultorio digital ya está listo para funcionar.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 48px;">

              <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
                Hola <strong>${firstName}</strong>, nos alegra tenerte en Sara Medical. Tu cuenta ha sido creada exitosamente y en minutos podrás tener tu consultorio funcionando al máximo nivel.
              </p>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#f8fafc;border-radius:12px;padding:28px 32px;">
                    <p style="margin:0 0 18px;color:#111827;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                      ¿Qué puedes hacer desde hoy?
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;width:28px;color:#0D9488;font-size:18px;">✦</td>
                        <td style="padding:8px 0;color:#374151;font-size:15px;line-height:1.6;">
                          <strong style="color:#111827;">Agenda inteligente</strong> — Gestiona tus citas con vista diaria, semanal y mensual.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;width:28px;color:#0D9488;font-size:18px;">✦</td>
                        <td style="padding:8px 0;color:#374151;font-size:15px;line-height:1.6;">
                          <strong style="color:#111827;">Fichas médicas y CIE-10</strong> — Historial clínico completo, recetas digitales y clasificación internacional de enfermedades.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;width:28px;color:#0D9488;font-size:18px;">✦</td>
                        <td style="padding:8px 0;color:#374151;font-size:15px;line-height:1.6;">
                          <strong style="color:#111827;">Página médica profesional</strong> — Tu perfil público en <em>consultorio.site/tu-nombre</em> para que los pacientes te encuentren.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;width:28px;color:#2563EB;font-size:18px;">🤖</td>
                        <td style="padding:8px 0;color:#374151;font-size:15px;line-height:1.6;">
                          <strong style="color:#111827;">Agente Sara IA</strong> — Tu asistente con inteligencia artificial que atiende pacientes, responde preguntas y agenda citas las 24 horas.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td align="center">
                    <a href="https://consultorio.site/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#2563EB,#0D9488);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.2px;">
                      Ir a mi Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Next steps -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left:3px solid #2563EB;padding:4px 0 4px 20px;">
                    <p style="margin:0 0 14px;color:#111827;font-size:15px;font-weight:700;">Próximos pasos recomendados:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;color:#6B7280;font-size:14px;line-height:1.6;">
                          <span style="color:#2563EB;font-weight:600;">1.</span> Completa tu perfil médico y sube tu foto profesional.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#6B7280;font-size:14px;line-height:1.6;">
                          <span style="color:#2563EB;font-weight:600;">2.</span> Configura tus horarios de atención y días disponibles.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#6B7280;font-size:14px;line-height:1.6;">
                          <span style="color:#2563EB;font-weight:600;">3.</span> Activa tu página pública y compártela con tus pacientes.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111827;border-radius:0 0 16px 16px;padding:28px 48px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">
                ¿Tienes alguna pregunta? Escríbenos a
                <a href="mailto:soporte@consultorio.site" style="color:#60a5fa;text-decoration:none;"> soporte@consultorio.site</a>
                &nbsp;o por
                <a href="https://wa.me/593996691586" style="color:#60a5fa;text-decoration:none;"> WhatsApp</a>.
              </p>
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;">
                © ${new Date().getFullYear()} Sara Medical · Hecho con ❤️ en Ecuador 🇪🇨
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAppointmentConfirmation(
  email: string,
  patientName: string,
  doctorName: string,
  date: Date,
) {
  await getResend().emails.send({
    from: 'Sara <noreply@consultorio.site>',
    to: email,
    subject: 'Confirmación de cita médica',
    html: `
      <h1>Cita confirmada ✅</h1>
      <p>Hola ${patientName},</p>
      <p>Tu cita con ${doctorName} está confirmada para el
         <strong>${date.toLocaleDateString('es', {
           weekday: 'long',
           year: 'numeric',
           month: 'long',
           day: 'numeric',
         })}</strong>
      </p>
    `,
  })
}

export async function sendTokenExpiryEmail(
  email: string,
  name: string,
  platforms: string[],
  daysLeft: number,
) {
  const firstName = name.split(' ')[0]
  const platformList = platforms.join(' y ')
  const urgency = daysLeft <= 3 ? 'urgente' : 'próxima'

  await getResend().emails.send({
    from: 'Sara Medical <noreply@consultorio.site>',
    to: email,
    subject: `Reconecta ${platformList} para mantener tu marketing activo`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1E3A8A 0%,#0F766E 100%);border-radius:16px 16px 0 0;padding:32px 48px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Acción ${urgency} requerida</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">Tu conexión con ${platformList} expira en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:40px 48px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;">Hola ${firstName},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Tu token de acceso a <strong>${platformList}</strong> expirará en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong>.
              Cuando expire, Sara no podrá publicar contenido en tu nombre y tu marketing automático se pausará.
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Para reconectar tu cuenta, ve a tu perfil y haz clic en "Conectar ${platformList}".
              Solo tarda 30 segundos.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="background:#2563EB;border-radius:12px;padding:0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/profile"
                    style="display:block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                    Reconectar ahora →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">
              Sara Medical · Si no deseas recibir estos avisos, desconecta la red social desde tu perfil.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
