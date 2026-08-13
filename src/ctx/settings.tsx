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

const KEYS = {
  sound: 'feedback_sound_enabled',
  haptic: 'feedback_haptic_enabled',
  pack: 'feedback_sound_pack',
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
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticEnabled, setHapticEnabledState] = useState(true);
  const [soundPack, setSoundPackState] = useState<SoundPackId>('A');

  // 从 SQLite 读取持久化设置
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, h, p] = await Promise.all([
          getSetting(KEYS.sound),
          getSetting(KEYS.haptic),
          getSetting(KEYS.pack),
        ]);
        if (!active) return;
        if (s !== null) setSoundEnabledState(s !== '0');
        if (h !== null) setHapticEnabledState(h !== '0');
        if (p === 'B' || p === 'C') setSoundPackState(p);
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

  const value = useMemo(
    () => ({ soundEnabled, hapticEnabled, soundPack, setSoundEnabled, setHapticEnabled, setSoundPack }),
    [soundEnabled, hapticEnabled, soundPack, setSoundEnabled, setHapticEnabled, setSoundPack]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
