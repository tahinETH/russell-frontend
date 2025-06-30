import ChatPageClient from './ChatPageClient';


interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  
  return <ChatPageClient chatId={chatId} />;
} 