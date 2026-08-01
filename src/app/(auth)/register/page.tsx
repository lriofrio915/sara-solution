import RegisterForm from './RegisterForm'

interface Props {
  searchParams: Promise<{
    ref?: string
    // Prefill del funnel de onboarding por WhatsApp (/api/onboarding/whatsapp)
    firstName?: string
    lastName?: string
    specialty?: string
    email?: string
    whatsapp?: string
  }>
}

export default async function RegisterPage(props: Props) {
  const searchParams = await props.searchParams;
  return (
    <RegisterForm
      referralCode={searchParams.ref}
      prefill={{
        firstName: searchParams.firstName,
        lastName: searchParams.lastName,
        specialty: searchParams.specialty,
        email: searchParams.email,
        whatsapp: searchParams.whatsapp,
      }}
    />
  )
}
