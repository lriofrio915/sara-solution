import MedicalLoadingScreen from '@/components/MedicalLoadingScreen'

// Fallback de navegación. A diferencia de usar MedicalLoadingScreen dentro del componente
// cliente, este se pinta en cuanto se hace clic en el enlace, así que cubre el tramo en
// blanco real: el render del servidor. Además, tener loading.tsx hace que el prefetch de
// <Link> sirva de algo en rutas dinámicas.
export default function Loading() {
  return <MedicalLoadingScreen label="Cargando certificados…" />
}
