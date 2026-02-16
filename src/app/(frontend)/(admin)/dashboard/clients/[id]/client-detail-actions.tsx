'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ClientDetailActions({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/dashboard/clients')
      router.refresh()
    } catch {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Link
        href={`/dashboard/clients/${clientId}/edit`}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setShowDelete(true)}
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
      >
        Delete
      </button>
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Invoices or quotes linked to this contact may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
