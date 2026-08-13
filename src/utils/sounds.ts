/**
 * 轻量音效管理器：预加载 tick/done 两个短音效，支持快速重入播放。
 * 所有调用均容错，音频不可用（Web 受限、模块缺失等）时静默降级。
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let tickPlayer: AudioPlayer | null = null;
let donePlayer: AudioPlayer | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;

/** 幂等初始化：配置音频模式并创建播放器（延迟到首次调用） */
function ensureReady(): Promise<void> {
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await setAudioModeAsync({
        // iOS 静音键下也播放（与震动反馈配套，符合"操作反馈"预期）
        playsInSilentMode: true,
        // 不抢占系统音频焦点，与音乐/视频共存
        interruptionMode: 'mixWithOthers',
      });
      tickPlayer = createAudioPlayer(require('../../assets/sounds/tick.wav'));
      donePlayer = createAudioPlayer(require('../../assets/sounds/done.wav'));
      if (tickPlayer) tickPlayer.volume = 0.35;
      if (donePlayer) donePlayer.volume = 0.45;
      ready = true;
    } catch {
      // 音频子系统不可用时降级为静默
    }
  })();
  return initPromise;
}

/** 重置到开头并播放，实现快速连续跨节点的重入 */
function replay(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // 播放失败静默忽略
  }
}

/** 点亮节点的短促"咔哒"声 */
export function playTick() {
  ensureReady().then(() => replay(tickPlayer));
}

/** 完成任务的明亮"叮"声 */
export function playDone() {
  ensureReady().then(() => replay(donePlayer));
}
