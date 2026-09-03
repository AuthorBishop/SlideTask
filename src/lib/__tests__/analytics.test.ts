// 匿名身份与渠道归因（P0-1 / P0-2）单元验证
import { ANON_ID_KEY, CHANNEL_KEY, INSTALL_TS_KEY } from '@/lib/analytics';

// 内存版 settings 表，替代 SQLite
const mockStore: Record<string, string> = {};
const mockGetSetting = jest.fn(async (key: string) => mockStore[key] ?? null);
const mockSetSetting = jest.fn(async (key: string, value: string) => {
  mockStore[key] = value;
});

jest.mock('@/lib/database', () => ({
  getSetting: (key: string) => mockGetSetting(key),
  setSetting: (key: string, value: string) => mockSetSetting(key, value),
  newId: jest.fn(() => 'fixed-anon-id'),
}));

const {
  normalizeChannelCode,
  ensureIdentity,
  getAnonId,
  getInstallTs,
  getChannel,
  setChannel,
} = require('@/lib/analytics');

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  mockGetSetting.mockClear();
  mockSetSetting.mockClear();
});

describe('normalizeChannelCode — 口令码规范化', () => {
  it('去除首尾空白并转大写', () => {
    expect(normalizeChannelCode('  slide-a  ')).toBe('SLIDE-A');
  });

  it('保留字母数字与 - _，过滤其他字符', () => {
    expect(normalizeChannelCode('slide_a-1!@#')).toBe('SLIDE_A-1');
  });

  it('长度不足 2 位视为非法', () => {
    expect(normalizeChannelCode('A')).toBe('');
    expect(normalizeChannelCode('')).toBe('');
  });

  it('长度超过 32 位视为非法', () => {
    expect(normalizeChannelCode('A'.repeat(33))).toBe('');
    expect(normalizeChannelCode('A'.repeat(32))).toBe('A'.repeat(32));
  });

  it('纯中文等无有效字符时返回空', () => {
    expect(normalizeChannelCode('口令')).toBe('');
  });
});

describe('ensureIdentity — 匿名身份初始化', () => {
  it('首次调用生成并持久化匿名 ID 与安装时间', async () => {
    const { anonId, installTs } = await ensureIdentity();
    expect(anonId).toBe('fixed-anon-id');
    expect(installTs).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockStore[ANON_ID_KEY]).toBe('fixed-anon-id');
    expect(mockStore[INSTALL_TS_KEY]).toBe(installTs);
    expect(mockSetSetting).toHaveBeenCalledTimes(2);
  });

  it('重复调用不覆盖既有身份', async () => {
    mockStore[ANON_ID_KEY] = 'existing-id';
    mockStore[INSTALL_TS_KEY] = '2026-01-01T00:00:00.000Z';

    const { anonId, installTs } = await ensureIdentity();
    expect(anonId).toBe('existing-id');
    expect(installTs).toBe('2026-01-01T00:00:00.000Z');
    expect(mockSetSetting).not.toHaveBeenCalled();
  });
});

describe('渠道口令读写', () => {
  it('未设置时 getChannel 返回 null', async () => {
    await expect(getChannel()).resolves.toBeNull();
  });

  it('合法口令规范化后写入', async () => {
    const res = await setChannel('  slide-a  ');
    expect(res).toEqual({ ok: true, code: 'SLIDE-A' });
    expect(mockStore[CHANNEL_KEY]).toBe('SLIDE-A');
    await expect(getChannel()).resolves.toBe('SLIDE-A');
    await expect(getAnonId()).resolves.toBeNull();
    await expect(getInstallTs()).resolves.toBeNull();
  });

  it('非法口令不写入', async () => {
    const res = await setChannel('x');
    expect(res).toEqual({ ok: false, code: '' });
    expect(mockSetSetting).not.toHaveBeenCalled();
    await expect(getChannel()).resolves.toBeNull();
  });
});
