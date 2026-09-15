import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <LoginForm title="Log in." subtitle="Welcome back — enter your details below." portal="candidate" />
    </div>
  )
}
