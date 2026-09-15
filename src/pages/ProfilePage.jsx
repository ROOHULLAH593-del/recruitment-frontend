import ProfileForm from '../components/ProfileForm'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">
          My profile. <span className="text-ink/50">Keep it current to improve your match score.</span>
        </h1>

        <div className="mt-8 rounded-lg border border-ink/10 bg-card-fill p-8">
          <ProfileForm />
        </div>
      </main>
    </div>
  )
}
