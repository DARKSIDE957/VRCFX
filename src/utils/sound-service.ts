import notificationMp3 from '../assets/sounds/notification.mp3'

export type SoundChimeType = 'harmonic' | 'ping' | 'classic' | 'subtle'

class SoundService {
  private audioCtx: AudioContext | null = null
  private lastPlayTime: number = 0
  private audioFallback: HTMLAudioElement | null = null

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  public play(
    chimeType: SoundChimeType = 'harmonic',
    volume: number = 75,
    force: boolean = false
  ): void {
    const now = Date.now()
    // Debounce to prevent audio clipping/distortion when multiple notifications arrive simultaneously
    if (!force && now - this.lastPlayTime < 140) {
      return
    }
    this.lastPlayTime = now

    const masterVol = Math.max(0, Math.min(100, volume)) / 100
    if (masterVol <= 0.01) return

    try {
      const ctx = this.getAudioContext()
      if (ctx) {
        this.synthesizeChime(ctx, chimeType, masterVol)
        return
      }
    } catch (err) {
      console.warn('Web Audio synthesis failed, falling back to MP3:', err)
    }

    // Fallback to HTML5 Audio Element
    this.playAudioFile(masterVol)
  }

  private synthesizeChime(ctx: AudioContext, chimeType: SoundChimeType, volume: number) {
    const now = ctx.currentTime

    if (chimeType === 'harmonic') {
      // Harmonic Crystal Chime (Warm, elegant, resonant)
      const frequencies = [587.33, 880.0, 1174.66] // D5, A5, D6
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = idx === 0 ? 'sine' : 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.04)

        const startGain = volume * (0.28 / (idx + 1))
        gain.gain.setValueAtTime(0, now + idx * 0.04)
        gain.gain.linearRampToValueAtTime(startGain, now + idx * 0.04 + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.45)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.04)
        osc.stop(now + idx * 0.04 + 0.5)
      })
    } else if (chimeType === 'ping') {
      // Modern Clean Ping (High precision, minimalist)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, now) // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08) // E6

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.32)
    } else if (chimeType === 'classic') {
      // Classic Dual Chime
      const notes = [
        { freq: 523.25, time: 0, dur: 0.22 }, // C5
        { freq: 659.25, time: 0.1, dur: 0.35 } // E5
      ]

      notes.forEach((n) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(n.freq, now + n.time)

        gain.gain.setValueAtTime(0, now + n.time)
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + n.time + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + n.time)
        osc.stop(now + n.time + n.dur + 0.05)
      })
    } else {
      // Subtle Mellow Accent
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(440.0, now) // A4
      osc.frequency.linearRampToValueAtTime(554.37, now + 0.06) // C#5

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.38)
    }
  }

  private playAudioFile(volume: number) {
    try {
      if (!this.audioFallback) {
        this.audioFallback = new Audio(notificationMp3)
      }
      this.audioFallback.currentTime = 0
      this.audioFallback.volume = Math.max(0, Math.min(1, volume * 0.7))
      this.audioFallback.play().catch(() => {})
    } catch (e) {
      console.warn('Audio fallback error:', e)
    }
  }
}

export const soundService = new SoundService()
