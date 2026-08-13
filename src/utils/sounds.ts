/**
 * 轻量音效管理器：预加载 3 套音效（A/B/C），按设置播放，支持快速重入与就绪等待。
 * - 模块加载即 preload 全部音源（下载+解码提前完成，消除首响滞后）
 * - 播放前检查 soundEnabled 开关（force=true 可绕过，用于设置页试听）
 * - 未就绪（isLoaded=false）时轮询等待，保证"操作瞬间发声"
 * - 所有调用均容错，音频不可用时静默降级
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  preload,
  type AudioPlayer,
} from 'expo-audio';
import { feedbackSettings, type SoundPackId } from './feedbackSettings';

type PackSource = { tick: unknown; done: unknown };

const PACK_SOURCES: Record<SoundPackId, PackSource> = {
  A: {
    tick: require('../../assets/sounds/tick-a.wav'),
    done: require('../../assets/sounds/done-a.wav'),
  },
  B: {
    tick: require('../../assets/sounds/tick-b.wav'),
    done: require('../../assets/sounds/done-b.wav'),
  },
  C: {
    tick: require('../../assets/sounds/tick-c.wav'),
    done: require('../../assets/sounds/done-c.wav'),
  },
};

type PackPlayers = { tick: AudioPlayer; done: AudioPlayer };

const players: Partial<Record<SoundPackId, PackPlayers>> = {};
let ready = false;
let initPromise: Promise<void> | null = null;

// 模块加载即预加载全部音源，消除首次播放的下载/解码延迟
try {
  for (const pack of Object.values(PACK_SOURCES)) {
    preload(pack.tick).catch(() => {});
    preload(pack.done).catch(() => {});
  }
} catch {
  // 预加载失败不影响后续容错路径
}

/** 幂等初始化：配置音频模式并创建各方案播放器 */
function ensureReady(): Promise<void> {
  if (ready) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
      for (const id of Object.keys(PACK_SOURCES) as SoundPackId[]) {
        const src = PACK_SOURCES[id];
        const tick = createAudioPlayer(src.tick);
        const done = createAudioPlayer(src.done);
        tick.volume = 0.35;
        done.volume = 0.45;
        players[id] = { tick, done };
      }
      ready = true;
    } catch {
      // 音频子系统不可用时降级为静默
    }
  })();
  return initPromise;
}

/** 当前设置对应的播放器；force=true（设置页试听）可绕过开关 */
function playerFor(kind: 'tick' | 'done', force = false): AudioPlayer | null {
  if (!force && !feedbackSettings.soundEnabled) return null;
  return players[feedbackSettings.soundPack]?.[kind] ?? null;
}

/** 重置到开头并播放（快速连续跨节点的重入） */
function replay(player: AudioPlayer) {
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // 播放失败静默忽略
  }
}

/** 等待音频就绪后播放；超时兜底避免永久等待 */
function playWhenReady(player: AudioPlayer | null, elapsed = 0) {
  if (!player) return;
  try {
    if (player.isLoaded) {
      replay(player);
      return;
    }
  } catch {
    return;
  }
  if (elapsed >= 1200) return; // 1.2s 超时，放弃本次播放
  setTimeout(() => playWhenReady(player, elapsed + 50), 50);
}

/** 点亮节点的短促"咔哒"声（force 用于设置页试听，绕过开关） */
export function playTick(force = false) {
  ensureReady().then(() => playWhenReady(playerFor('tick', force)));
}

/** 完成任务的明亮"叮"声（force 用于设置页试听，绕过开关） */
export function playDone(force = false) {
  ensureReady().then(() => playWhenReady(playerFor('done', force)));
}

/** App 启动预热：确保音频模式与播放器已就绪 */
export function preloadSounds(): Promise<void> {
  return ensureReady();
}
