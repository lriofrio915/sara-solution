import RegisterForm from './RegisterForm'

interface Props {
  searchParams: Promise<{ ref?: string }>
}

export default async function RegisterPage(props: Props) {
  const searchParams = await props.searchParams;
  return <RegisterForm referralCode={searchParams.ref} />
}
