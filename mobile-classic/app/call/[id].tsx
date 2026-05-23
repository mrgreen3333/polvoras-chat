import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

type CallState = "calling" | "ringing" | "active" | "ended";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallScreen() {
  const { id, type, incoming, callerName, callerAvatar } = useLocalSearchParams<{
    id: string;
    type?: string;
    incoming?: string;
    callerName?: string;
    callerAvatar?: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { initiateCall, answerCall, rejectCall, endCall, onCallAnswer, onCallReject, onCallEnd } =
    useSocket();

  const isIncoming = incoming === "1";
  const callType = (type ?? "voice") as "voice" | "video";
  const contactName = callerName ?? "Contacto";
  const contactAvatar = callerAvatar ?? undefined;

  const [callState, setCallState] = useState<CallState>(isIncoming ? "ringing" : "calling");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start outgoing call
  useEffect(() => {
    if (!isIncoming && id) {
      initiateCall(id, callType);
    }
    if (isIncoming) {
      Vibration.vibrate([500, 500, 500, 500], true);
    }
    return () => Vibration.cancel();
  }, []);

  // Duration timer
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Socket events
  useEffect(() => {
    const unsubAnswer = onCallAnswer(() => {
      Vibration.cancel();
      setCallState("active");
    });
    const unsubReject = onCallReject(() => {
      Vibration.cancel();
      setCallState("ended");
      setTimeout(() => router.back(), 2000);
    });
    const unsubEnd = onCallEnd(() => {
      Vibration.cancel();
      setCallState("ended");
      setTimeout(() => router.back(), 2000);
    });
    return () => { unsubAnswer(); unsubReject(); unsubEnd(); };
  }, []);

  function handleAccept() {
    Vibration.cancel();
    if (id) answerCall(id);
    setCallState("active");
  }

  function handleReject() {
    Vibration.cancel();
    if (id) rejectCall(id);
    router.back();
  }

  function handleEnd() {
    Vibration.cancel();
    if (id) endCall(id);
    setCallState("ended");
    setTimeout(() => router.back(), 1500);
  }

  const stateLabel =
    callState === "calling" ? "A chamar..."
    : callState === "ringing" ? "Chamada entrada"
    : callState === "active" ? formatDuration(duration)
    : "Chamada encerrada";

  return (
    <View style={[styles.root, { backgroundColor: "#071007" }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-down" size={28} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={styles.callTypeBadge}>
          <Feather
            name={callType === "video" ? "video" : "phone"}
            size={14}
            color={colors.accent}
          />
          <Text style={[styles.callTypeText, { color: colors.accent }]}>
            {callType === "video" ? "Videochamada" : "Chamada de Voz"}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Avatar uri={contactAvatar} name={contactName} size={110} />
        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={[styles.callState, { color: callState === "active" ? colors.primary : "rgba(255,255,255,0.55)" }]}>
          {stateLabel}
        </Text>
        <View style={[styles.encryptedBadge, { backgroundColor: "rgba(200,169,81,0.15)", borderColor: colors.accent }]}>
          <Feather name="lock" size={11} color={colors.accent} />
          <Text style={[styles.encryptedText, { color: colors.accent }]}>Encriptado ponta a ponta</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {isIncoming && callState === "ringing" ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity onPress={handleReject} style={[styles.bigBtn, { backgroundColor: "#C62828" }]} activeOpacity={0.8}>
              <Feather name="phone-off" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAccept} style={[styles.bigBtn, { backgroundColor: "#2E7D32" }]} activeOpacity={0.8}>
              <Feather name="phone" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : callState === "ended" ? (
          <Text style={styles.endedText}>Chamada encerrada</Text>
        ) : (
          <>
            <View style={styles.secondaryControls}>
              <TouchableOpacity
                onPress={() => setMuted((m) => !m)}
                style={[styles.controlBtn, { backgroundColor: muted ? colors.primary : "rgba(255,255,255,0.1)" }]}
                activeOpacity={0.8}
              >
                <Feather name={muted ? "mic-off" : "mic"} size={22} color={muted ? colors.primaryForeground : "#fff"} />
                <Text style={[styles.controlLabel, { color: "rgba(255,255,255,0.7)" }]}>
                  {muted ? "Ativar mic" : "Silenciar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSpeakerOn((s) => !s)}
                style={[styles.controlBtn, { backgroundColor: speakerOn ? colors.primary : "rgba(255,255,255,0.1)" }]}
                activeOpacity={0.8}
              >
                <Feather name="volume-2" size={22} color={speakerOn ? colors.primaryForeground : "#fff"} />
                <Text style={[styles.controlLabel, { color: "rgba(255,255,255,0.7)" }]}>
                  {speakerOn ? "Auscultador" : "Altifalante"}
                </Text>
              </TouchableOpacity>
              {callType === "video" && (
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={22} color="#fff" />
                  <Text style={[styles.controlLabel, { color: "rgba(255,255,255,0.7)" }]}>Câmara</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleEnd} style={[styles.endCallBtn, { backgroundColor: "#C62828" }]} activeOpacity={0.8}>
              <Feather name="phone-off" size={28} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
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
    paddingBottom: 8,
  },
  callTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(200,169,81,0.1)",
  },
  callTypeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  avatarSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  contactName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  callState: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  encryptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  encryptedText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  controls: {
    paddingHorizontal: 24,
    gap: 24,
    alignItems: "center",
  },
  secondaryControls: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  controlLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  incomingControls: {
    flexDirection: "row",
    gap: 60,
    justifyContent: "center",
    marginTop: 20,
  },
  bigBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  endedText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
