// ── SON D'AMBIANCE DRUNKRACE ─────────────────────────────────────────────────
// Web Audio API — SSR safe (pas de window au top-level)

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

const BPM = 122
const BEAT = 60 / BPM

function scheduleKick(ctx: AudioContext, dest: GainNode, time: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.setValueAtTime(120, time)
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1)
  gain.gain.setValueAtTime(0.5, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.2)
  oscNodes.push(osc)
}

function scheduleHihat(ctx: AudioContext, dest: GainNode, time: number, vol: number) {
  const buf = ctx.createBuffer(1, 512, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < 512; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol * 0.25, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(time)
}

function scheduleBass(ctx: AudioContext, dest: GainNode, time: number, freq: number) {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = freq
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(600, time)
  filter.frequency.exponentialRampToValueAtTime(150, time + 0.3)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.12, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.4)
  oscNodes.push(osc)
}

const BASS_NOTES = [55, 55, 82.4, 55, 73.4, 55, 82.4, 65.4]
const BAR_DUR = BEAT * 4

function scheduleBar(ctx: AudioContext, dest: GainNode, start: number) {
  if (!running) return
  for (let b = 0; b < 8; b++) {
    const t = start + b * (BAR_DUR / 8)
    if (b === 0 || b === 4) scheduleKick(ctx, dest, t)
    scheduleHihat(ctx, dest, t, b % 2 === 0 ? 0.9 : 0.45)
    if (b % 2 === 0) scheduleBass(ctx, dest, t, BASS_NOTES[b])
  }
  loopTimer = setTimeout(() => scheduleBar(ctx, dest, start + BAR_DUR), (BAR_DUR - 0.15) * 1000)
}

export function startAmbiance(volume: number) {
  if (running || typeof window === 'undefined') return
  running = true
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()
  masterGain = ctx.createGain()
  masterGain.gain.value = (volume / 100) * 0.55
  masterGain.connect(ctx.destination)
  scheduleBar(ctx, masterGain, ctx.currentTime + 0.05)
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
