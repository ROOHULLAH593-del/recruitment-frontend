import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8 text-center">
          <h1 className="font-display text-xl text-ink">
            Page not found. <span className="text-ink/50">It may have been removed or moved.</span>
          </h1>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="primary">Back to home</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
