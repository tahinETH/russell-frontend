"use client"

import { ClerkProvider, useAuth, useUser } from '@clerk/nextjs'
import { createContext, useContext } from 'react'
import axios from 'axios'

type ApiContextType = {
  api: {
    get: <T>(url: string, params?: any) => Promise<T>
    post: <T>(url: string, data?: any) => Promise<T>
    delete: <T>(url: string, params?: any) => Promise<T>
    // Add other methods as needed
  }
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  
  const api = {
    get: async <T,>(url: string, params?: any) => {
      
      const token = await getToken()
      
      
      const response = await axios.get<T>(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
        params,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false
      })
      
      
      
      return response.data
    },
    
    post: async <T,>(url: string, data?: any) => {
      const token = await getToken()
      
      const response = await axios.post<T>(`${process.env.NEXT_PUBLIC_API_URL}${url}`, data, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false
      })
      return response.data
    },
    delete: async <T,>(url: string, params?: any) => {
      const token = await getToken()
      
      const response = await axios.delete<T>(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
        params,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false
      })
      return response.data
    }
  }

  return (
    <ApiContext.Provider value={{ api }}>
      {children}
    </ApiContext.Provider>
  )
}

export const useApi = () => {
  const context = useContext(ApiContext)
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context.api
} 