import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/context/ChatContext";

type Props = {
  message: Message;
  isSent: boolean;
  onLongPress?: (message: Message) => void;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function ChatBubble({ message, isSent, onLongPress }: Props) {
  const colors = useColors();

  if (message.deleted) {
    return (
      <View style={[styles.row, isSent && styles.rowRight]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.muted,
              borderRadius: colors.radius,
              maxWidth: "75%",
            },
          ]}
        >
          <Text style={[styles.deletedText, { color: colors.mutedForeground }]}>
            Mensagem apagada
          </Text>
        </View>
      </View>
    );
  }

  const bgColor = isSent ? colors.bubbleSent : colors.bubbleReceived;

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress?.(message)}
      activeOpacity={0.85}
      style={[styles.row, isSent && styles.rowRight]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bgColor,
            borderRadius: colors.radius,
            borderBottomRightRadius: isSent ? 4 : colors.radius,
            borderBottomLeftRadius: isSent ? colors.radius : 4,
            maxWidth: "75%",
          },
        ]}
      >
        {message.type === "image" ? (
          <View>
            <Image
              source={{ uri: message.content }}
              style={[styles.mediaImage, { borderRadius: colors.radius - 4 }]}
              resizeMode="cover"
            />
            <View style={styles.mediaMeta}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {formatTime(message.timestamp)}
              </Text>
              {isSent && (
                <Feather name="check-circle" size={12} color={colors.mutedForeground} />
              )}
            </View>
          </View>
        ) : message.type === "video" ? (
          <View>
            <View style={[styles.videoBubble, { borderRadius: colors.radius - 4, backgroundColor: colors.card }]}>
              <Feather name="video" size={32} color={colors.primary} />
              <Text style={[styles.videoLabel, { color: colors.foreground }]}>Vídeo</Text>
            </View>
            <View style={styles.mediaMeta}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.textContent}>
            <Text style={[styles.text, { color: colors.foreground }]}>
              {message.content}
            </Text>
            <View style={styles.meta}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {formatTime(message.timestamp)}
              </Text>
              {isSent && (
                <Feather
                  name={message.read ? "check-circle" : "check"}
                  size={12}
                  color={message.read ? colors.primary : colors.mutedForeground}
                />
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 2,
    marginHorizontal: 12,
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  textContent: {
    gap: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  deletedText: {
    fontSize: 13,
    fontStyle: "italic",
    fontFamily: "Inter_400Regular",
  },
  mediaImage: {
    width: 220,
    height: 200,
  },
  videoBubble: {
    width: 220,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  mediaMeta: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
