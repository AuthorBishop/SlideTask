import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

/** 5 档字体大小：0=小, 1=较小, 2=标准, 3=较大, 4=大 */
export const FONT_SIZE_LEVELS = [11, 12, 13, 15, 17] as const;
export const FONT_SIZE_LABELS = ['小', '较小', '标准', '较大', '大'] as const;

type FontSizeContextType = {
  level: number;
  fontSize: number;
  label: string;
  nextLevel: () => void;
  setLevel: (l: number) => void;
};

const FontSizeContext = createContext<FontSizeContextType>({
  level: 2,
  fontSize: 13,
  label: '标准',
  nextLevel: () => {},
  setLevel: () => {},
});

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState(2); // 默认标准

  const nextLevel = useCallback(() => {
    setLevelState((prev) => (prev + 1) % FONT_SIZE_LEVELS.length);
  }, []);

  const setLevel = useCallback((l: number) => {
    const clamped = Math.max(0, Math.min(FONT_SIZE_LEVELS.length - 1, l));
    setLevelState(clamped);
  }, []);

  return (
    <FontSizeContext.Provider
      value={{
        level,
        fontSize: FONT_SIZE_LEVELS[level],
        label: FONT_SIZE_LABELS[level],
        nextLevel,
        setLevel,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
