import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤔","🤐","😶","😑","😬","🙄","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤫","🤭","😇","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    label: "Gestures",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☯️","🔥","💯","💢","💥","💫","💦","💨","🌪️","💬","💭","💤"],
  },
  {
    label: "Nature",
    emojis: ["🌿","🍃","🌱","🌾","☘️","🍀","🌵","🌲","🌳","🌴","🪴","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","⭐","🌟","💫","✨","☄️","🔥","💧","🌊","🦁","🐯","🦊","🐻","🐼","🐨","🐸","🦋","🐝","🌿"],
  },
  {
    label: "Cannabis",
    emojis: ["🌿","🍃","🌱","💚","🔥","💨","✨","🌟","💫","🎋","🌾","🍀","☘️","🌲","🌳","🦁","👑","💎","🔮","⚗️","🧪","🌡️","⚡","🌀","🎯","🎲","🎭","🎪","🎨"],
  },
];

type Props = {
  onSelect: (emoji: string) => void;
};

export function EmojiPicker({ onSelect }: Props) {
  const colors = useColors();
  const [activeCategory, setActiveCategory] = useState(0);
  const current = EMOJI_CATEGORIES[activeCategory];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={cat.label}
            onPress={() => setActiveCategory(i)}
            style={[
              styles.tab,
              activeCategory === i && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text style={[styles.tabLabel, { color: activeCategory === i ? colors.primary : colors.mutedForeground }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={current.emojis}
        keyExtractor={(item) => item}
        numColumns={8}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={styles.emojiCell}
            activeOpacity={0.6}
          >
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        )}
        style={styles.grid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderTopWidth: 1,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginRight: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  grid: {
    flex: 1,
    padding: 8,
  },
  emojiCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "12.5%",
  },
  emoji: {
    fontSize: 24,
  },
});
