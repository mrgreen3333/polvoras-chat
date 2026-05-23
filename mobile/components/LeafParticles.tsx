import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

const LEAF_VARIANTS = ["🌿", "🍃", "🌱", "🍀", "☘️"];
const LEAF_COUNT = 14;

type LeafConfig = {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  variant: string;
  drift: number;
};

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const LEAVES: LeafConfig[] = Array.from({ length: LEAF_COUNT }, (_, i) => ({
  id: i,
  x: randomBetween(0, SW - 40),
  size: randomBetween(14, 26),
  duration: randomBetween(8000, 18000),
  delay: randomBetween(0, 12000),
  variant: LEAF_VARIANTS[i % LEAF_VARIANTS.length],
  drift: randomBetween(-30, 30),
}));

function Leaf({ config }: { config: LeafConfig }) {
  const animY = useRef(new Animated.Value(SH + 60)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      animY.setValue(SH + 60);
      animOpacity.setValue(0);
      animRotate.setValue(0);
      animX.setValue(0);

      Animated.sequence([
        Animated.delay(config.delay),
        Animated.parallel([
          Animated.timing(animY, {
            toValue: -80,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(animX, {
            toValue: config.drift,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(animRotate, {
            toValue: 1,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(animOpacity, {
              toValue: 0.55,
              duration: config.duration * 0.15,
              useNativeDriver: true,
            }),
            Animated.timing(animOpacity, {
              toValue: 0.45,
              duration: config.duration * 0.7,
              useNativeDriver: true,
            }),
            Animated.timing(animOpacity, {
              toValue: 0,
              duration: config.duration * 0.15,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => loop());
    };
    loop();
  }, []);

  const rotate = animRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${config.drift > 0 ? 360 : -360}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.leaf,
        {
          left: config.x,
          transform: [
            { translateY: animY },
            { translateX: animX },
            { rotate },
          ],
          opacity: animOpacity,
          pointerEvents: "none",
        },
      ]}
    >
      <Text style={{ fontSize: config.size }}>{config.variant}</Text>
    </Animated.View>
  );
}

type Props = {
  intensity?: "low" | "medium" | "high";
};

export function LeafParticles({ intensity = "medium" }: Props) {
  const count =
    intensity === "low" ? 5 : intensity === "high" ? LEAF_COUNT : Math.floor(LEAF_COUNT * 0.65);
  const leaves = LEAVES.slice(0, count);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {leaves.map((leaf) => (
        <Leaf key={leaf.id} config={leaf} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: "absolute",
  },
});
