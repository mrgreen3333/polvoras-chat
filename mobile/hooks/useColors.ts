import colors from "@/constants/colors";

export function useColors() {
  // App is dark-only — always return dark theme
  const palette = colors.dark;
  return { ...palette, radius: colors.radius };
}
