/**
 * 单元测试：lib/utils.ts — cn() classname 合并函数
 */
import { cn } from '@/lib/utils';

describe('utils — cn()', () => {
  it('合并单个类名', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('合并多个字符串类名', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('过滤 falsy 值（null/undefined/false/空字符串）', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b');
  });

  it('条件性合并（条件为 true）', () => {
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('条件性合并（条件为 false）', () => {
    expect(cn('base', false && 'hidden')).toBe('base');
  });

  it('tailwind-merge 去重 （相同前缀的冲突类）', () => {
    // twMerge 应该保留最后一个冲突类
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('无参数返回空字符串', () => {
    expect(cn()).toBe('');
  });

  it('全为 falsy 时返回空字符串', () => {
    expect(cn(null, undefined, false)).toBe('');
  });

  it('处理 ClassValue 对象形式 (CVA 用法)', () => {
    const result = cn({ 'bg-red-500': true, 'text-white': false });
    expect(result).toBe('bg-red-500');
  });

  it('处理混合输入：字符串 + 条件 + 对象', () => {
    const result = cn('base', true && 'active', { 'disabled': false, 'hidden': true });
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).toContain('hidden');
    expect(result).not.toContain('disabled');
  });

  // --- 边界条件 ---
  it('处理极长类名列表', () => {
    const classes = Array.from({ length: 100 }, (_, i) => `cls-${i}`);
    const result = cn(...classes);
    expect(result).not.toBe('');
    // 至少第一个和最后一个应在结果中
    expect(result).toContain('cls-0');
    expect(result).toContain('cls-99');
  });

  it('处理含特殊字符的类名', () => {
    // tailwind 类名形如 w-1/2、hover:bg-red-500
    expect(cn('w-1/2', 'hover:bg-red-500')).toBe('w-1/2 hover:bg-red-500');
  });

  it('处理含中括号的类名 (arbitrary values)', () => {
    expect(cn('w-[100px]', 'h-[calc(100vh-1rem)]')).toBe('w-[100px] h-[calc(100vh-1rem)]');
  });
});
