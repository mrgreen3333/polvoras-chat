import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  uri?: string;
  name: string;
  size?: number;
  showStatus?: boolean;
  status?: "online" | "away" | "offline";
};

export function Avatar({ uri, name, size = 44, showStatus = false, status = "offline" }: Props) {
  const colors = useColors();
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const statusColor =
    status === "online" ? colors.online :
    status === "away" ? colors.away :
    colors.offline;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { fontSize: size * 0.38, color: colors.accent },
            ]}
          >
            {initials || "?"}
          </Text>
        </View>
      )}
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: statusColor,
              borderColor: colors.background,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  initials: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statusDot: {
    position: "absolute",
    borderWidth: 2,
  },
});
