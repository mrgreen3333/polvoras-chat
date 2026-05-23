import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./middlewares/auth.js";
import { store } from "./store.js";
import { logger } from "./lib/logger.js";

const clients = new Map<string, WebSocket>();

type WsIncoming = {
  type: string;
  token?: string;
  conversationId?: string;
  recipientId?: string;
  encrypted?: string;
  nonce?: string;
  msgType?: "text" | "image" | "video";
  sdp?: string;
  callType?: "voice" | "video";
  candidate?: unknown;
  messageId?: string;
};

export function setupWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on("message", (raw) => {
      let msg: WsIncoming;
      try {
        msg = JSON.parse(raw.toString()) as WsIncoming;
      } catch {
        return;
      }

      if (msg.type === "auth") {
        if (!msg.token) {
          ws.send(JSON.stringify({ type: "auth_error", error: "Token em falta" }));
          return;
        }
        try {
          const payload = jwt.verify(msg.token, JWT_SECRET) as { userId: string };
          userId = payload.userId;
          clients.set(userId, ws);
          store.updateUser(userId, { status: "online" });
          ws.send(JSON.stringify({ type: "auth_ok", userId }));
          logger.info({ userId }, "WebSocket autenticado");
        } catch {
          ws.send(JSON.stringify({ type: "auth_error", error: "Token inválido" }));
        }
        return;
      }

      if (!userId) {
        ws.send(JSON.stringify({ type: "error", error: "Não autenticado" }));
        return;
      }

      const relay = (targetId: string, payload: object): void => {
        const target = clients.get(targetId);
        if (target?.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify(payload));
        }
      };

      switch (msg.type) {
        case "message": {
          if (!msg.conversationId || !msg.recipientId || !msg.encrypted || !msg.nonce) break;
          const message = store.addMessage({
            conversationId: msg.conversationId,
            senderId: userId,
            type: msg.msgType ?? "text",
            encrypted: msg.encrypted,
            nonce: msg.nonce,
            timestamp: Date.now(),
            deleted: false,
          });
          relay(msg.recipientId, { type: "message", message });
          ws.send(JSON.stringify({ type: "message_ack", message }));
          break;
        }
        case "call_offer": {
          if (!msg.recipientId) break;
          const caller = store.findUserById(userId);
          relay(msg.recipientId, {
            type: "call_offer",
            from: userId,
            fromName: caller?.displayName ?? "Utilizador",
            fromAvatar: caller?.avatarUri,
            callType: msg.callType ?? "voice",
          });
          break;
        }
        case "call_answer":
        case "call_reject":
        case "call_end": {
          if (!msg.recipientId) break;
          relay(msg.recipientId, { type: msg.type, from: userId });
          break;
        }
        case "call_ice": {
          if (!msg.recipientId) break;
          relay(msg.recipientId, { type: "call_ice", from: userId, candidate: msg.candidate });
          break;
        }
        case "delete_message": {
          if (msg.conversationId && msg.messageId) {
            store.deleteMessage(msg.conversationId, msg.messageId);
          }
          break;
        }
        default:
          break;
      }
    });

    ws.on("close", () => {
      if (userId) {
        clients.delete(userId);
        store.updateUser(userId, { status: "offline" });
        logger.info({ userId }, "WebSocket desligado");
      }
    });

    ws.on("error", (err) => {
      logger.error({ err, userId }, "WebSocket erro");
    });
  });

  logger.info("WebSocket server iniciado em /api/ws");
}
