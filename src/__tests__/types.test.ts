/**
 * 单元测试：types/types.ts — TASK_COLORS 常量和类型验证
 */
import { TASK_COLORS } from '@/types/types';

describe('types — TASK_COLORS', () => {
  it('TASK_COLORS 是包含颜色字符串的数组', () => {
    expect(Array.isArray(TASK_COLORS)).toBe(true);
    expect(TASK_COLORS.length).toBeGreaterThan(0);
  });

  it('所有元素都是字符串', () => {
    for (const item of TASK_COLORS) {
      expect(typeof item).toBe('string');
    }
  });

  it('所有值都是有效的十六进制颜色 (以 # 开头)', () => {
    for (const color of TASK_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('所有颜色字符串非空', () => {
    for (const color of TASK_COLORS) {
      expect(color.length).toBeGreaterThan(0);
    }
  });

  it('颜色值不重复', () => {
    const unique = new Set(TASK_COLORS);
    expect(unique.size).toBe(TASK_COLORS.length);
  });

  it('至少包含 3 种颜色（用户有足够选择）', () => {
    expect(TASK_COLORS.length).toBeGreaterThanOrEqual(3);
  });

  it('第一个元素存在可作为默认颜色', () => {
    const first = TASK_COLORS[0];
    expect(first).toBeDefined();
    expect(typeof first).toBe('string');
  });

  it('颜色值格式严格符合 #RRGGBB（7 个字符）', () => {
    for (const color of TASK_COLORS) {
      expect(color.length).toBe(7);
      expect(color[0]).toBe('#');
    }
  });

  it('idx 0 为默认靛蓝色 #6366F1', () => {
    expect(TASK_COLORS[0]).toBe('#6366F1');
  });
});
