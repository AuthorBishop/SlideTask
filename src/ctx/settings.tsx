/**
 * 全局反馈设置：音效开关、触感开关、音效方案。
 * 持久化到 SQLite settings 表，同时写入 feedbackSettings 快照桥供原生调用点读取。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSetting, setSetting } from '@/lib/database';
import { feedbackSettings, type SoundPackId } from '@/utils/feedbackSettings';
import { scheduleDailyReminder, cancelDailyReminder } from '@/utils/reminder';

const KEYS = {
  sound: 'feedback_sound_enabled',
  haptic: 'feedback_haptic_enabled',
  pack: 'feedback_sound_pack',
  reminder: 'reminder_enabled',
} as const;

export type SoundPackOption = {
  id: SoundPackId;
  label: string;
  desc: string;
};

export const SOUND_PACK_OPTIONS: SoundPackOption[] = [
  { id: 'A', label: '清脆', desc: '明亮短促，节奏感强' },
  { id: 'B', label: '木鱼', desc: '高亢干脆，安静沉稳' },
  { id: 'C', label: '柔和', desc: '低频绵长，温和不刺耳' },
];

type SettingsContextType = {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  soundPack: SoundPackId;
  setSoundEnabled: (v: boolean) => void;
  setHapticEnabled: (v: boolean) => void;
  setSoundPack: (v: SoundPackId) => void;
  reminderEnabled: boolean;
  setReminderEnabled: (v: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticEnabled, setHapticEnabledState] = useState(true);
  const [soundPack, setSoundPackState] = useState<SoundPackId>('A');
  const [reminderEnabled, setReminderEnabledState] = useState(false);

  // 从 SQLite 读取持久化设置
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, h, p, r] = await Promise.all([
          getSetting(KEYS.sound),
          getSetting(KEYS.haptic),
          getSetting(KEYS.pack),
          getSetting(KEYS.reminder),
        ]);
        if (!active) return;
        if (s !== null) setSoundEnabledState(s !== '0');
        if (h !== null) setHapticEnabledState(h !== '0');
        if (p === 'B' || p === 'C') setSoundPackState(p);
        if (r !== null) setReminderEnabledState(r !== '0');
      } catch {
        // 读取失败使用默认值
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 同步快照桥（worklet / 原生调用点读取最新值）
  useEffect(() => {
    feedbackSettings.soundEnabled = soundEnabled;
    feedbackSettings.hapticEnabled = hapticEnabled;
    feedbackSettings.soundPack = soundPack;
  }, [soundEnabled, hapticEnabled, soundPack]);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    setSetting(KEYS.sound, v ? '1' : '0').catch(() => {});
  }, []);

  const setHapticEnabled = useCallback((v: boolean) => {
    setHapticEnabledState(v);
    setSetting(KEYS.haptic, v ? '1' : '0').catch(() => {});
  }, []);

  const setSoundPack = useCallback((v: SoundPackId) => {
    setSoundPackState(v);
    setSetting(KEYS.pack, v).catch(() => {});
  }, []);

  // 每日提醒：开启需获得系统通知权限（由设置页 Switch 手势触发）；权限被拒则回落关闭
  const setReminderEnabled = useCallback(async (v: boolean) => {
    if (!v) {
      setReminderEnabledState(false);
      setSetting(KEYS.reminder, '0').catch(() => {});
      cancelDailyReminder().catch(() => {});
      return;
    }
    const ok = await scheduleDailyReminder();
    if (!ok) {
      setReminderEnabledState(false);
      setSetting(KEYS.reminder, '0').catch(() => {});
      return;
    }
    setReminderEnabledState(true);
    setSetting(KEYS.reminder, '1').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      soundEnabled,
      hapticEnabled,
      soundPack,
      reminderEnabled,
      setSoundEnabled,
      setHapticEnabled,
      setSoundPack,
      setReminderEnabled,
    }),
    [soundEnabled, hapticEnabled, soundPack, reminderEnabled, setSoundEnabled, setHapticEnabled, setSoundPack, setReminderEnabled]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
