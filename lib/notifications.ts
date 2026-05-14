import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_ID = 'macrovia-daily-reminder';
const WEEKLY_ID = 'macrovia-weekly-recap';

const KEY_DAILY = '@macrovia/notif_daily';
const KEY_WEEKLY = '@macrovia/notif_weekly';

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: 'Time to log your meals!',
      body: 'Track what you eat to stay on top of your goals.',
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

async function scheduleWeeklyRecap(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: {
      title: 'Check your weekly progress',
      body: 'See how you tracked your nutrition this week. Tap to view.',
      data: { screen: 'insights' },
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 8,
      minute: 0,
    },
  });
}

export type NotifPrefs = { daily: boolean; weekly: boolean };

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  const [d, w] = await AsyncStorage.multiGet([KEY_DAILY, KEY_WEEKLY]);
  // null means never explicitly set — treat as default-on
  const daily = d[1] !== 'false';
  const weekly = w[1] !== 'false';
  return { daily, weekly };
}

export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const prefs = await loadNotifPrefs();
    const granted = await requestPermission();
    if (!granted) return;
    if (prefs.daily) {
      await scheduleDailyReminder().catch(() => {});
    } else {
      await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
    }
    if (prefs.weekly) {
      await scheduleWeeklyRecap().catch(() => {});
    } else {
      await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
    }
  } catch {
    // native module not available in this environment
  }
}

export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_DAILY, enabled ? 'true' : 'false');
  if (Platform.OS === 'web') return;
  if (enabled) {
    const granted = await requestPermission();
    if (granted) await scheduleDailyReminder().catch(() => {});
  } else {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
  }
}

export async function setWeeklyRecapEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_WEEKLY, enabled ? 'true' : 'false');
  if (Platform.OS === 'web') return;
  if (enabled) {
    const granted = await requestPermission();
    if (granted) await scheduleWeeklyRecap().catch(() => {});
  } else {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  }
}
