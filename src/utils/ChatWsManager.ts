/**
 * The WebSocket protocol for Chat between FE and BE is as follows:
 *
 * 1. FE opens a WebSocket connection to the BE.
 * 2. FE authenticates with JWT token by sending {"type": "auth", "token": "jwt_token"}.
 * 3. BE responds with {"type": "auth_success", "user_id": "user_id"}.
 * 4. FE sends a question to the BE as JSON: {"type": "chat", "message": "question", "chat_id": "optional"}.
 * 5. BE sends {"type": "chat_start", "chat_id": "id", "message_id": "id"}.
 * 6. BE streams answer pieces as {"type": "chat_chunk", "content": "piece", "chat_id": "id"}.
 * 7. BE sends {"type": "chat_complete", "chat_id": "id", "message_id": "id", "full_response": "complete_answer"}.
 * 8. BE can send errors as {"type": "error", "error": "message"} and then close the connection.
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
  onChatStart?: (chatId: string, messageId: string) => void;
  onChatComplete?: (chatId: string, messageId: string, fullResponse: string) => void;
}

interface ChatWsManagerOptions {
  apiInfo: ApiInfo;
  callbacks: Callbacks;
  question: string;
  chatId?: string;
  authToken: string;
  timeout?: number;
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

    // Handle new format: stream_start
    if (message.type === 'stream_start') {
      // Extract chat_id if present in the message
      const chatId = message.chat_id || this.currentChatId || 'unknown';
      this.currentChatId = chatId;
      
      if (this._options.callbacks.onChatStart) {
        // Use query from stream_start or generate a message ID
        const messageId = message.message_id || `msg-${Date.now()}`;
        this._options.callbacks.onChatStart(chatId, messageId);
      }
      return;
    }

    // Handle new format: chunk (streaming response)
    if (message.type === 'chunk') {
      const answerPiece = message.content;
      this.answer = this.answer + answerPiece;
      
      this._options.callbacks.setAnswer(this.answer);
      return;
    }

    // Handle new format: complete
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
          message.full_response
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

    // Handle legacy format: chat_start (for backward compatibility)
    if (message.type === 'chat_start') {
      this.currentChatId = message.chat_id;
      // Reset answer accumulator for new chat
      this.answer = '';
      if (this._options.callbacks.onChatStart) {
        this._options.callbacks.onChatStart(message.chat_id, message.message_id);
      }
      return;
    }

    // Handle legacy format: chat_chunk (for backward compatibility)
    if (message.type === 'chat_chunk') {
      const answerPiece = message.content;
      this.answer = this.answer + answerPiece;
      this._options.callbacks.setAnswer(this.answer);
      return;
    }

    // Handle legacy format: chat_complete (for backward compatibility)
    if (message.type === 'chat_complete') {
      // Clear timeout since chat is complete
      this._clearTimeout();
      
      if (message.full_response) {
        this.answer = message.full_response;
        this._options.callbacks.setAnswer(this.answer);
      }
      if (this._options.callbacks.onChatComplete) {
        this._options.callbacks.onChatComplete(
          message.chat_id, 
          message.message_id, 
          message.full_response
        );
      }
      // Optionally close the connection after completion
      setTimeout(() => this.close(), 1000);
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