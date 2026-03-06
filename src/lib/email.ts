import { Resend } from 'resend'

// Lazy init so the constructor doesn't throw during build (missing env var)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'not-configured')
}

export async function sendWelcomeEmail(email: string, name: string) {
  await getResend().emails.send({
    from: 'Sara <noreply@consultorio.site>',
    to: email,
    subject: 'Bienvenido/a a Sara - Tu asistente médica IA',
    html: `
      <h1>Hola ${name} 👋</h1>
      <p>Tu cuenta en Sara ha sido creada exitosamente.</p>
      <p>Ya puedes iniciar sesión en
         <a href="https://consultorio.site/login">consultorio.site</a>
      </p>
    `,
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
