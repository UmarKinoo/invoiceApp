import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { fileURLToPath } from 'url'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import sharp from 'sharp'
import path from 'node:path'

import { Users } from '@/collections/Users'
import { Media } from '@/collections/Media'
import { Clients } from '@/collections/Clients'
import { Invoices } from '@/collections/Invoices'
import { Quotes } from '@/collections/Quotes'
import { Tasks } from '@/collections/Tasks'
import { Transactions } from '@/collections/Transactions'
import { Activity } from '@/collections/Activity'
import { Settings } from '@/collections/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Clients, Invoices, Quotes, Tasks, Transactions, Activity],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
})
