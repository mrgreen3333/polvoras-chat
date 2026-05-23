import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function InviteScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (!user) return null;

  const inviteMessage = `Junta-te a mim no Pólvoras Chat!\n\nUsa o meu código de convite:\n${user.inviteCode}\n\nDescarrega a app e entra em contacto comigo!`;

  async function handleCopy() {
    await Clipboard.setStringAsync(user!.inviteCode);
    Alert.alert("", `Código ${user!.inviteCode} copiado!`);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: inviteMessage,
        title: "Convite Pólvoras Chat",
      });
    } catch {}
  }

  async function handleShareFull() {
    try {
      await Share.share({
        message: inviteMessage,
        title: "Convite Pólvoras Chat",
      });
    } catch {}
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Convidar Amigos</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary, borderColor: colors.accent }]}>
            <Text style={styles.iconEmoji}>🌿</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            O teu código de convite
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Partilha este código com quem queres convidar para o Pólvoras Chat. Só quem tem a app consegue usar.
          </Text>

          <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.accent }]}>
            <Text style={[styles.codeText, { color: colors.accent }]}>{user.inviteCode}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Feather name="copy" size={20} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Copiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={20} color={colors.primaryForeground} />
              <Text style={[styles.actionBtnPrimaryText, { color: colors.primaryForeground }]}>Partilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Como funciona</Text>
          {[
            { icon: "share-2", text: "Partilha o teu código com um amigo" },
            { icon: "download", text: "O amigo instala o Pólvoras Chat" },
            { icon: "user-plus", text: "Vai a Contactos e adiciona com o código" },
            { icon: "message-circle", text: "Começa a conversar em privado!" },
          ].map((step, i) => (
            <View key={step.text} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>{i + 1}</Text>
              </View>
              <Feather name={step.icon as any} size={16} color={colors.accent} />
              <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleShareFull}
          style={[styles.bigShareBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
        >
          <Feather name="send" size={20} color={colors.accentForeground} />
          <Text style={[styles.bigShareBtnText, { color: colors.accentForeground }]}>
            Enviar Convite Completo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  iconEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  codeBox: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginVertical: 4,
  },
  codeText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 5 },
  actions: { flexDirection: "row", gap: 12, width: "100%" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
  },
  actionBtnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  stepText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  bigShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 27,
    marginTop: 4,
  },
  bigShareBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
