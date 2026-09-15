export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) {
    return null
  }

  return (
    <div className="mt-6 flex items-center justify-between text-sm text-ink/55">
      <p>
        Showing {meta.from}–{meta.to} of {meta.total}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page <= 1}
          className="rounded-md border border-ink/15 px-3 py-1.5 font-medium text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {meta.current_page} of {meta.last_page}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page >= meta.last_page}
          className="rounded-md border border-ink/15 px-3 py-1.5 font-medium text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
