/**
 * 匿名身份与渠道归因（增长方案 P0-1 / P0-2）
 *
 * 现阶段纯本地存储（settings 表），不做网络上报；
 * P0-3 接入 Cloudflare Worker 后，这里作为唯一的上报数据源出口。
 */
import { getSetting, setSetting, newId } from '@/lib/database';

export const ANON_ID_KEY = 'anon_id';
export const INSTALL_TS_KEY = 'install_ts';
export const CHANNEL_KEY = 'channel';

/** 渠道口令码长度限制 */
const CODE_MIN_LEN = 2;
const CODE_MAX_LEN = 32;

/**
 * 规范化渠道口令码：去首尾空白、转大写、仅保留字母数字与 - _
 * 非法（过短/过长/规范化后为空）返回空字符串
 */
export function normalizeChannelCode(input: string): string {
  const code = input.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (code.length < CODE_MIN_LEN || code.length > CODE_MAX_LEN) return '';
  return code;
}

/**
 * 首次启动初始化身份：生成并持久化匿名 ID 与安装时间。
 * 已存在时不覆盖（保证卸载前 ID 稳定，重装因数据清空自然生成新 ID）。
 */
export async function ensureIdentity(): Promise<{ anonId: string; installTs: string }> {
  let anonId = await getSetting(ANON_ID_KEY);
  let installTs = await getSetting(INSTALL_TS_KEY);

  if (!anonId) {
    anonId = newId();
    await setSetting(ANON_ID_KEY, anonId);
  }
  if (!installTs) {
    installTs = new Date().toISOString();
    await setSetting(INSTALL_TS_KEY, installTs);
  }

  return { anonId, installTs };
}

/** 匿名 ID（未初始化时返回 null） */
export async function getAnonId(): Promise<string | null> {
  return getSetting(ANON_ID_KEY);
}

/** 首次打开时间（ISO 字符串，留存 day_index 的计算锚点） */
export async function getInstallTs(): Promise<string | null> {
  return getSetting(INSTALL_TS_KEY);
}

/** 当前渠道口令码（未设置返回 null） */
export async function getChannel(): Promise<string | null> {
  return getSetting(CHANNEL_KEY);
}

/**
 * 设置渠道口令码
 * @returns ok=true 表示已写入（code 为规范化后的值）；ok=false 表示口令非法，未写入
 */
export async function setChannel(raw: string): Promise<{ ok: boolean; code: string }> {
  const code = normalizeChannelCode(raw);
  if (!code) return { ok: false, code: '' };
  await setSetting(CHANNEL_KEY, code);
  return { ok: true, code };
}
