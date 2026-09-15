import SkeletonBlock from './SkeletonBlock'

export default function FormSkeleton({ fields = 4 }) {
  return (
    <div className="space-y-5 rounded-lg border border-ink/10 bg-card-fill p-8">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-2 h-10 w-full" />
        </div>
      ))}
      <SkeletonBlock className="h-10 w-32" />
    </div>
  )
}
