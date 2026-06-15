import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Alert, Platform } from 'react-native';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 跨平台确认弹窗
 * Web 端使用 window.confirm，原生端使用 Alert.alert
 */
export function showConfirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel', onPress: () => resolve(false) },
      { text: '确认', onPress: () => resolve(true) },
    ]);
  });
}
