import SkeletonBlock from './SkeletonBlock'

export default function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-card-ring bg-card-fill p-6">
      <SkeletonBlock className="h-5 w-3/5" />
      <SkeletonBlock className="mt-2 h-4 w-2/5" />
      <div className="mt-5 flex flex-wrap gap-5">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
    </div>
  )
}
