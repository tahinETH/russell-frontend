"use client"

import * as React from "react"
import {useEffect} from "react"
import Link from "next/link"
import { Home, LineChart, Sparkles, LogOut, User, SquarePen, Search, Plus, MessageSquare, Inbox } from "lucide-react"
import { SignedIn, UserButton, useClerk, useUser } from '@clerk/nextjs'
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { useApi } from "@/providers/backend"
import SystemPromptCard from "./system-prompt-card"


// Type for chat response from backend
interface ChatResponse {
  id: string
  user_id: string
  created_at: string
  name: string
}

export default function AppSidebar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const [isMounted, setIsMounted] = React.useState(false)
  const [chats, setChats] = React.useState<ChatResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { state } = useSidebar()
  const pathname = usePathname()
  const api = useApi()
  const chatsLoadedRef = React.useRef(false)
  
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  
  useEffect(() => {
    const fetchChats = async () => {
      // Skip if chats already loaded
      if (chatsLoadedRef.current) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const chatData = await api.get<ChatResponse[]>('/chats')
        
        
        setChats(chatData)
        // Mark chats as loaded
        chatsLoadedRef.current = true
      } catch (err) {
        console.error('Error fetching chats:', err)
        setError('Failed to load chats')
      } finally {
        setIsLoading(false)
      }
    }

    if (isMounted) {
      fetchChats()
    }
  }, [isMounted, api])

  // Function to manually refresh chats (can be called when new chat is created)
  const refreshChats = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const chatData = await api.get<ChatResponse[]>('/chats')
      setChats(chatData)
      chatsLoadedRef.current = true
    } catch (err) {
      console.error('Error fetching chats:', err)
      setError('Failed to load chats')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Within the last week
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    }
    
    // Older than a week
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Helper function to get display name
  const getDisplayName = () => {
    if (!user) return 'Your Account'
    
    if (user.username) return user.username
    
    // Try full name first
    if (user.fullName) return user.fullName
    
    // Try first name + last name
    if (user.firstName) {
      return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName
    }
    
    // Try username
  
    // Fall back to email
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress
    }
    
    return 'Your Account'
  }

  // Add this handler function
  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault()
      window.location.reload()
    }
  }

  // Return null or a loading state until client-side hydration is complete
  if (!isMounted) {
    return null // or return a loading skeleton
  }
  
  const isCollapsed = state === "collapsed"
  
  
  return (
    <Sidebar className="border-r-0  z-50 border-blue-50">
      <SidebarContent className="bg-blue-50 z-50 ">
        <SidebarGroup>
          <Link href="/" onClick={handleLogoClick}>
            <div className="p-4 flex items-center">
              <motion.div 
                className=""
              >
              <Image
                    src="/img/locky2.png"
                    alt="Locky"
                    width={60}
                    height={60}
                    >
                  </Image>
              </motion.div>
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                
                  <div className="text-xl font-bold tracking-tight text-blue-800">locky ai</div>
                  <SquarePen strokeWidth={2.5} className="h-4 w-4 text-blue-800 hover:text-blue-700 transition-colors" />
                </div>
              )}
              {isCollapsed && (
                <SquarePen className="h-5 w-5 text-slate-600 hover:text-slate-800 transition-colors" />
              )}
            </div>
          </Link>
          
          {/* Previous Chats Section */}
          <SidebarGroupLabel className="px-4 text-slate-700 text-xs uppercase tracking-wide font-bold">
            {!isCollapsed && "Previous Chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading && !isCollapsed && (
                <div className="px-4 py-6 flex flex-col items-center justify-center text-slate-700">
                  <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-sm font-medium">Loading your chats...</span>
                </div>
              )}
              
              {error && !isCollapsed && (
                <div className="px-4 py-6 flex flex-col items-center justify-center text-slate-700">
                  <div className="bg-slate-200 rounded-full p-3 mb-3 border border-slate-300">
                    <MessageSquare className="h-6 w-6 text-slate-700" />
                  </div>
                  <p className="text-sm text-center font-medium">Unable to load your chats</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Please try again later</p>
                </div>
              )}
              
              {!isLoading && !error && chats.length === 0 && !isCollapsed && (
                <div className="px-4 py-6 flex flex-col items-center justify-center text-slate-700">
                  <div className="bg-slate-200 rounded-full p-3 mb-3 border border-slate-300">
                    <Inbox className="h-6 w-6 text-slate-700" />
                  </div>
                  <p className="text-sm text-center font-medium">Your conversations will appear here</p>
                  <p className="text-xs text-slate-600 text-center mt-1">Start a new chat to begin</p>
                </div>
              )}
              
              {chats && chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton asChild>
                    <Link 
                      href={`/c/${chat.id}`} 
                      className={`flex items-center gap-2 px-4 py-3 text-sm rounded-md transition-colors group 
                        ${pathname === `/c/${chat.id}` 
                          ? 'bg-blue-100 text-slate-900 border border-blue-200' 
                          : 'hover:bg-blue-50 hover:text-blue-800'}`}
                      title={isCollapsed ? chat.name : undefined}
                    >
                      
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0 flex justify-between items-center">
                          <div className="truncate">
                            <div className="text-xs font-medium truncate">{chat.name}</div>
                          </div>
                        
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* System Prompt Card */}
       
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mt-auto mb-4">
            <SystemPromptCard />
          </div>
          <SignedIn>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-4'} py-3 rounded-md`}>
              <UserButton afterSignOutUrl="/" />
              {!isCollapsed && <span className="text-sm font-medium text-slate-700">{getDisplayName()}</span>}
            </div>
          </SignedIn>
        </div>
      </SidebarContent>
    </Sidebar>
  )
} 