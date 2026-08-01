/**
 * 单元测试：lib/theme.ts — 主题常量验证
 *
 * 实际导出：THEME（含 light/dark）、NAV_THEME（react-navigation Theme 格式）
 */
import { THEME, NAV_THEME } from '@/lib/theme';

describe('theme — THEME', () => {
  it('THEME 包含 light 和 dark 键', () => {
    expect(THEME).toHaveProperty('light');
    expect(THEME).toHaveProperty('dark');
  });

  it('THEME.light 包含基本颜色键', () => {
    expect(THEME.light).toHaveProperty('background');
    expect(THEME.light).toHaveProperty('foreground');
    expect(THEME.light).toHaveProperty('primary');
    expect(THEME.light).toHaveProperty('secondary');
    expect(THEME.light).toHaveProperty('muted');
    expect(THEME.light).toHaveProperty('destructive');
    expect(THEME.light).toHaveProperty('border');
    expect(THEME.light).toHaveProperty('input');
    expect(THEME.light).toHaveProperty('ring');
  });

  it('THEME.dark 包含基本颜色键', () => {
    expect(THEME.dark).toHaveProperty('background');
    expect(THEME.dark).toHaveProperty('foreground');
    expect(THEME.dark).toHaveProperty('primary');
    expect(THEME.dark).toHaveProperty('secondary');
    expect(THEME.dark).toHaveProperty('muted');
    expect(THEME.dark).toHaveProperty('destructive');
    expect(THEME.dark).toHaveProperty('border');
    expect(THEME.dark).toHaveProperty('input');
    expect(THEME.dark).toHaveProperty('ring');
  });

  it('light/dark 颜色键完全一致', () => {
    const lightKeys = Object.keys(THEME.light).sort();
    const darkKeys = Object.keys(THEME.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  // --- 边界条件 ---
  it('THEME.light 所有值都是非空字符串', () => {
    for (const [key, value] of Object.entries(THEME.light)) {
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it('THEME.dark 所有值都是非空字符串', () => {
    for (const [key, value] of Object.entries(THEME.dark)) {
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it('THEME.light background 为白色', () => {
    expect(THEME.light.background).toBe('hsl(0 0% 100%)');
  });

  it('THEME.dark background 为深色', () => {
    expect(THEME.dark.background).toBe('hsl(0 0% 3.9%)');
  });
});

describe('theme — NAV_THEME', () => {
  it('NAV_THEME 包含 light 和 dark 键', () => {
    expect(NAV_THEME).toHaveProperty('light');
    expect(NAV_THEME).toHaveProperty('dark');
  });

  it('NAV_THEME.light 包含 react-navigation 标准颜色键', () => {
    const light = NAV_THEME.light;
    expect(light).toHaveProperty('colors');
    const c = light.colors as Record<string, string>;
    expect(c).toHaveProperty('primary');
    expect(c).toHaveProperty('background');
    expect(c).toHaveProperty('card');
    expect(c).toHaveProperty('text');
    expect(c).toHaveProperty('border');
    expect(c).toHaveProperty('notification');
  });

  it('NAV_THEME.dark 包含 react-navigation 标准颜色键', () => {
    const dark = NAV_THEME.dark;
    expect(dark).toHaveProperty('colors');
    const c = dark.colors as Record<string, string>;
    expect(c).toHaveProperty('primary');
    expect(c).toHaveProperty('background');
    expect(c).toHaveProperty('card');
    expect(c).toHaveProperty('text');
    expect(c).toHaveProperty('border');
    expect(c).toHaveProperty('notification');
  });

  it('NAV_THEME.light dark 属性为 false', () => {
    expect(NAV_THEME.light.dark).toBe(false);
  });

  it('NAV_THEME.dark dark 属性为 true', () => {
    expect(NAV_THEME.dark.dark).toBe(true);
  });

  it('NAV_THEME.light.colors 颜色引用自 THEME.light', () => {
    expect(NAV_THEME.light.colors.background).toBe(THEME.light.background);
    expect(NAV_THEME.light.colors.primary).toBe(THEME.light.primary);
    expect(NAV_THEME.light.colors.border).toBe(THEME.light.border);
  });
});
