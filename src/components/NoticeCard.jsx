import { Link } from 'react-router-dom'
import Button from './Button'

// A centered "there's nothing to show here" card — a 404/403 message with a
// title, an explanation, and a clear way back. Used wherever a page can't
// show its normal content but still needs to look like a deliberate part of
// the app, not a raw crash or a generic browser error (e.g. a stale or
// forwarded email link to a since-deleted or someone-else's record).
export default function NoticeCard({ title, message, linkTo, linkLabel }) {
  return (
    <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8 text-center">
      <h1 className="font-display text-xl text-ink">{title}</h1>
      {message && <p className="mt-2 text-ink/55">{message}</p>}
      {linkTo && (
        <Link to={linkTo} className="mt-6 inline-block">
          <Button variant="primary">{linkLabel}</Button>
        </Link>
      )}
    </div>
  )
}
