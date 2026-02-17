import { withPayload } from '@payloadcms/next/withPayload'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  output: 'standalone', // Required for Docker deployment
  serverExternalPackages: ['@react-pdf/renderer'],

  webpack: (config) => {
    const projectRoot = path.resolve(__dirname)
    // Resolve strnum to absolute path so fast-xml-parser (inside .pnpm) can find it
    const strnumPath = path.resolve(projectRoot, 'node_modules/strnum')
    config.resolve.alias = {
      ...config.resolve.alias,
      strnum: strnumPath,
    }
    return config
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
