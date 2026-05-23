import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState(user?.avatarUri);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permite o acesso à galeria nas definições.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert("Erro", "O nome de exibição não pode estar vazio");
      return;
    }
    setSaving(true);
    await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUri,
    });
    setSaving(false);
    router.back();
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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Editar Perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarBtn}>
            <Avatar uri={avatarUri} name={displayName || user.displayName} size={96} />
            <View style={[styles.avatarOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Feather name="camera" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Toca para alterar foto
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nome de exibição</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Como apareces nos chats"
              placeholderTextColor={colors.mutedForeground}
              maxLength={50}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conta algo sobre ti..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={150}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.readOnlyField}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Username</Text>
            <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>
              @{user.username}
            </Text>
          </View>
          <View style={[styles.readOnlyField, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Código de convite</Text>
            <Text style={[styles.readOnlyText, { color: colors.accent }]}>{user.inviteCode}</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
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
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  container: { padding: 20, gap: 20 },
  avatarSection: { alignItems: "center", gap: 10 },
  avatarBtn: { position: "relative" },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  fieldInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 24,
  },
  readOnlyField: { paddingHorizontal: 16, paddingVertical: 12 },
  readOnlyText: { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 4 },
});
