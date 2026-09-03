/**
 * 每日推进提醒（增长方案 P1-3）
 * 仅原生端有效（Web 端静默跳过），由用户在设置中主动开启，
 * 开启动作（Switch）天然构成请求权限所需的手势上下文。
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** 每日提醒默认时间：20:00 */
export const REMINDER_HOUR = 20;
export const REMINDER_MINUTE = 0;
const CHANNEL_ID = 'daily-reminder';

export function isReminderSupported(): boolean {
  return Platform.OS !== 'web';
}

/** Android 8+ 需要显式通知渠道，否则提醒不显示 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '每日提醒',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/** 请求通知权限（已授予则直接通过）；返回是否最终获得授权 */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isReminderSupported()) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** 开启并重排每日提醒（幂等：先清空本应用既有调度，避免重复堆积） */
export async function scheduleDailyReminder(): Promise<boolean> {
  if (!isReminderSupported()) return false;
  const granted = await requestReminderPermission();
  if (!granted) return false;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '今天推进了吗？',
      body: '拖动把手，把一个节点滑到底。',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

/** 关闭每日提醒 */
export async function cancelDailyReminder(): Promise<void> {
  if (!isReminderSupported()) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
