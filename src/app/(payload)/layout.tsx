/* THIS FILE WAS GENERATED FOR PAYLOAD — keep in sync with @payloadcms/next layouts API */
import type { ServerFunctionClient } from 'payload'
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google'
import '@payloadcms/next/css'
import '../../admin/admin.css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import config from '@payload-config'
import { importMap } from './admin/importMap.js'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
    htmlProps={{
      className: `${spaceGrotesk.variable} ${ibmPlexMono.variable}`,
    }}
  >
    {children}
  </RootLayout>
)

export default Layout
