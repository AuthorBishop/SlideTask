/**
 * 反馈设置快照桥：UI 侧（React state）与原生调用点（worklet / 普通函数）的同步层。
 * 触觉与音效的触发发生在手势 worklet 或非 React 上下文中，无法直接读取 React state，
 * 因此将最新设置写入此模块级快照，调用点读取它判断是否播放/震动。
 */
export type SoundPackId = 'A' | 'B' | 'C';

export const feedbackSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  soundPack: 'A' as SoundPackId,
};
