import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

type AudioOptions = {
  volume?: number;
  onEnded?: () => void;
};

type LoopSource = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type WindowWithWebAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const AUDIO_EXTENSIONS = ['ogg', 'wav'] as const;

export class AudioManager {
  private static context?: AudioContext;
  private static masterGain?: GainNode;
  private static unlocked = false;
  private static muted = false;
  private static buffers = new Map<string, AudioBuffer | null>();
  private static bufferPromises = new Map<string, Promise<AudioBuffer | undefined>>();
  private static loops = new Map<string, LoopSource>();
  private static oneShots = new Map<string, Set<LoopSource>>();
  private static startingLoops = new Set<string>();
  private static pendingLoops = new Map<string, AudioOptions>();

  constructor(private readonly scene: Phaser.Scene) {}

  static installSceneControls(scene: Phaser.Scene): void {
    const keyboard = scene.input.keyboard;

    const unlock = (): void => {
      void AudioManager.unlock();
    };
    scene.input.once(Phaser.Input.Events.POINTER_DOWN, unlock);
    keyboard?.once('keydown', unlock);

    const muteHandler = (): void => {
      AudioManager.setMuted(!AudioManager.muted);
      AudioManager.showMuteToast(scene);
    };
    keyboard?.on('keydown-M', muteHandler);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, unlock);
      keyboard?.off('keydown', unlock);
      keyboard?.off('keydown-M', muteHandler);
    });
  }

  static async unlock(): Promise<void> {
    AudioManager.unlocked = true;
    const context = AudioManager.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        return;
      }
    }

    for (const [key, options] of AudioManager.pendingLoops) {
      AudioManager.pendingLoops.delete(key);
      AudioManager.startLoop(key, options);
    }
  }

  play(key: string, options: AudioOptions = {}): Promise<boolean> {
    if (!AudioManager.unlocked) {
      return Promise.resolve(false);
    }
    return AudioManager.start(key, { ...options, loop: false });
  }

  loop(key: string, options: AudioOptions = {}): void {
    if (
      AudioManager.loops.has(key) ||
      AudioManager.startingLoops.has(key) ||
      AudioManager.pendingLoops.has(key)
    ) {
      return;
    }
    if (!AudioManager.unlocked) {
      AudioManager.pendingLoops.set(key, options);
      return;
    }
    AudioManager.startLoop(key, options);
  }

  stop(key: string): void {
    AudioManager.pendingLoops.delete(key);
    AudioManager.startingLoops.delete(key);
    AudioManager.stopLoop(key);
    AudioManager.stopOneShots(key);
  }

  isLooping(key: string): boolean {
    return (
      AudioManager.loops.has(key) ||
      AudioManager.startingLoops.has(key) ||
      AudioManager.pendingLoops.has(key)
    );
  }

  private static ensureContext(): AudioContext | undefined {
    if (AudioManager.context) {
      return AudioManager.context;
    }

    const audioWindow = window as WindowWithWebAudio;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }

    const context = new AudioContextConstructor();
    const masterGain = context.createGain();
    masterGain.gain.value = AudioManager.muted ? 0 : 1;
    masterGain.connect(context.destination);
    AudioManager.context = context;
    AudioManager.masterGain = masterGain;
    return context;
  }

  private static setMuted(muted: boolean): void {
    AudioManager.muted = muted;
    if (AudioManager.masterGain) {
      AudioManager.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  private static showMuteToast(scene: Phaser.Scene): void {
    const toast = scene.add
      .text(GAME_WIDTH / 2, 28, AudioManager.muted ? 'SOUND OFF' : 'SOUND ON', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f6d743',
        backgroundColor: '#090a14',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5000);

    scene.tweens.add({
      targets: toast,
      alpha: 0,
      duration: 520,
      delay: 520,
      onComplete: () => toast.destroy(),
    });
  }

  private static async start(
    key: string,
    options: AudioOptions & { loop: boolean },
  ): Promise<boolean> {
    const context = AudioManager.ensureContext();
    if (!context) {
      return false;
    }
    const buffer = await AudioManager.getBuffer(key);
    if (!buffer) {
      return false;
    }
    if (options.loop && !AudioManager.startingLoops.has(key)) {
      return false;
    }

    if (options.loop) {
      AudioManager.stopLoop(key);
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = options.loop;
    gain.gain.value = options.volume ?? 1;
    source.connect(gain);
    gain.connect(AudioManager.masterGain ?? context.destination);

    const active = { source, gain };
    let cleanedUp = false;
    const cleanup = (runCallback: boolean): void => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      if (options.loop) {
        if (AudioManager.loops.get(key)?.source === source) {
          AudioManager.loops.delete(key);
        }
      } else {
        const sounds = AudioManager.oneShots.get(key);
        sounds?.delete(active);
        if (sounds?.size === 0) {
          AudioManager.oneShots.delete(key);
        }
      }
      try {
        gain.disconnect();
      } catch {
        // A gain node can already be disconnected by a manual stop.
      }
      if (runCallback) {
        options.onEnded?.();
      }
    };

    if (options.loop) {
      AudioManager.loops.set(key, active);
      source.onended = () => {
        cleanup(false);
      };
    } else {
      const sounds = AudioManager.oneShots.get(key) ?? new Set<LoopSource>();
      sounds.add(active);
      AudioManager.oneShots.set(key, sounds);
      source.onended = () => {
        cleanup(true);
      };
    }

    try {
      source.start();
      return true;
    } catch {
      cleanup(false);
      return false;
    }
  }

  private static startLoop(key: string, options: AudioOptions): void {
    AudioManager.startingLoops.add(key);
    void AudioManager.start(key, { ...options, loop: true }).finally(() => {
      AudioManager.startingLoops.delete(key);
    });
  }

  private static stopLoop(key: string): void {
    const loop = AudioManager.loops.get(key);
    if (!loop) {
      return;
    }
    AudioManager.loops.delete(key);
    try {
      loop.source.onended = null;
      loop.source.stop();
    } catch {
      // Stopping a source that already ended should remain a silent no-op.
    }
    loop.gain.disconnect();
  }

  private static stopOneShots(key: string): void {
    const sounds = AudioManager.oneShots.get(key);
    if (!sounds) {
      return;
    }
    AudioManager.oneShots.delete(key);
    sounds.forEach(({ source, gain }) => {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // Stopping a source that already ended should remain a silent no-op.
      }
      try {
        gain.disconnect();
      } catch {
        // A gain node can already be disconnected by its ended callback.
      }
    });
  }

  private static async getBuffer(key: string): Promise<AudioBuffer | undefined> {
    if (AudioManager.buffers.has(key)) {
      return AudioManager.buffers.get(key) ?? undefined;
    }

    const existingPromise = AudioManager.bufferPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = AudioManager.loadBuffer(key);
    AudioManager.bufferPromises.set(key, promise);
    const buffer = await promise;
    AudioManager.bufferPromises.delete(key);
    return buffer;
  }

  private static async loadBuffer(key: string): Promise<AudioBuffer | undefined> {
    const context = AudioManager.ensureContext();
    if (!context) {
      return undefined;
    }

    for (const extension of AUDIO_EXTENSIONS) {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}audio/${key}.${extension}`);
        if (!response.ok) {
          continue;
        }
        const data = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(data);
        AudioManager.buffers.set(key, buffer);
        return buffer;
      } catch {
        // Missing or invalid optional audio assets stay silent.
      }
    }

    AudioManager.buffers.set(key, null);
    return undefined;
  }
}
