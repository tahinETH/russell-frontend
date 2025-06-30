import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { ApiProvider } from "@/providers/backend"
import { UserStatusProvider } from "@/providers/user-status"
import { Toaster } from "@/components/ui/sonner"
import { shadesOfPurple } from "@clerk/themes"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Russell",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="">
      <head></head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#570987",
              colorBackground: "#000000",
              colorText: "#ffffff",
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-in"
        >
          <ApiProvider>
            <UserStatusProvider>
              <Toaster />
              {children}
            </UserStatusProvider>
          </ApiProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
