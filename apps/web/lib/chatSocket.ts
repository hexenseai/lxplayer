type ChatMessage = { type: string; [key: string]: any };

class ChatSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<(msg: ChatMessage) => void>();
  private reconnectTimer: any = null;
  private didOpenOnce = false;
  private didInitContext = false;
  private pendingInitContext: any = null;

  private getUrl() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return apiBase.replace(/^http/i, 'ws') + '/chat/ws';
  }

  private notify(msg: ChatMessage) {
    for (const fn of Array.from(this.listeners)) {
      try { fn(msg); } catch {}
    }
  }

  private bindSocket(ctx?: any) {
    const url = this.getUrl();
    const ws = new WebSocket(url);
    this.socket = ws;
    this.didInitContext = false;
    this.pendingInitContext = ctx || this.pendingInitContext;
    ws.onopen = () => {
      this.didOpenOnce = true;
      // send init if provided
      const context = this.pendingInitContext;
      if (context && !this.didInitContext) {
        try {
          ws.send(JSON.stringify({ type: 'init', context }));
          this.didInitContext = true;
        } catch {}
      }
      this.notify({ type: 'ws_open' });
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this.notify(data);
      } catch {}
    };
    ws.onerror = () => {
      // ignore
    };
    ws.onclose = () => {
      this.socket = null;
      if (typeof window === 'undefined') return;
      // reconnect automatically
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.bindSocket(undefined);
      }, this.didOpenOnce ? 1500 : 400);
    };
  }

  ensureConnected(context?: any) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      // update pending context so next reconnect will include it
      if (context) this.pendingInitContext = context;
      // if already open and not yet init'd, try to init now
      if (context && this.socket.readyState === WebSocket.OPEN && !this.didInitContext) {
        try {
          this.socket.send(JSON.stringify({ type: 'init', context }));
          this.didInitContext = true;
        } catch {}
      }
      return;
    }
    this.bindSocket(context);
  }

  subscribe(handler: (msg: ChatMessage) => void) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  sendUserMessage(content: string) {
    const ws = this.socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify({ type: 'user_message', content }));
      return true;
    } catch {
      return false;
    }
  }
}

export const chatSocket = new ChatSocket();


