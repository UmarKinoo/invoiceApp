import type { Payload } from 'payload'

export type ActivityType =
  | 'note'
  | 'invoice_created'
  | 'quote_created'
  | 'quote_sent'
  | 'task_assigned'
  | 'task_completed'
  | 'email_sent'
  | 'status_change'
  | 'payment_received'

export type RelatedCollection = 'invoices' | 'quotes' | 'tasks' | 'transactions'

export interface CreateActivityLogParams {
  payload: Payload
  userId: number | undefined
  clientId: number
  type: ActivityType
  body?: string | null
  relatedCollection?: RelatedCollection | null
  relatedId?: number | null
  meta?: Record<string, unknown> | null
}

/**
 * Creates an activity log entry for a contact. Fire-and-forget: errors are
 * caught so the main operation (e.g. creating an invoice) is not blocked.
 */
export async function createActivityLog({
  payload,
  userId,
  clientId,
  type,
  body,
  relatedCollection,
  relatedId,
  meta,
}: CreateActivityLogParams): Promise<void> {
  try {
    await payload.create({
      collection: 'activity',
      data: {
        client: clientId,
        type,
        body: body ?? undefined,
        relatedCollection: relatedCollection ?? undefined,
        relatedId: relatedId ?? undefined,
        meta: meta ?? undefined,
        createdBy: userId ?? undefined,
      },
    })
  } catch (err) {
    console.error('[createActivityLog] Failed to create activity:', err)
  }
}
