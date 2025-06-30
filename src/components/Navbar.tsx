"use client"

import React from 'react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function Navbar() {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="font-bold text-lg">LoomLock AI</div>
      <div className="flex gap-4 items-center">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </div>
  )
} 