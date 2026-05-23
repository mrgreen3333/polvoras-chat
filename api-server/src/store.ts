import { randomUUID } from "node:crypto";

export type StoreUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  bio: string;
  avatarUri?: string;
  status: "online" | "away" | "offline";
  inviteCode: string;
  publicKey: string;
  createdAt: number;
};

export type StoreMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "image" | "video";
  encrypted: string;
  nonce: string;
  timestamp: number;
  deleted: boolean;
};

class Store {
  private users = new Map<string, StoreUser>();
  private messages = new Map<string, StoreMessage[]>();

  findUserById(id: string): StoreUser | undefined {
    return this.users.get(id);
  }

  findUserByUsername(username: string): StoreUser | undefined {
    for (const u of this.users.values()) {
      if (u.username === username.toLowerCase()) return u;
    }
    return undefined;
  }

  findUserByInviteCode(code: string): StoreUser | undefined {
    for (const u of this.users.values()) {
      if (u.inviteCode.toUpperCase() === code.toUpperCase()) return u;
    }
    return undefined;
  }

  createUser(data: Omit<StoreUser, "id" | "createdAt">): StoreUser {
    const user: StoreUser = { ...data, id: randomUUID(), createdAt: Date.now() };
    this.users.set(user.id, user);
    return user;
  }

  updateUser(id: string, updates: Partial<StoreUser>): StoreUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  getMessages(conversationId: string): StoreMessage[] {
    return this.messages.get(conversationId) ?? [];
  }

  addMessage(msg: Omit<StoreMessage, "id">): StoreMessage {
    const message: StoreMessage = { ...msg, id: randomUUID() };
    const existing = this.messages.get(msg.conversationId) ?? [];
    this.messages.set(msg.conversationId, [...existing, message]);
    return message;
  }

  deleteMessage(conversationId: string, messageId: string): void {
    const msgs = this.messages.get(conversationId) ?? [];
    this.messages.set(
      conversationId,
      msgs.map((m) => (m.id === messageId ? { ...m, deleted: true } : m))
    );
  }
}

export const store = new Store();
