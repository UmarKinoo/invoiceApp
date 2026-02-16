import { cn } from '@/lib/utils'

type PageContainerProps = React.ComponentProps<'div'>

export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10', className)}
      {...props}
    />
  )
}
