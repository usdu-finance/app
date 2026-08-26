import React from 'react'
import { useRouter } from 'next/router'
import HomeLayout from './HomeLayout'
import DashboardLayout from './DashboardLayout'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  // asPath (not pathname) so a mistyped /dashboard/* URL still gets the
  // dashboard chrome when Next.js falls back to pages/404.tsx
  const isDashboard = router.asPath.startsWith('/dashboard')

  if (isDashboard) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  return <HomeLayout>{children}</HomeLayout>
}