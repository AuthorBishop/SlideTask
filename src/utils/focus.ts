/**
 * 今日焦点（每日只做一件）数据读写
 * 存储于 settings 键值表：focus_date（YYYY-MM-DD）+ focus_task_id + focus_mode
 * focus_mode 标记"单任务专注模式"开关，跟随今日焦点，日期跨天自动视为过期，读取时懒清理
 */
import { getSetting, setSetting } from '@/lib/database';
import { fetchTaskById } from '@/db/api';
import { TaskWithNodes } from '@/types/types';

const FOCUS_DATE_KEY = 'focus_date';
const FOCUS_TASK_ID_KEY = 'focus_task_id';
const FOCUS_MODE_KEY = 'focus_mode';

/** 本地日期 YYYY-MM-DD */
export function todayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 读取今日焦点任务。
 * - 焦点日期不是今天 → 懒清除旧焦点并返回 null
 * - 任务不存在或已完成 → 返回 null（视为无焦点）
 */
export async function getTodayFocus(): Promise<TaskWithNodes | null> {
  const [date, taskId] = await Promise.all([
    getSetting(FOCUS_DATE_KEY),
    getSetting(FOCUS_TASK_ID_KEY),
  ]);
  if (!date || !taskId || date !== todayString()) {
    if (date && taskId) {
      await Promise.all([
        setSetting(FOCUS_DATE_KEY, ''),
        setSetting(FOCUS_TASK_ID_KEY, ''),
        setSetting(FOCUS_MODE_KEY, ''),
      ]);
    }
    return null;
  }

  const task = await fetchTaskById(taskId);
  if (!task || task.completed_at) {
    // 任务不存在或已完成：焦点失效，同步关闭专注模式
    await Promise.all([
      setSetting(FOCUS_DATE_KEY, ''),
      setSetting(FOCUS_TASK_ID_KEY, ''),
      setSetting(FOCUS_MODE_KEY, ''),
    ]);
    return null;
  }
  return task;
}

/** 将某任务设为今日焦点 */
export async function setTodayFocus(taskId: string): Promise<void> {
  await Promise.all([
    setSetting(FOCUS_DATE_KEY, todayString()),
    setSetting(FOCUS_TASK_ID_KEY, taskId),
  ]);
}

/** 清除今日焦点 */
export async function clearTodayFocus(): Promise<void> {
  await Promise.all([
    setSetting(FOCUS_DATE_KEY, ''),
    setSetting(FOCUS_TASK_ID_KEY, ''),
    setSetting(FOCUS_MODE_KEY, ''),
  ]);
}

/** 是否处于单任务专注模式 */
export async function getFocusMode(): Promise<boolean> {
  const v = await getSetting(FOCUS_MODE_KEY);
  return v === '1';
}

/** 开启 / 关闭单任务专注模式 */
export async function setFocusMode(on: boolean): Promise<void> {
  await setSetting(FOCUS_MODE_KEY, on ? '1' : '');
}
