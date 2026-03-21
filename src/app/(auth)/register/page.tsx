import RegisterForm from './RegisterForm'

interface Props {
  searchParams: { ref?: string }
}

export default function RegisterPage({ searchParams }: Props) {
  return <RegisterForm referralCode={searchParams.ref} />
}
