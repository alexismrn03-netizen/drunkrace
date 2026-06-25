// ── AMBIANCE DRUNKRACE — Casino Chill ────────────────────────────────────────
// Piano lounge doux, basse chaude, hi-hat très discret. Rien d'agressif.

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let oscNodes: OscillatorNode[] = []
let running = false
let loopTimer: ReturnType<typeof setTimeout> | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx
}

const BPM = 72
const BEAT = 60 / BPM
const BAR = BEAT * 4

// Piano doux — sine + une légère harmonique, decay long
function piano(ctx: AudioContext, dest: GainNode, time: number, freq: number, dur: number, vol: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(vol, time + 0.015)
  gain.gain.exponentialRampToValueAtTime(vol * 0.4, time + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.value = freq
  o1.connect(gain)
  o1.start(time)
  o1.stop(time + dur + 0.1)
  oscNodes.push(o1)

  // Légère harmonique douce (pas d'aigu agressif)
  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = freq * 2
  const g2 = ctx.createGain()
  g2.gain.value = 0.18
  o2.connect(g2)
  g2.connect(gain)
  o2.start(time)
  o2.stop(time + dur + 0.1)
  oscNodes.push(o2)

  gain.connect(dest)
}

// Basse chaude et ronde
function bass(ctx: AudioContext, dest: GainNode, time: number, freq: number, dur: number) {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 250

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.45, time + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + dur + 0.05)
  oscNodes.push(osc)
}

// Très léger hi-hat feutré (bruit blanc très filtré et très bas volume)
function softHat(ctx: AudioContext, dest: GainNode, time: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2000  // Bas — pas d'aigu

  const gain = ctx.createGain()
  gain.gain.value = 0.04  // Très discret

  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(time)
}

// Progression jazz chill — Cmaj7 | Am7 | Dm7 | G7
const CHORDS = [
  [261.6, 329.6, 392.0, 493.9],  // Cmaj7
  [220.0, 261.6, 329.6, 392.0],  // Am7
  [146.8, 174.6, 220.0, 293.7],  // Dm7
  [196.0, 246.9, 293.7, 392.0],  // G7
]
const BASS_ROOT = [65.4, 55.0, 73.4, 98.0]  // C A D G

// Mélodie douce et minimaliste
const MELODY_A = [
  { b: 0,    f: 523.3, d: 0.8 },
  { b: 1.5,  f: 493.9, d: 0.6 },
  { b: 2.5,  f: 440.0, d: 1.0 },
  { b: 4,    f: 392.0, d: 0.7 },
  { b: 5,    f: 440.0, d: 0.5 },
  { b: 6,    f: 493.9, d: 1.5 },
]

const MELODY_B = [
  { b: 0,    f: 392.0, d: 1.0 },
  { b: 1.5,  f: 349.2, d: 0.6 },
  { b: 2.5,  f: 329.6, d: 0.8 },
  { b: 4,    f: 349.2, d: 0.5 },
  { b: 5,    f: 392.0, d: 0.5 },
  { b: 6.5,  f: 440.0, d: 1.5 },
]

let barCount = 0

function scheduleBar(ctx: AudioContext, dest: GainNode, start: number) {
  if (!running) return

  const ci = barCount % 4
  const chord = CHORDS[ci]
  const br = BASS_ROOT[ci]

  // Accord piano — attaque douce, notes légèrement étalées
  chord.forEach((freq, i) => {
    piano(ctx, dest, start + i * 0.012, freq, BAR * 0.9, 0.07)
  })

  // Basse sur temps 1 et 3
  bass(ctx, dest, start, br, BEAT * 1.5)
  bass(ctx, dest, start + BEAT * 2, br * 1.5, BEAT * 1.5)

  // Hi-hat très discret sur chaque temps (pas de ride, pas de crash)
  for (let b = 0; b < 4; b++) {
    softHat(ctx, dest, start + b * BEAT)
    // Off-beat encore plus discret
    softHat(ctx, dest, start + b * BEAT + BEAT * 0.5)
  }

  // Mélodie toutes les 4 mesures, alternance A/B
  if (barCount % 4 === 0) {
    const melody = (barCount % 8 === 0) ? MELODY_A : MELODY_B
    melody.forEach(n => {
      if (n.b < 8) piano(ctx, dest, start + n.b * BEAT, n.f, n.d, 0.1)
    })
  }

  barCount++
  loopTimer = setTimeout(() => scheduleBar(ctx, dest, start + BAR), (BAR - 0.15) * 1000)
}

export function startAmbiance(volume: number) {
  if (running || typeof window === 'undefined') return
  running = true
  barCount = 0
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()

  masterGain = ctx.createGain()
  masterGain.gain.value = (volume / 100) * 0.55

  // Compresseur doux pour éviter les pics
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -24
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.003
  comp.release.value = 0.25
  masterGain.connect(comp)
  comp.connect(ctx.destination)

  scheduleBar(ctx, masterGain, ctx.currentTime + 0.1)
}

export function stopAmbiance() {
  running = false
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null }
  oscNodes.forEach(o => { try { o.stop(); o.disconnect() } catch {} })
  oscNodes = []
  if (masterGain) { try { masterGain.disconnect() } catch {}; masterGain = null }
}

export function setAmbianceVolume(volume: number, muted: boolean) {
  if (!masterGain) return
  masterGain.gain.value = muted ? 0 : (volume / 100) * 0.55
}

export function isAmbiancePlaying() { return running }
