import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-dark text-text-primary">
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}