import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { encryptMessage, decryptMessage } from "@/utils/crypto";
import { sendLocalNotification, setBadgeCount } from "@/utils/notifications";

export type MessageType = "text" | "image" | "video";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: string;
  timestamp: number;
  read: boolean;
  deleted: boolean;
  encrypted: boolean;
};

export type Contact = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUri?: string;
  bio?: string;
  inviteCode: string;
  publicKey: string;
  addedAt: number;
};

export type Conversation = {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
};

type NewMsgHandler = (conversationId: string, message: Message) => void;

type ChatContextType = {
  conversations: Conversation[];
  contacts: Contact[];
  addContact: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  removeContact: (contactId: string) => Promise<void>;
  getOrCreateConversation: (contact: Contact) => Promise<Conversation>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (conversationId: string, content: string, type?: MessageType) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  onNewMessage: (handler: NewMsgHandler) => () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const KEYS = {
  contacts: (uid: string) => `@polv_contacts_${uid}`,
  conversations: (uid: string) => `@polv_convs_${uid}`,
  messages: (convId: string) => `@polv_msgs_${convId}`,
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token, findUserByInviteCode } = useAuth();
  const { sendChatMessage, onMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const newMsgHandlers = useRef<NewMsgHandler[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [convRaw, contRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.conversations(user.id)),
      AsyncStorage.getItem(KEYS.contacts(user.id)),
    ]);
    const convs: Conversation[] = convRaw ? (JSON.parse(convRaw) as Conversation[]) : [];
    const conts: Contact[] = contRaw ? (JSON.parse(contRaw) as Contact[]) : [];
    setConversations(sortConvs(convs));
    setContacts(conts);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time message receiving
  useEffect(() => {
    const unsub = onMessage(async (data) => {
      if (!user) return;
      const { message } = data;
      const secretKey = await AsyncStorage.getItem("@polv_secret_key");
      const senderContact = contacts.find((c) => c.userId === message.senderId);
      let content = "🔒 [Mensagem encriptada]";
      if (secretKey && senderContact?.publicKey) {
        content =
          decryptMessage(message.encrypted, message.nonce, senderContact.publicKey, secretKey) ??
          "🔒 [Erro de desencriptação]";
      }
      const msg: Message = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: senderContact?.displayName ?? "Desconhecido",
        type: message.type,
        content,
        timestamp: message.timestamp,
        read: false,
        deleted: message.deleted,
        encrypted: true,
      };
      const existing = await getMessages(message.conversationId);
      if (!existing.find((m) => m.id === msg.id)) {
        await AsyncStorage.setItem(
          KEYS.messages(message.conversationId),
          JSON.stringify([...existing, msg])
        );
      }
      const preview =
        msg.type === "image" ? "📷 Imagem" : msg.type === "video" ? "🎥 Vídeo" : content;
      await updateConversationLastMsg(message.conversationId, preview, message.timestamp, 1);
      newMsgHandlers.current.forEach((h) => h(message.conversationId, msg));

      // Notificação local — apenas quando o app está em segundo plano e a conversa não está silenciada
      const conv = conversations.find((c) => c.id === message.conversationId);
      const isBackground = AppState.currentState !== "active";
      const isMuted = conv?.muted ?? false;
      const isFromSelf = message.senderId === user.id;
      if (!isFromSelf && !isMuted && isBackground) {
        const senderName = senderContact?.displayName ?? "Pólvoras Chat";
        const notifBody =
          msg.type === "image"
            ? "📷 Enviou uma imagem"
            : msg.type === "video"
              ? "🎥 Enviou um vídeo"
              : content.length > 80
                ? content.slice(0, 80) + "…"
                : content;
        await sendLocalNotification({
          title: senderName,
          body: notifBody,
          data: { conversationId: message.conversationId },
        });
      }

      // Atualiza badge com total de não lidas
      const allConvRaw = await AsyncStorage.getItem(`@polv_convs_${user.id}`);
      if (allConvRaw) {
        const allConvs: Conversation[] = JSON.parse(allConvRaw) as Conversation[];
        const totalUnread = allConvs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        await setBadgeCount(totalUnread + 1);
      }
    });
    return unsub;
  }, [onMessage, user, contacts, conversations]);

  function sortConvs(convs: Conversation[]): Conversation[] {
    return [...convs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageTime - a.lastMessageTime;
    });
  }

  async function saveConversations(convs: Conversation[]) {
    if (!user) return;
    const sorted = sortConvs(convs);
    await AsyncStorage.setItem(KEYS.conversations(user.id), JSON.stringify(sorted));
    setConversations(sorted);
  }

  async function saveContacts(conts: Contact[]) {
    if (!user) return;
    await AsyncStorage.setItem(KEYS.contacts(user.id), JSON.stringify(conts));
    setContacts(conts);
  }

  async function updateConversationLastMsg(
    conversationId: string,
    preview: string,
    timestamp: number,
    unreadDelta = 0
  ) {
    const current = conversations.find((c) => c.id === conversationId);
    if (!current) return;
    const updated = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            lastMessage: preview,
            lastMessageTime: timestamp,
            unreadCount: c.unreadCount + unreadDelta,
          }
        : c
    );
    await saveConversations(updated);
  }

  async function addContact(inviteCode: string) {
    if (!user) return { success: false, error: "Não autenticado" };
    const code = inviteCode.toUpperCase().trim();
    if (code === user.inviteCode.toUpperCase())
      return { success: false, error: "Não podes adicionar-te a ti próprio" };
    if (contacts.find((c) => c.inviteCode.toUpperCase() === code))
      return { success: false, error: "Contacto já adicionado" };

    const found = await findUserByInviteCode(code);
    if (!found) return { success: false, error: "Utilizador não encontrado. Verifica o código." };

    const newContact: Contact = {
      id: genId(),
      userId: found.id,
      username: found.username,
      displayName: found.displayName,
      avatarUri: found.avatarUri,
      bio: found.bio,
      inviteCode: found.inviteCode,
      publicKey: found.publicKey,
      addedAt: Date.now(),
    };
    await saveContacts([...contacts, newContact]);
    return { success: true };
  }

  async function removeContact(contactId: string) {
    await saveContacts(contacts.filter((c) => c.id !== contactId));
  }

  async function getOrCreateConversation(contact: Contact): Promise<Conversation> {
    const existing = conversations.find((c) => c.contactId === contact.id);
    if (existing) return existing;
    const conv: Conversation = {
      id: genId(),
      contactId: contact.id,
      contactName: contact.displayName,
      contactAvatar: contact.avatarUri,
      lastMessage: "",
      lastMessageTime: Date.now(),
      unreadCount: 0,
      pinned: false,
      muted: false,
    };
    await saveConversations([conv, ...conversations]);
    return conv;
  }

  async function getMessages(conversationId: string): Promise<Message[]> {
    const raw = await AsyncStorage.getItem(KEYS.messages(conversationId));
    return raw ? (JSON.parse(raw) as Message[]) : [];
  }

  async function sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = "text"
  ) {
    if (!user) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const contact = contacts.find((c) => c.id === conv.contactId);

    let isEncrypted = false;
    if (contact?.publicKey) {
      const secretKey = await AsyncStorage.getItem("@polv_secret_key");
      if (secretKey) {
        const enc = encryptMessage(content, contact.publicKey, secretKey);
        if (enc) {
          sendChatMessage({
            conversationId,
            recipientId: contact.userId,
            encrypted: enc.encrypted,
            nonce: enc.nonce,
            msgType: type,
          });
          isEncrypted = true;
        }
      }
    }

    const msg: Message = {
      id: genId(),
      conversationId,
      senderId: user.id,
      senderName: user.displayName,
      type,
      content,
      timestamp: Date.now(),
      read: false,
      deleted: false,
      encrypted: isEncrypted,
    };
    const existing = await getMessages(conversationId);
    await AsyncStorage.setItem(
      KEYS.messages(conversationId),
      JSON.stringify([...existing, msg])
    );
    const preview = type === "image" ? "📷 Imagem" : type === "video" ? "🎥 Vídeo" : content;
    await updateConversationLastMsg(conversationId, preview, msg.timestamp);
    newMsgHandlers.current.forEach((h) => h(conversationId, msg));
  }

  async function deleteMessage(conversationId: string, messageId: string) {
    const msgs = await getMessages(conversationId);
    const updated = msgs.map((m) =>
      m.id === messageId ? { ...m, deleted: true, content: "Mensagem apagada" } : m
    );
    await AsyncStorage.setItem(KEYS.messages(conversationId), JSON.stringify(updated));
  }

  async function markAsRead(conversationId: string) {
    const msgs = await getMessages(conversationId);
    await AsyncStorage.setItem(
      KEYS.messages(conversationId),
      JSON.stringify(msgs.map((m) => ({ ...m, read: true })))
    );
    const updatedConvs = conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    );
    await saveConversations(updatedConvs);
    // Atualiza badge
    const totalUnread = updatedConvs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    await setBadgeCount(totalUnread);
  }

  async function togglePin(conversationId: string) {
    await saveConversations(
      conversations.map((c) => (c.id === conversationId ? { ...c, pinned: !c.pinned } : c))
    );
  }

  async function toggleMute(conversationId: string) {
    await saveConversations(
      conversations.map((c) => (c.id === conversationId ? { ...c, muted: !c.muted } : c))
    );
  }

  async function deleteConversation(conversationId: string) {
    await AsyncStorage.removeItem(KEYS.messages(conversationId));
    await saveConversations(conversations.filter((c) => c.id !== conversationId));
  }

  const onNewMessage = useCallback((handler: NewMsgHandler) => {
    newMsgHandlers.current.push(handler);
    return () => {
      newMsgHandlers.current = newMsgHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        contacts,
        addContact,
        removeContact,
        getOrCreateConversation,
        getMessages,
        sendMessage,
        deleteMessage,
        markAsRead,
        togglePin,
        toggleMute,
        deleteConversation,
        refreshConversations: loadData,
        onNewMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
