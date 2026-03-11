import type { CollectionConfig } from 'payload'

/**
 * Minimal collection so the health_check table is part of the app schema.
 * Used for external DB health checks (e.g. added via SQL). Kept in schema so
 * payload migrate/push does not try to drop the table.
 *
 * If you get "must be owner of table health_check", run in DB as superuser:
 *   ALTER TABLE health_check OWNER TO your_payload_db_user;
 * See docs/HEALTH_CHECK_TABLE.md.
 */
export const HealthCheck: CollectionConfig = {
  slug: 'health_check',
  admin: {
    description: 'Table for DB health checks (e.g. external monitoring).',
    hidden: true,
  },
  access: {
    read: () => true,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'status',
      type: 'text',
      admin: { description: 'Optional status (e.g. ok)' },
    },
  ],
}
