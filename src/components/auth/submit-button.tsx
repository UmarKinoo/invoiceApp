import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const SubmitButton = ({
  loading,
  text,
  className,
}: {
  loading: boolean
  text: string
  className?: string
}) => {
  return (
    <Button type="submit" disabled={loading} className={cn('min-h-[44px] w-full sm:w-auto sm:min-w-[120px]', className)}>
      {loading ? <Loader2 className="animate-spin size-5" /> : text}
    </Button>
  )
}
