import { cn } from '@/lib/utils'

type PageHeaderProps = React.ComponentProps<'header'> & {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn('relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between', className)}
      {...props}
    >
      <div className="min-w-0 pr-12 sm:pr-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="absolute right-0 top-0 flex shrink-0 items-center gap-2 sm:relative sm:mt-0">
          {actions}
        </div>
      )}
    </header>
  )
}
