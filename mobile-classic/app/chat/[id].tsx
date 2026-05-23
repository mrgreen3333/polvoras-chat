import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Feather } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBubble } from "@/components/ChatBubble";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useChat, type Message, type Conversation } from "@/context/ChatContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, contacts, getMessages, sendMessage, deleteMessage, markAsRead, onNewMessage } = useChat();
  const { connected, initiateCall } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);

  const conversation: Conversation | undefined = conversations.find((c) => c.id === id);
  const contact = conversation ? contacts.find((c) => c.id === conversation.contactId) : undefined;

  const loadMessages = useCallback(async () => {
    if (!id) return;
    const msgs = await getMessages(id);
    setMessages(msgs);
    setLoading(false);
    await markAsRead(id);
  }, [id, getMessages, markAsRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time new messages
  useEffect(() => {
    const unsub = onNewMessage((convId, msg) => {
      if (convId === id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        markAsRead(id).catch(() => null);
      }
    });
    return unsub;
  }, [id, onNewMessage, markAsRead]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !id) return;
    setText("");
    setShowEmoji(false);
    await sendMessage(id, trimmed, "text");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleImagePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    await sendMessage(id!, asset.uri, asset.type === "video" ? "video" : "image");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleLongPress(message: Message) {
    if (!user) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (message.senderId === user.id && !message.deleted) {
      Alert.alert("Mensagem", "", [
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            await deleteMessage(id!, message.id);
            setMessages((prev) =>
              prev.map((m) => m.id === message.id ? { ...m, deleted: true, content: "Mensagem apagada" } : m)
            );
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  }

  function handleCallOptions() {
    if (!contact) return;
    Alert.alert(contact.displayName, "Iniciar chamada", [
      { text: "Chamada de Voz", onPress: () => startCall("voice") },
      { text: "Videochamada", onPress: () => startCall("video") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function startCall(callType: "voice" | "video") {
    if (!contact) return;
    initiateCall(contact.userId, callType);
    router.push({
      pathname: "/call/[id]",
      params: { id: contact.userId, type: callType, callerName: contact.displayName },
    });
  }

  const displayName = conversation?.contactName ?? contact?.displayName ?? "Chat";
  const avatarUri = conversation?.contactAvatar ?? contact?.avatarUri;
  const reversedMessages = [...messages].reverse();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 4),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Avatar uri={avatarUri} name={displayName} size={40} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: connected ? colors.online : colors.offline }]} />
            <Text style={[styles.headerStatusText, { color: colors.mutedForeground }]}>
              {connected ? "Online" : "Offline"}
            </Text>
            <Feather name="lock" size={10} color={colors.accent} />
            <Text style={[styles.encryptLabel, { color: colors.accent }]}>E2E</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleCallOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="phone" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert(displayName, "", [
            { text: "Videochamada", onPress: () => startCall("video") },
            { text: "Silenciar conversa", onPress: () => {} },
            { text: "Eliminar conversa", style: "destructive", onPress: () => router.back() },
            { text: "Cancelar", style: "cancel" },
          ])}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="more-vertical" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <ChatBubble message={item} isSent={item.senderId === user?.id} onLongPress={handleLongPress} />
          )}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View style={{ height: 8 }} />}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyMessages}>
                <View style={[styles.emptyLockBadge, { backgroundColor: "rgba(200,169,81,0.1)", borderColor: colors.accent }]}>
                  <Feather name="lock" size={16} color={colors.accent} />
                  <Text style={[styles.emptyLockText, { color: colors.accent }]}>
                    Mensagens encriptadas ponta a ponta
                  </Text>
                </View>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Sem mensagens ainda.{"\n"}Di olá!
                </Text>
              </View>
            )
          }
        />

        {showEmoji && <EmojiPicker onSelect={(e) => setText((t) => t + e)} />}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: showEmoji ? 4 : insets.bottom + 4,
            },
          ]}
        >
          <TouchableOpacity onPress={() => { setShowEmoji((v) => !v); if (showEmoji) inputRef.current?.focus(); }} style={styles.iconBtn}>
            <Feather name={showEmoji ? "x" : "smile"} size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={text}
            onChangeText={setText}
            placeholder="Escreve uma mensagem..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            onFocus={() => setShowEmoji(false)}
          />
          <TouchableOpacity onPress={handleImagePick} style={styles.iconBtn}>
            <Feather name="image" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim()}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  headerStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  headerStatusText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  encryptLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  messageList: { flex: 1 },
  messageListContent: { paddingTop: 8, paddingBottom: 4 },
  emptyMessages: { alignItems: "center", paddingVertical: 80, gap: 16 },
  emptyLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyLockText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
