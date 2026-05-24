import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenBus } from "@/utils/tokenBus";

function getApiBase() {
  try { return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`; } catch { return "https://localhost/api"; }
}
function getWsUrl() {
  try { return `wss://${process.env.EXPO_PUBLIC_DOMAIN}/api/ws`; } catch { return "wss://localhost/api/ws"; }
}

export type IncomingMessage = {
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "image" | "video";
    encrypted: string;
    nonce: string;
    timestamp: number;
    deleted: boolean;
  };
};

export type CallOffer = {
  from: string;
  fromName: string;
  fromAvatar?: string;
  callType: "voice" | "video";
};

type MessageHandler = (data: IncomingMessage) => void;
type CallOfferHandler = (data: CallOffer) => void;
type CallEventHandler = (from: string) => void;

type SocketContextType = {
  connected: boolean;
  apiBase: string;
  sendChatMessage: (data: {
    conversationId: string;
    recipientId: string;
    encrypted: string;
    nonce: string;
    msgType: "text" | "image" | "video";
  }) => void;
  initiateCall: (recipientId: string, callType: "voice" | "video") => void;
  answerCall: (callerId: string) => void;
  rejectCall: (callerId: string) => void;
  endCall: (recipientId: string) => void;
  onMessage: (handler: MessageHandler) => () => void;
  onCallOffer: (handler: CallOfferHandler) => () => void;
  onCallAnswer: (handler: CallEventHandler) => () => void;
  onCallReject: (handler: CallEventHandler) => () => void;
  onCallEnd: (handler: CallEventHandler) => () => void;
  connect: (token: string) => void;
  disconnect: () => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const mountedRef = useRef(true);

  const messageHandlers = useRef<MessageHandler[]>([]);
  const callOfferHandlers = useRef<CallOfferHandler[]>([]);
  const callAnswerHandlers = useRef<CallEventHandler[]>([]);
  const callRejectHandlers = useRef<CallEventHandler[]>([]);
  const callEndHandlers = useRef<CallEventHandler[]>([]);

  const connectWs = useCallback((token: string) => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!process.env.EXPO_PUBLIC_DOMAIN) return;

    tokenRef.current = token;
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }
        switch (data.type) {
          case "auth_ok":
            if (mountedRef.current) {
              setConnected(true);
              reconnectDelay.current = 1000;
            }
            break;
          case "auth_error":
            ws.close();
            break;
          case "message":
            messageHandlers.current.forEach((h) => h(data as unknown as IncomingMessage));
            break;
          case "call_offer":
            callOfferHandlers.current.forEach((h) => h(data as unknown as CallOffer));
            break;
          case "call_answer":
            callAnswerHandlers.current.forEach((h) => h(data.from as string));
            break;
          case "call_reject":
            callRejectHandlers.current.forEach((h) => h(data.from as string));
            break;
          case "call_end":
            callEndHandlers.current.forEach((h) => h(data.from as string));
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        if (mountedRef.current) setConnected(false);
        wsRef.current = null;
        if (tokenRef.current && mountedRef.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            if (tokenRef.current && mountedRef.current) connectWs(tokenRef.current);
          }, reconnectDelay.current);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      if (mountedRef.current) setConnected(false);
    }
  }, []);

  const connect = useCallback(
    (token: string) => {
      tokenRef.current = token;
      connectWs(token);
    },
    [connectWs]
  );

  const disconnect = useCallback(() => {
    tokenRef.current = null;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // Subscribe to token bus
  useEffect(() => {
    const unsub = tokenBus.subscribe((token) => {
      if (token) {
        connect(token);
      } else {
        disconnect();
      }
    });
    // Auto-connect from AsyncStorage on mount
    AsyncStorage.getItem("@polv_token").then((token) => {
      if (token && mountedRef.current) connect(token);
    });
    return () => {
      unsub();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendChatMessage = useCallback(
    (data: {
      conversationId: string;
      recipientId: string;
      encrypted: string;
      nonce: string;
      msgType: "text" | "image" | "video";
    }) => send({ type: "message", ...data }),
    [send]
  );

  const initiateCall = useCallback(
    (recipientId: string, callType: "voice" | "video") =>
      send({ type: "call_offer", recipientId, callType }),
    [send]
  );
  const answerCall = useCallback(
    (callerId: string) => send({ type: "call_answer", recipientId: callerId }),
    [send]
  );
  const rejectCall = useCallback(
    (callerId: string) => send({ type: "call_reject", recipientId: callerId }),
    [send]
  );
  const endCall = useCallback(
    (recipientId: string) => send({ type: "call_end", recipientId }),
    [send]
  );

  const onMessage = useCallback((handler: MessageHandler) => {
    messageHandlers.current.push(handler);
    return () => {
      messageHandlers.current = messageHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  const onCallOffer = useCallback((handler: CallOfferHandler) => {
    callOfferHandlers.current.push(handler);
    return () => {
      callOfferHandlers.current = callOfferHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  const onCallAnswer = useCallback((handler: CallEventHandler) => {
    callAnswerHandlers.current.push(handler);
    return () => {
      callAnswerHandlers.current = callAnswerHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  const onCallReject = useCallback((handler: CallEventHandler) => {
    callRejectHandlers.current.push(handler);
    return () => {
      callRejectHandlers.current = callRejectHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  const onCallEnd = useCallback((handler: CallEventHandler) => {
    callEndHandlers.current.push(handler);
    return () => {
      callEndHandlers.current = callEndHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        connected,
        apiBase: getApiBase(),
        sendChatMessage,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        onMessage,
        onCallOffer,
        onCallAnswer,
        onCallReject,
        onCallEnd,
        connect,
        disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}

export function getApiBaseUrl() { return getApiBase(); }
