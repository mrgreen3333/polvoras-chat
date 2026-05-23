import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PermResult = { granted?: boolean; canAskAgain?: boolean };

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const existing = (await Notifications.getPermissionsAsync()) as PermResult;
  if (existing.granted) return true;
  const result = (await Notifications.requestPermissionsAsync()) as PermResult;
  return result.granted ?? false;
}

export async function sendLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
      sound: true,
    },
    trigger: null,
  });
}

export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setBadgeCountAsync(0);
}

export function addNotificationResponseListener(
  handler: (conversationId: string) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>;
    if (data?.conversationId) {
      handler(data.conversationId);
    }
  });
}
