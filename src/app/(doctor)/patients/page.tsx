import { requireDoctorLayout } from '@/lib/doctor-auth'
import { listPatients, PATIENTS_PAGE_SIZE } from '@/lib/patients-query'
import PatientsListClient from './PatientsListClient'

export const dynamic = 'force-dynamic'

// Server component: la primera tanda de pacientes viaja ya renderizada en el HTML.
// Antes esta página era cliente y pedía los datos en un useEffect, lo que obligaba a
// esperar el render del servidor, la hidratación y encima una llamada al API que repetía
// la autenticación. El loading.tsx de esta carpeta cubre este tramo.
export default async function PatientsPage() {
  const doctor = await requireDoctorLayout()

  let initialPatients: Awaited<ReturnType<typeof listPatients>>['patients'] = []
  let initialTotal = 0
  try {
    const result = await listPatients({ doctorId: doctor.id, limit: PATIENTS_PAGE_SIZE })
    initialPatients = result.patients
    initialTotal = result.total
  } catch (err) {
    // Un fallo de base de datos no debe dejar la sección inaccesible: se entrega la
    // pantalla vacía y el cliente puede reintentar buscando.
    console.error('PatientsPage: error cargando pacientes', err)
  }

  return (
    <PatientsListClient
      initialPatients={initialPatients.map(p => ({
        ...p,
        // El componente cliente recibe fechas serializadas, como cuando venían del API.
        birthDate: p.birthDate ? p.birthDate.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      }))}
      initialTotal={initialTotal}
    />
  )
}
