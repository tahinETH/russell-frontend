export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  chatId?: string;
  hasAudio?: boolean;
  imageUrl?: string;
  imagePrompt?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
}

export interface QueryResponse {
  text_response: string;
  audio_base64?: string;
  audio_format?: string;
  context_chunks?: number;
  processing_time?: number;
  chat_id?: string;
  message_id?: string;
  lesson?: string;
}

export interface MessageResponse {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: any;
  created_at: string;
}

export interface ChatWithMessages {
  id: string;
  user_id: string;
  name?: string;
  created_at: string;
  messages: MessageResponse[];
}

export interface GlassChatInterfaceRef {
  submitMessage: (message: string) => void;
}

export interface GlassChatInterfaceProps {
  onNewAiMessage?: (message: string) => void;
}

export interface ImageGenerationState {
  isGenerating: boolean;
  prompt?: string;
  url?: string;
  error?: string;
} 