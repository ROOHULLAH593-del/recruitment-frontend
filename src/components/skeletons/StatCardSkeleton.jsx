import SkeletonBlock from './SkeletonBlock'

export default function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-card-ring bg-card-fill p-6">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="mt-3 h-9 w-16" />
    </div>
  )
}
