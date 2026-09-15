import SkeletonBlock from './SkeletonBlock'

export default function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <SkeletonBlock className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  )
}
