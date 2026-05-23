import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { useChat, type Contact } from "@/context/ChatContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

export default function ContactsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, addContact, removeContact, getOrCreateConversation } = useChat();
  const { connected, initiateCall } = useSocket();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddContact() {
    const code = inviteCode.trim();
    if (!code) { setAddError("Insere um código de convite"); return; }
    setAdding(true);
    setAddError("");
    const result = await addContact(code);
    setAdding(false);
    if (result.success) {
      setShowAdd(false);
      setInviteCode("");
    } else {
      setAddError(result.error ?? "Erro ao adicionar contacto");
    }
  }

  async function handleStartChat(contact: Contact) {
    const conv = await getOrCreateConversation(contact);
    router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
  }

  function showContactMenu(contact: Contact) {
    Alert.alert(contact.displayName, `@${contact.username}`, [
      { text: "Enviar mensagem", onPress: () => handleStartChat(contact) },
      { text: "Chamada de voz", onPress: () => { initiateCall(contact.userId, "voice"); router.push({ pathname: "/call/[id]", params: { id: contact.userId, type: "voice", callerName: contact.displayName } }); } },
      { text: "Videochamada", onPress: () => { initiateCall(contact.userId, "video"); router.push({ pathname: "/call/[id]", params: { id: contact.userId, type: "video", callerName: contact.displayName } }); } },
      {
        text: "Remover contacto",
        style: "destructive",
        onPress: () =>
          Alert.alert("Remover", `Remover ${contact.displayName}?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Remover", style: "destructive", onPress: () => removeContact(contact.id) },
          ]),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Contactos</Text>
          <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
            {contacts.length} {contacts.length === 1 ? "contacto" : "contactos"}
          </Text>
        </View>
        <View style={[styles.connBadge, { backgroundColor: connected ? "rgba(76,175,80,0.12)" : "rgba(100,100,100,0.12)" }]}>
          <View style={[styles.connDot, { backgroundColor: connected ? colors.primary : colors.offline }]} />
          <Text style={[styles.connText, { color: connected ? colors.primary : colors.mutedForeground }]}>
            {connected ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar contactos..."
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
        keyExtractor={(c) => c.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        renderItem={({ item: contact }) => (
          <TouchableOpacity
            onPress={() => handleStartChat(contact)}
            onLongPress={() => showContactMenu(contact)}
            style={[styles.item, { borderBottomColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Avatar uri={contact.avatarUri} name={contact.displayName} size={50} />
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.foreground }]}>{contact.displayName}</Text>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>@{contact.username}</Text>
              {contact.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={1}>{contact.bio}</Text>
              ) : null}
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => { initiateCall(contact.userId, "voice"); router.push({ pathname: "/call/[id]", params: { id: contact.userId, type: "voice", callerName: contact.displayName } }); }}
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              >
                <Feather name="phone" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleStartChat(contact)}
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="message-circle" size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum contacto</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Adiciona alguém com o código PLVR-XXXX.{"\n"}Apenas utilizadores da app são encontrados.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="user-plus" size={16} color={colors.primaryForeground} />
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Adicionar Contacto</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => setShowAdd(true)}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        activeOpacity={0.85}
      >
        <Feather name="user-plus" size={22} color={colors.primaryForeground} />
      </TouchableOpacity>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adicionar Contacto</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); setAddError(""); setInviteCode(""); }}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Insere o código de convite (ex: PLVR-XXXX)
            </Text>
            <View style={[styles.codeInput, { backgroundColor: colors.input, borderColor: addError ? colors.destructive : colors.border }]}>
              <Feather name="hash" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.codeText, { color: colors.foreground }]}
                value={inviteCode}
                onChangeText={(t) => { setInviteCode(t.toUpperCase()); setAddError(""); }}
                placeholder="PLVR-XXXX"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            {addError ? <Text style={[styles.errText, { color: colors.destructive }]}>{addError}</Text> : null}
            <TouchableOpacity
              onPress={handleAddContact}
              disabled={adding}
              style={[styles.addBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
              activeOpacity={0.85}
            >
              {adding ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Adicionar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  connBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, height: 42, borderRadius: 21, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16, borderWidth: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  codeInput: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 52, borderRadius: 12, borderWidth: 1 },
  codeText: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  errText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addBtn: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
