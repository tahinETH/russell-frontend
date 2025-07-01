"use client"

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileRestriction from './MobileRestriction';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  const isMobile = useIsMobile();

  // Show loading state while determining if mobile
  if (isMobile === undefined) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show mobile restriction screen on mobile devices
  if (isMobile) {
    return <MobileRestriction />;
  }

  // Show the actual app content on desktop
  return <>{children}</>;
} 