/**
 * The WebSocket protocol for Chat between FE and BE is as follows:
 *
 * 1. FE opens a WebSocket connection to the BE.
 * 2. FE authenticates with JWT token by sending {"type": "auth", "token": "jwt_token"}.
 * 3. BE responds with {"type": "auth_success", "user_id": "user_id"}.
 * 4. FE sends a question to the BE as JSON: {"type": "chat", "message": "question", "chat_id": "optional", "enable_voice": true}.
 * 5. BE sends {"type": "chat_start", "chat_id": "id", "message_id": "id", "voice_enabled": true}.
 * 6. BE sends {"type": "text_complete", "full_response": "complete_text", "chat_id": "id"}.
 * 7. BE sends {"type": "voice_start", "chat_id": "id"} (if voice enabled).
 * 8. BE streams voice as {"type": "voice_chunk", "audio": "base64", "format": "mp3", "chat_id": "id"}.
 * 9. BE sends {"type": "voice_complete", "chat_id": "id"}.
 * 10. BE sends {"type": "chat_complete", "chat_id": "id", "voice_enabled": true}.
 * 11. BE can send errors as {"type": "error", "error": "message"} and then close the connection.
 */

interface ApiInfo {
  ssl: boolean;
  apiHost: string;
}

interface Callbacks {
  setSources: (sources: Array<any>) => void;
  setAnswer: (answer: string) => void;
  onError?: (reason: string) => void;
  onConnect?: () => void;
  onAuthenticated?: () => void;
  onChatStart?: (chatId: string, messageId: string, voiceEnabled: boolean, imageEnabled?: boolean) => void;
  onTextComplete?: (chatId: string, fullResponse: string) => void;
  onVoiceStart?: (chatId: string) => void;
  onVoiceChunk?: (chatId: string, audioData: string, format: string) => void;
  onVoiceComplete?: (chatId: string) => void;
  onChatComplete?: (chatId: string, messageId: string, fullResponse: string, voiceEnabled: boolean, imageEnabled?: boolean) => void;
  // Image-related callbacks
  onImageStart?: (chatId: string, prompt: string) => void;
  onImageProgress?: (chatId: string, message: string) => void;
  onImageComplete?: (chatId: string, imageUrl: string) => void;
  onImageError?: (chatId: string, error: string) => void;
}

interface ChatWsManagerOptions {
  apiInfo: ApiInfo;
  callbacks: Callbacks;
  question: string;
  chatId?: string;
  authToken: string;
  timeout?: number;
  enableVoice?: boolean;
  enableImage?: boolean;
}

/**
 * Encapsulates a WebSocket connection for Chat with LoomLock AI.
 *
 * The callbacks are overwriting setters, do not bother with accumulation yourself.
 */
export class ChatWsManager {
  /**
   * @property {string} answer - The answer accumulator.
   * @public
   */
  answer = '';

  /**
   * @property {boolean} isAuthenticated - Whether the WebSocket is authenticated.
   * @public
   */
  isAuthenticated = false;

  /**
   * @property {string} currentChatId - The current chat ID.
   * @public
   */
  currentChatId: string | null = null;

  /**
   * @property {boolean} voiceEnabled - Whether voice is enabled for current chat.
   * @public
   */
  voiceEnabled = false;

  private _options: ChatWsManagerOptions;
  private _ws: WebSocket;
  private _timeoutId: NodeJS.Timeout | null = null;

  /**
   * Initializes a new instance of the ChatWsManager class.
   * @param options - The ChatWsManager options.
   */
  constructor(options: ChatWsManagerOptions) {
    this._options = {
      timeout: 30000, // 30 seconds default
      enableVoice: false,
      enableImage: false,
      ...options
    };

    this._ws = new WebSocket(this.wsUrl);

    this._bindEvents();
    this._startTimeout();
  }

  /**
   * Gets the WebSocket URL.
   * @returns The WebSocket URL.
   */
  get wsUrl(): string {
    const protocol = this._options.apiInfo.ssl ? 'wss' : 'ws';
    
    return `${protocol}://${this._options.apiInfo.apiHost}/ws/chat`;
  }

  /**
   * Calls the onError callback if it exists.
   * @param reason - The error reason
   * @private
   */
  private _handleError(reason: string): void {
    console.error(`ChatWsManager error: ${JSON.stringify(reason)}`);
    if (this._options.callbacks.onError) {
      this._options.callbacks.onError(reason);
    }
    this._clearTimeout();
  }

  /**
   * Starts the timeout timer.
   * @private
   */
  private _startTimeout(): void {
    this._timeoutId = setTimeout(() => {
      console.log('ChatWsManager: Closing connection due to timeout');
      this.close();
    }, this._options.timeout);
  }

