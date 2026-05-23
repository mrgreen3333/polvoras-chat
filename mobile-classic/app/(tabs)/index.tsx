import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useChat, type Conversation } from "@/context/ChatContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay
    ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
    : `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function ChatsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, togglePin, toggleMute, deleteConversation, refreshConversations } = useChat();
  const { connected } = useSocket();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const onLongPress = useCallback(
    (conv: Conversation) => {
      Alert.alert(conv.contactName, "O que queres fazer?", [
        { text: conv.pinned ? "Desafixar" : "Fixar", onPress: () => togglePin(conv.id) },
        { text: conv.muted ? "Desativar silêncio" : "Silenciar", onPress: () => toggleMute(conv.id) },
        {
          text: "Eliminar conversa",
          style: "destructive",
          onPress: () =>
            Alert.alert("Eliminar", "Apagar esta conversa definitivamente?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Apagar", style: "destructive", onPress: () => deleteConversation(conv.id) },
            ]),
        },
        { text: "Cancelar", style: "cancel" },
      ]);
    },
    [togglePin, toggleMute, deleteConversation]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pólvoras Chat</Text>
          <View style={styles.headerSub}>
            <View style={[styles.statusDot, { backgroundColor: connected ? colors.online : colors.offline }]} />
            <Text style={[styles.headerSubText, { color: colors.mutedForeground }]}>
              {connected ? "Ligado • Encriptado" : "Sem ligação"}
            </Text>
            {connected && <Feather name="lock" size={10} color={colors.accent} />}
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/invite")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="user-plus" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar conversas..."
          placeholderTextColor={colors.mutedForeground}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onRefresh={refreshConversations}
        refreshing={false}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        renderItem={({ item: conv }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
            onLongPress={() => onLongPress(conv)}
            style={[styles.convItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.75}
          >
            <View style={styles.avatarWrap}>
              <Avatar uri={conv.contactAvatar} name={conv.contactName} size={52} />
              {conv.pinned && (
                <View style={[styles.pinnedBadge, { backgroundColor: colors.accent }]}>
                  <Feather name="bookmark" size={8} color={colors.accentForeground} />
                </View>
              )}
            </View>
            <View style={styles.convInfo}>
              <View style={styles.convTop}>
                <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
                  {conv.contactName}
                </Text>
                <View style={styles.convTopRight}>
                  {conv.muted && <Feather name="bell-off" size={11} color={colors.mutedForeground} />}
                  <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                    {formatTime(conv.lastMessageTime)}
                  </Text>
                </View>
              </View>
              <View style={styles.convBottom}>
                <View style={styles.convLastRow}>
                  <Feather name="lock" size={10} color={colors.accent} style={{ marginTop: 1 }} />
                  <Text
                    style={[
                      styles.convLast,
                      { color: conv.unreadCount > 0 ? colors.foreground : colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage || "Sem mensagens ainda"}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum chat ainda</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Adiciona contactos para começar a conversar de forma segura
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/contacts")}
              style={[styles.emptyBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Ver Contactos</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => router.push("/(tabs)/contacts")}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        activeOpacity={0.85}
      >
        <Feather name="edit-3" size={22} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  headerSubText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: "relative" },
  pinnedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  convInfo: { flex: 1, gap: 4 },
  convTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  convTopRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  convTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  convBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  convLastRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  convLast: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
