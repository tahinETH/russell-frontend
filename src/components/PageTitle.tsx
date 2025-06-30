"use client"

import React from 'react'
import { usePathname } from 'next/navigation'

export default function PageTitle() {
  const pathname = usePathname()
  
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Russell'
      case '/sign-in':
        return 'Sign In'
      default:
        return 'Russell'
    }
  }

  return (
    <div className="font-semibold mx-auto justify-center text-lg text-blue-700">
      {getPageTitle(pathname)}
    </div>
  )
} 