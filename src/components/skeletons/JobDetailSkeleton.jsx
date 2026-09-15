import SkeletonBlock from './SkeletonBlock'

export default function JobDetailSkeleton() {
  return (
    <div className="rounded-lg border border-card-ring bg-card-fill p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <SkeletonBlock className="h-6 w-2/5" />
          <SkeletonBlock className="mt-2 h-4 w-1/4" />
        </div>
        <SkeletonBlock className="h-6 w-16 rounded-full" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6" />
        <SkeletonBlock className="mt-2 h-4 w-2/3" />
      </div>
    </div>
  )
}
