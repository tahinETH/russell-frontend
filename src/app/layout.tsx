import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Raleway } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { ApiProvider } from "@/providers/backend"
import { UserStatusProvider } from "@/providers/user-status"
import { Toaster } from "@/components/ui/sonner"
import { shadesOfPurple } from "@clerk/themes"
import ClientWrapper from "@/components/ClientWrapper"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const raleway = Raleway({
  variable: "--font-raleway",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable}`} suppressHydrationWarning>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#121B95",
              colorBackground: "#ffffff",
              colorText: "#000000",
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-in"
        >
          <ApiProvider>
            <UserStatusProvider>
              <Toaster />
              <ClientWrapper>
                {children}
              </ClientWrapper>
            </UserStatusProvider>
          </ApiProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
