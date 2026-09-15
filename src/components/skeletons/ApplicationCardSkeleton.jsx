import SkeletonBlock from './SkeletonBlock'

export default function ApplicationCardSkeleton() {
  return (
    <div className="rounded-lg border border-card-ring bg-card-fill p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <SkeletonBlock className="h-5 w-2/5" />
          <SkeletonBlock className="mt-2 h-4 w-1/3" />
        </div>
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-6 w-32 rounded-full" />
    </div>
  )
}
