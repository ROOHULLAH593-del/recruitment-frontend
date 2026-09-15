import LoginForm from '../components/LoginForm'

// Not linked anywhere on the public site — reachable only by direct
// navigation to /staff. Same backend endpoint and same role-based redirect
// as the candidate-facing /login (via the shared LoginForm); a candidate
// account can use this page too, and an HR/admin account can use /login —
// neither is blocked, this is purely a different front door with different
// copy for whichever audience lands on it.
export default function StaffLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <LoginForm
        title="Staff sign in."
        subtitle="For HR and admin accounts — enter your credentials below."
        submitLabel="Sign in"
        showRegisterLink={false}
        portal="staff"
      />
    </div>
  )
}
