"use client"
import LoomLockChat from '@/components/chat/LoomLockChat';

interface ChatPageClientProps {
  chatId: string;
}

export default function ChatPageClient({ chatId }: ChatPageClientProps) {
  return <LoomLockChat initialChatId={chatId} />;
} 