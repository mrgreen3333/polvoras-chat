import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.accent }]}>{title}</Text>
  );
}

type RowProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
};
function Row({ icon, label, value, onPress, right, danger }: RowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "#3D1515" : colors.secondary }]}>
        <Feather name={icon} size={17} color={danger ? colors.destructive : colors.accent} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]} numberOfLines={1}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={17} color={colors.mutedForeground} /> : null)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout, token } = useAuth();
  const { connected } = useSocket();

  if (!user) return null;

  async function copyKey() {
    await Clipboard.setStringAsync(user!.inviteCode);
    Alert.alert("", `Código ${user!.inviteCode} copiado`);
  }

  async function copyPublicKey() {
    await Clipboard.setStringAsync(user!.publicKey);
    Alert.alert("Chave Pública Copiada", "Partilha com contactos para verificação E2E");
  }

  async function shareInvite() {
    await Share.share({ message: `Junta-te ao Pólvoras Chat!\nCódigo de convite: ${user!.inviteCode}`, title: "Pólvoras Chat" });
  }

  async function handleLogout() {
    Alert.alert("Terminar Sessão", "Tens a certeza que queres sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  }

  async function handleDeleteAllData() {
    Alert.alert(
      "Apagar Todos os Dados",
      "Esta ação apaga todas as mensagens, contactos e configurações. Não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar Tudo",
          style: "destructive",
          onPress: async () => {
            const keys = await AsyncStorage.getAllKeys();
            await AsyncStorage.multiRemove(keys as string[]);
            await logout();
            router.replace("/(auth)/welcome");
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12), borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Definições</Text>
        <View style={[styles.connBadge, { backgroundColor: connected ? "rgba(76,175,80,0.15)" : "rgba(100,100,100,0.15)" }]}>
          <View style={[styles.connDot, { backgroundColor: connected ? colors.primary : colors.offline }]} />
          <Text style={[styles.connText, { color: connected ? colors.primary : colors.mutedForeground }]}>
            {connected ? "Ligado" : "Sem ligação"}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Profile card */}
        <TouchableOpacity
          onPress={() => router.push("/profile/edit")}
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Avatar uri={user.avatarUri} name={user.displayName} size={64} showStatus status={user.status} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user.displayName}</Text>
            <Text style={[styles.profileUsername, { color: colors.mutedForeground }]}>@{user.username}</Text>
            {user.bio ? <Text style={[styles.profileBio, { color: colors.mutedForeground }]} numberOfLines={1}>{user.bio}</Text> : null}
          </View>
          <Feather name="edit-2" size={17} color={colors.mutedForeground} />
        </TouchableOpacity>

        <SectionHeader title="CONTA" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="user" label="Nome de exibição" value={user.displayName} onPress={() => router.push("/profile/edit")} />
          <Row icon="at-sign" label="Username" value={`@${user.username}`} />
          <Row icon="info" label="Bio" value={user.bio || "Sem bio"} onPress={() => router.push("/profile/edit")} />
          <Row
            icon="activity"
            label="Estado"
            value={user.status === "online" ? "Online" : user.status === "away" ? "Ausente" : "Offline"}
            onPress={() =>
              Alert.alert("Estado de Presença", "", [
                { text: "Online", onPress: () => updateProfile({ status: "online" }) },
                { text: "Ausente", onPress: () => updateProfile({ status: "away" }) },
                { text: "Offline (Invisível)", onPress: () => updateProfile({ status: "offline" }) },
                { text: "Cancelar", style: "cancel" },
              ])
            }
          />
        </View>

        <SectionHeader title="CONVITE" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.inviteBox, { borderBottomColor: colors.border }]}>
            <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>O teu código único</Text>
            <View style={styles.inviteRow}>
              <Text style={[styles.inviteCode, { color: colors.accent }]}>{user.inviteCode}</Text>
              <View style={styles.inviteBtns}>
                <TouchableOpacity onPress={copyKey} style={[styles.iconBtnSmall, { backgroundColor: colors.secondary }]}>
                  <Feather name="copy" size={15} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={shareInvite} style={[styles.iconBtnSmall, { backgroundColor: colors.primary }]}>
                  <Feather name="share-2" size={15} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Row icon="user-plus" label="Convidar amigos" onPress={() => router.push("/invite")} />
        </View>

        <SectionHeader title="CHAMADAS" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            icon="phone"
            label="Tipo padrão de chamada"
            value="Voz"
            onPress={() => Alert.alert("Em breve", "Configuração de tipo de chamada")}
          />
          <Row
            icon="video"
            label="Qualidade de vídeo"
            value="Auto"
            onPress={() => Alert.alert("Em breve", "Configuração de qualidade")}
          />
          <Row
            icon="bell"
            label="Toque de chamada"
            value="Padrão"
            onPress={() => Alert.alert("Em breve", "Configuração de toque")}
          />
          <Row
            icon="phone-missed"
            label="Rejeitar chamadas desconhecidas"
            right={
              <Switch
                value={false}
                onValueChange={() => Alert.alert("Em breve")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
              />
            }
          />
        </View>

        <SectionHeader title="PRIVACIDADE" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            icon="check-circle"
            label="Confirmações de leitura"
            right={
              <Switch
                value={user.showReadReceipts}
                onValueChange={(v) => updateProfile({ showReadReceipts: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
              />
            }
          />
          <Row
            icon="trash-2"
            label="Auto-apagar mensagens"
            right={
              <Switch
                value={user.autoDeleteMessages}
                onValueChange={(v) => updateProfile({ autoDeleteMessages: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
              />
            }
          />
          <Row
            icon="eye-off"
            label="Último acesso visível"
            right={
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
              />
            }
          />
          <Row
            icon="shield"
            label="Captura de ecrã"
            value="Permitida"
            onPress={() => Alert.alert("Em breve")}
          />
        </View>

        <SectionHeader title="ENCRIPTAÇÃO" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.e2eStatus, { borderBottomColor: colors.border }]}>
            <View style={[styles.e2eIcon, { backgroundColor: "rgba(76,175,80,0.15)" }]}>
              <Feather name="lock" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.e2eTitle, { color: colors.foreground }]}>Encriptação Ativa</Text>
              <Text style={[styles.e2eSub, { color: colors.mutedForeground }]}>
                Todas as mensagens usam NaCl Box (Curve25519)
              </Text>
            </View>
          </View>
          <Row icon="key" label="A tua chave pública" value={`${user.publicKey.substring(0, 16)}...`} onPress={copyPublicKey} />
          <Row icon="user-check" label="Verificar contacto" value="Via código de segurança" onPress={() => Alert.alert("Em breve")} />
        </View>

        <SectionHeader title="NOTIFICAÇÕES" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            icon="bell"
            label="Notificações"
            right={
              <Switch
                value={user.notifications}
                onValueChange={(v) => updateProfile({ notifications: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.foreground}
              />
            }
          />
          <Row icon="volume-2" label="Som de notificação" value="Padrão" onPress={() => Alert.alert("Em breve")} />
          <Row icon="activity" label="Vibração" value="Ligada" onPress={() => Alert.alert("Em breve")} />
        </View>

        <SectionHeader title="ARMAZENAMENTO" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="download" label="Download automático de média" value="Wi-Fi" onPress={() => Alert.alert("Em breve")} />
          <Row icon="hard-drive" label="Limpar cache" onPress={() => Alert.alert("Em breve")} />
        </View>

        <SectionHeader title="SOBRE" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="shield" label="Versão" value="Pólvoras Chat v2.0.0" />
          <Row icon="lock" label="Protocolo" value="NaCl Box (Curve25519 + XSalsa20)" />
          <Row icon="server" label="Servidor" value={token?.startsWith("local_") ? "Modo local" : "Ligado"} />
          <Row icon="hash" label="ID da conta" value={`${user.id.substring(0, 16)}...`} />
        </View>

        <SectionHeader title="SESSÃO" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="log-out" label="Terminar sessão" onPress={handleLogout} danger />
          <Row icon="trash" label="Apagar todos os dados" onPress={handleDeleteAllData} danger />
        </View>
      </ScrollView>
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
  connBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  connDot: { width: 7, height: 7, borderRadius: 3.5 },
  connText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  profileUsername: { fontSize: 13, fontFamily: "Inter_400Regular" },
  profileBio: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2 },
  section: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inviteBox: { padding: 16, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  inviteLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inviteCode: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  inviteBtns: { flexDirection: "row", gap: 8 },
  iconBtnSmall: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  e2eStatus: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  e2eIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  e2eTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  e2eSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
