import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LeafParticles } from "@/components/LeafParticles";
import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: "#071007" }]}>
      <LinearGradient
        colors={["#071007", "#0D1A0D", "#142114", "#0D1A0D"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LeafParticles intensity="high" />

      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoRing, { borderColor: colors.accent }]}>
            <View style={[styles.logoInner, { backgroundColor: "rgba(200,169,81,0.1)" }]}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
          </View>
          <Text style={[styles.appName, { color: "#fff" }]}>Pólvoras Chat</Text>
          <Text style={[styles.tagline, { color: "rgba(255,255,255,0.5)" }]}>
            Comunicação privada. Encriptada. Exclusiva.
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(200,169,81,0.15)" }]}>
          {[
            { icon: "lock" as const, label: "Encriptação ponta a ponta", sub: "As tuas mensagens são privadas" },
            { icon: "user-check" as const, label: "Acesso por convite", sub: "Só quem tem a app pode entrar" },
            { icon: "phone" as const, label: "Chamadas e vídeo", sub: "Comunicação segura em tempo real" },
            { icon: "image" as const, label: "Partilha de média", sub: "Fotos e vídeos encriptados" },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: "rgba(76,175,80,0.12)" }]}>
                <Feather name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureLabel, { color: "#fff" }]}>{f.label}</Text>
                <Text style={[styles.featureSub, { color: "rgba(255,255,255,0.45)" }]}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, "#2E7D32"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Criar Conta
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={[styles.secondaryBtn, { borderColor: "rgba(255,255,255,0.2)" }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: "rgba(255,255,255,0.85)" }]}>
              Já tenho conta — Entrar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: "rgba(255,255,255,0.25)" }]}>
          Apenas disponível para quem possui esta aplicação
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  logoSection: { alignItems: "center", gap: 12 },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: { fontSize: 46 },
  appName: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  featuresCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, gap: 2 },
  featureLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  buttons: { gap: 12 },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  footer: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular" },
});
