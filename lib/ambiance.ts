// ── SON D'AMBIANCE DRUNKRACE ─────────────────────────────────────────────────
// Généré entièrement via Web Audio API — aucun fichier externe

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let nodes: AudioNode[] = []
let running = false

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return audioCtx
}

// Bruit rose filtré (ambiance crowd/boîte de nuit)
function makePinkNoise(ctx: AudioContext, gainVal: number): AudioNode {
  const bufferSize = 4096
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
  const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1)
  scriptNode.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886*b0 + white*0.0555179
      b1 = 0.99332*b1 + white*0.0750759
      b2 = 0.96900*b2 + white*0.1538520
      b3 = 0.86650*b3 + white*0.3104856
      b4 = 0.55000*b4 + white*0.5329522
      b5 = -0.7616*b5 - white*0.0168980
      output[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11
      b6 = white * 0.115926
    }
  }
  const gainNode = ctx.createGain()
  gainNode.gain.value = gainVal
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  scriptNode.connect(filter)
  filter.connect(gainNode)
  return gainNode
}

// Kick drum synthétique (basse rythmique)
function scheduleKick(ctx: AudioContext, dest: AudioNode, time: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08)
  gain.gain.setValueAtTime(0.6, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.2)
}

// Hi-hat (ambiance électro)
function scheduleHihat(ctx: AudioContext, dest: AudioNode, time: number, volume: number) {
  const bufferSize = 512
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume * 0.3, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 8000
  source.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  source.start(time)
}

// Basse synthé (ligne mélodique simple)
function scheduleBass(ctx: AudioContext, dest: AudioNode, time: number, freq: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = freq
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, time)
  filter.frequency.exponentialRampToValueAtTime(200, time + 0.3)
  gain.gain.setValueAtTime(0.15, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.4)
}

// Pattern rythmique (loop de 2 secondes à ~120 BPM)
const BASS_PATTERN = [55, 55, 82.4, 55, 73.4, 55, 82.4, 65.4] // fréquences basse
const BPM = 122
const BEAT = 60 / BPM
const BAR = BEAT * 4

let loopTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleBar(ctx: AudioContext, dest: AudioNode, startTime: number) {
  if (!running) return
  for (let b = 0; b < 8; b++) {
    const t = startTime + b * (BAR / 8)
    // Kick sur les temps 1 et 3
    if (b === 0 || b === 4) scheduleKick(ctx, dest, t)
    // Hi-hats sur toutes les doubles croches
    scheduleHihat(ctx, dest, t, b % 2 === 0 ? 0.8 : 0.4)
    // Basse
    if (b % 2 === 0) scheduleBass(ctx, dest, t, BASS_PATTERN[b])
  }
  loopTimeout = setTimeout(() => scheduleBar(ctx, dest, startTime + BAR), (BAR - 0.1) * 1000)
}

export function startAmbiance(volume: number) {
  if (running) return
  running = true
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()

  masterGain = ctx.createGain()
  masterGain.gain.value = volume / 100 * 0.6
  masterGain.connect(ctx.destination)

  // Bruit rose d'ambiance
  const pink = makePinkNoise(ctx, 0.08)
  pink.connect(masterGain)
  nodes.push(pink)

  // Rythme électro
  scheduleBar(ctx, masterGain, ctx.currentTime + 0.1)
}

export function stopAmbiance() {
  running = false
  if (loopTimeout) clearTimeout(loopTimeout)
  loopTimeout = null
  nodes.forEach(n => { try { (n as any).disconnect() } catch {} })
  nodes = []
  if (masterGain) { try { masterGain.disconnect() } catch {} masterGain = null }
}

export function setAmbianceVolume(volume: number, muted: boolean) {
  if (!masterGain) return
  masterGain.gain.value = muted ? 0 : (volume / 100) * 0.6
}

export function isAmbiancePlaying() { return running }
