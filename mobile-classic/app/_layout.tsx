import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SocketProvider, useSocket } from "@/context/SocketContext";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import {
  requestNotificationPermissions,
  addNotificationResponseListener,
} from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function CallInterceptor() {
  const router = useRouter();
  const { onCallOffer } = useSocket();

  useEffect(() => {
    const unsub = onCallOffer((data) => {
      router.push({
        pathname: "/call/[id]",
        params: {
          id: data.from,
          type: data.callType ?? "voice",
          incoming: "1",
          callerName: data.fromName,
          callerAvatar: data.fromAvatar ?? "",
        },
      });
    });
    return unsub;
  }, [onCallOffer, router]);

  return null;
}

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    requestNotificationPermissions();

    const sub = addNotificationResponseListener((conversationId) => {
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId },
      });
    });

    return () => sub.remove();
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <CallInterceptor />
      <NotificationHandler />
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="call/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="invite" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <AuthProvider>
              <ChatProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </ChatProvider>
            </AuthProvider>
          </SocketProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
