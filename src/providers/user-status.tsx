"use client"

import React, { createContext, useContext, useState } from 'react'

interface UserStatusContextType {
  isOnline: boolean
  setIsOnline: (status: boolean) => void
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined)

export function UserStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)

  const value: UserStatusContextType = {
    isOnline,
    setIsOnline,
  }

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  )
}

export function useUserStatus() {
  const context = useContext(UserStatusContext)
  if (context === undefined) {
    throw new Error('useUserStatus must be used within a UserStatusProvider')
  }
  return context
} 