  /**
   * Clears the timeout timer.
   * @private
   */
  private _clearTimeout(): void {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /**
   * Resets the timeout timer to keep connection alive during active communication.
   * @private
   */
  private _resetTimeout(): void {
    this._clearTimeout();
    this._startTimeout();
  }

  /**
   * Sends authentication message.
   * @private
   */
  private _sendAuthMessage(): void {
    const authPayload = {
      type: 'auth',
      token: this._options.authToken
    };
    this._ws.send(JSON.stringify(authPayload));
  }

  /**
   * Sends the question message.
   * @private
   */
  private _sendQuestionMessage(): void {
    // Send as JSON with type "chat" as expected by the backend
    const chatPayload = {
      type: 'chat',
      message: this._options.question,
      enable_voice: this._options.enableVoice || false,
      enable_image: this._options.enableImage || false,
      ...(this._options.chatId && { chat_id: this._options.chatId })
    };
    this._ws.send(JSON.stringify(chatPayload));
  }

  /**
   * Binds the WebSocket events to the provided callbacks.
   * @private
   */
  private _bindEvents(): void {
    this._ws.onopen = () => {
      console.log('ChatWsManager: WebSocket connected');
      if (this._options.callbacks.onConnect) {
        this._options.callbacks.onConnect();
      }
      this._sendAuthMessage();
    };

    this._ws.onmessage = (event) => {
      let message;
      
      try {
        message = JSON.parse(event.data);
        
      } catch (e) {
        // If it's not JSON, treat as plaintext (shouldn't happen with current protocol)
        const err = `Invalid JSON received from WebSocket: ${e} for message: ${event.data}`;
        this._handleError(err);
        return;
      }
      this._handleMessage(message);
    };

    this._ws.onclose = (event) => {
      console.log('ChatWsManager: WebSocket closed', event.code, event.reason);
      this._clearTimeout();
    };

    this._ws.onerror = () => {
      console.error('ChatWsManager: WebSocket error');
      this._handleError('WebSocket connection error');
    };
  }

  /**
   * Handles a message received from the WebSocket.
   * @param message - The parsed JSON message received from the WebSocket.
   * @private
   */
  private _handleMessage(message: any): void {
    // Reset timeout on any message to keep connection alive during streaming
    this._resetTimeout();
    
    // 🎵 DEBUG: Log all messages to understand what's being sent
    console.log('🎵 📨 WebSocket received message:', {
      type: message.type,
      chatId: message.chat_id,
      hasAudio: !!message.audio,
      audioLength: message.audio?.length,
      keys: Object.keys(message)
    });

    // Handle authentication success
    if (message.type === 'auth_success') {
      this.isAuthenticated = true;
      if (this._options.callbacks.onAuthenticated) {
        this._options.callbacks.onAuthenticated();
      }
      // Send the question after authentication
      this._sendQuestionMessage();
      return;
    }

    // Handle chat start (new voice-first format)
    if (message.type === 'chat_start') {
      this.currentChatId = message.chat_id;
      this.voiceEnabled = message.voice_enabled || false;
      // Reset answer accumulator for new chat
      this.answer = '';
      if (this._options.callbacks.onChatStart) {
        this._options.callbacks.onChatStart(message.chat_id, message.message_id, this.voiceEnabled, message.image_enabled || false);
      }
      return;
    }

    // Handle text complete (new voice-first format)
    if (message.type === 'text_complete') {
      this.answer = message.full_response;
      this._options.callbacks.setAnswer(this.answer);
      
      if (this._options.callbacks.onTextComplete) {
        this._options.callbacks.onTextComplete(message.chat_id, message.full_response);
      }
      return;
    }

    // Handle voice start (new voice-first format)
    if (message.type === 'voice_start') {
      if (this._options.callbacks.onVoiceStart) {
        this._options.callbacks.onVoiceStart(message.chat_id);
      }
      return;
    }

    // Handle voice chunk (new voice-first format)
    if (message.type === 'voice_chunk') {
      console.log('🎵 📨 WebSocket received voice_chunk:', {
        chatId: message.chat_id,
        audioLength: message.audio?.length,
        format: message.format,
        hasAudio: !!message.audio
      });
      
      if (this._options.callbacks.onVoiceChunk) {
        this._options.callbacks.onVoiceChunk(
          message.chat_id, 
          message.audio, 
          message.format || 'mp3'
        );
      }
      return;
    }

    // Handle voice complete (new voice-first format)
    if (message.type === 'voice_complete') {
      console.log('🎵 📨 WebSocket received voice_complete:', {
        chatId: message.chat_id,
        audioLength: message.audio?.length,
        format: message.format,
        hasAudio: !!message.audio,
        messageKeys: Object.keys(message)
      });
      
      // Check if complete audio is in voice_complete event
      if (message.audio && message.audio.length > 0 && this._options.callbacks.onVoiceChunk) {
        console.log('🎵 📨 Found complete audio in voice_complete, forwarding to onVoiceChunk');
        this._options.callbacks.onVoiceChunk(
          message.chat_id, 
          message.audio, 
          message.format || 'mp3'
        );
      }
      
      if (this._options.callbacks.onVoiceComplete) {
        this._options.callbacks.onVoiceComplete(message.chat_id);
      }
      return;
    }

    // Handle chat complete (new voice-first format)
    if (message.type === 'chat_complete') {
      // Clear timeout since chat is complete
      this._clearTimeout();
      
      if (this._options.callbacks.onChatComplete) {
        this._options.callbacks.onChatComplete(
          message.chat_id, 
          message.message_id || `msg-${Date.now()}`,
          this.answer,
          message.voice_enabled || false,
          message.image_enabled || false
        );
      }
      
      // Optionally close the connection after completion
      setTimeout(() => this.close(), 1000);
      return;
    }

    // Handle image start
    if (message.type === 'image_start') {
      if (this._options.callbacks.onImageStart) {
        this._options.callbacks.onImageStart(message.chat_id, message.prompt || '');
      }
      return;
    }

    // Handle image progress
    if (message.type === 'image_progress') {
      if (this._options.callbacks.onImageProgress) {
        this._options.callbacks.onImageProgress(message.chat_id, message.message || 'Generating image...');
      }
      return;
    }

    // Handle image complete
    if (message.type === 'image_complete') {
      if (this._options.callbacks.onImageComplete) {
        this._options.callbacks.onImageComplete(message.chat_id, message.image_url);
      }
      return;
    }

    // Handle image error
    if (message.type === 'image_error') {
      if (this._options.callbacks.onImageError) {
        this._options.callbacks.onImageError(message.chat_id, message.error || 'Failed to generate image');
      }
      return;
    }

    // Handle legacy format: stream_start
    if (message.type === 'stream_start') {
      // Extract chat_id if present in the message
      const chatId = message.chat_id || this.currentChatId || 'unknown';
      this.currentChatId = chatId;
      
      if (this._options.callbacks.onChatStart) {
        // Use query from stream_start or generate a message ID
        const messageId = message.message_id || `msg-${Date.now()}`;
        this._options.callbacks.onChatStart(chatId, messageId, false, false);
      }
      return;
    }

    // Handle legacy format: chunk (streaming response)
    if (message.type === 'chunk') {
      const answerPiece = message.content;
      this.answer = this.answer + answerPiece;
      
      this._options.callbacks.setAnswer(this.answer);
      return;
    }

    // Handle legacy format: complete
    if (message.type === 'complete') {
      // Clear timeout since chat is complete
      this._clearTimeout();
      
      if (message.full_response) {
        this.answer = message.full_response;
        console.log("complete",this.answer)
        this._options.callbacks.setAnswer(this.answer);
      }
      
      if (this._options.callbacks.onChatComplete) {
        const chatId = message.chat_id || this.currentChatId || 'unknown';
        const messageId = message.message_id || `msg-${Date.now()}`;
        this._options.callbacks.onChatComplete(
          chatId, 
          messageId, 
          message.full_response,
          false,
          false
        );
      }
      
      // Log context chunks info if present
      if (message.context_chunks !== undefined) {
        console.log(`ChatWsManager: Chat completed with ${message.context_chunks} context chunks`);
      }
      
      // Optionally close the connection after completion
      setTimeout(() => this.close(), 1000);
      return;
    }

    // Handle legacy format: chat_chunk (for backward compatibility)
    if (message.type === 'chat_chunk') {
      const answerPiece = message.content;
      this.answer = this.answer + answerPiece;
      this._options.callbacks.setAnswer(this.answer);
      return;
    }

    // Handle errors (new format with type: "error")
    if (message.type === 'error') {
      this._handleError(message.error);
      return;
    }

    // Handle legacy error format for backward compatibility
    if (message.error) {
      this._handleError(message.error);
      return;
    }

    // Handle sources (legacy format - keep for backward compatibility)
    if (Array.isArray(message)) {
      this._options.callbacks.setSources(message);
      return;
    }

    // Handle sources as property (legacy format)
    if (message.sources && Array.isArray(message.sources)) {
      this._options.callbacks.setSources(message.sources);
      return;
    }

    // Handle legacy answer format for backward compatibility
    if (message.a) {
      const answerPiece = message.a;
      this.answer = this.answer + answerPiece;
      this._options.callbacks.setAnswer(this.answer);
      return;
    }

    console.log('ChatWsManager: Unhandled message', message);
  }

  /**
   * Closes the WebSocket connection.
   */
  close(): void {
    this._clearTimeout();
    if (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING) {
      this._ws.close(1000, 'Manual close');
    }
  }

  /**
   * Gets the current WebSocket state.
   * @returns The WebSocket ready state.
   */
  get readyState(): number {
    return this._ws.readyState;
  }

  /**
   * Checks if the WebSocket is open.
   * @returns True if the WebSocket is open.
   */
  get isOpen(): boolean {
    return this._ws.readyState === WebSocket.OPEN;
  }
}

export default ChatWsManager; 