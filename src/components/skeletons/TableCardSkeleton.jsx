import SkeletonBlock from './SkeletonBlock'

// Loading placeholder for the stacked-card layout tables switch to below the
// md breakpoint (see HrInterviewsPage, HrApplicationsPage, HrJobsPage) —
// mirrors TableRowSkeleton's role for the desktop table.
export default function TableCardSkeleton() {
  return (
    <div className="rounded-lg border border-card-ring bg-card-fill p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SkeletonBlock className="h-4 w-2/5" />
          <SkeletonBlock className="mt-2 h-3 w-1/3" />
        </div>
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-3/4" />
      </div>
    </div>
  )
}
