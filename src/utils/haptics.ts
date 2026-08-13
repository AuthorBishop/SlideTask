/**
 * 触觉反馈统一出口：调用前检查 hapticEnabled 开关。
 * - Android 走系统触感通道 View.performHapticFeedback()（Expo 官方推荐），不依赖 VIBRATE 权限
 * - iOS 走 Taptic Engine 的 impactAsync / notificationAsync
 * - Web/模拟器/平台不支持时静默忽略
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { feedbackSettings } from './feedbackSettings';

/** 跨节点点亮：轻触 */
export function hapticTick() {
  if (!feedbackSettings.hapticEnabled) return;
  try {
    if (Platform.OS === 'android') {
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // 平台不支持时忽略
  }
}

/** 完成任务：确认感 */
export function hapticSuccess() {
  if (!feedbackSettings.hapticEnabled) return;
  try {
    if (Platform.OS === 'android') {
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {
    // 平台不支持时忽略
  }
}
