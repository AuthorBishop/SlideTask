// 每日推进提醒（P1-3）单元验证：expo-notifications 由 jest.setup.js 全局 mock
import * as Notifications from 'expo-notifications';
import {
  isReminderSupported,
  requestReminderPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  REMINDER_HOUR,
  REMINDER_MINUTE,
} from '@/utils/reminder';

describe('isReminderSupported', () => {
  it('原生端返回 true（jest 平台非 web）', () => {
    expect(isReminderSupported()).toBe(true);
  });
});

describe('requestReminderPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('已授权时直接通过、不再弹窗', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });
    await expect(requestReminderPermission()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('未授权时请求授权并按结果返回', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });
    await expect(requestReminderPermission()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});

describe('scheduleDailyReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('授权后先清空既有调度再排定每日 20:00 提醒', async () => {
    await expect(scheduleDailyReminder()).resolves.toBe(true);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: expect.any(String), body: expect.any(String) }),
        trigger: expect.objectContaining({
          hour: REMINDER_HOUR,
          minute: REMINDER_MINUTE,
        }),
      })
    );
  });

  it('权限被拒时不调度并返回 false', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    await expect(scheduleDailyReminder()).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelDailyReminder', () => {
  it('清理全部已调度通知', async () => {
    await cancelDailyReminder();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});
