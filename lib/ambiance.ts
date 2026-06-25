// ── SON D'AMBIANCE DRUNKRACE — Casino Lounge ─────────────────────────────────
// Web Audio API — SSR safe

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let oscNodes: OscillatorNode[] = []
let bufNodes: AudioBufferSourceNode[] = []
let running = false
let loopTimer: ReturnType<typeof setTimeout> | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx
}

const BPM = 88  // Jazz swing tempo
const BEAT = 60 / BPM
const BAR = BEAT * 4

// Piano électrique — onde sinusoïdale avec harmoniques
function schedulePiano(ctx: AudioContext, dest: GainNode, time: number, freq: number, dur: number, vol: number) {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, time)
  gain.gain.setValueAtTime(vol * 0.7, time + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

  // Fondamentale
  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.value = freq
  osc1.connect(gain)
  osc1.start(time)
  osc1.stop(time + dur + 0.05)
  oscNodes.push(osc1)

  // 2ème harmonique (octave)
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = freq * 2
  const gain2 = ctx.createGain()
  gain2.gain.value = 0.3
  osc2.connect(gain2)
  gain2.connect(gain)
  osc2.start(time)
  osc2.stop(time + dur + 0.05)
  oscNodes.push(osc2)

  // 3ème harmonique (légère dissonance jazz)
  const osc3 = ctx.createOscillator()
  osc3.type = 'sine'
  osc3.frequency.value = freq * 3.01
  const gain3 = ctx.createGain()
  gain3.gain.value = 0.12
  osc3.connect(gain3)
  gain3.connect(gain)
  osc3.start(time)
  osc3.stop(time + dur + 0.05)
  oscNodes.push(osc3)

  // Reverb simulé (léger écho)
  const echoGain = ctx.createGain()
  echoGain.gain.value = 0.15
  gain.connect(echoGain)
  echoGain.connect(dest)
  gain.connect(dest)
}

// Contrebasse synthétique
function scheduleBass(ctx: AudioContext, dest: GainNode, time: number, freq: number, dur: number) {
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.35, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 300
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + dur)
  oscNodes.push(osc)
}

// Hi-hat jazz (brosse sur caisse claire)
function scheduleSwingHat(ctx: AudioContext, dest: GainNode, time: number, vol: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const env = 1 - i / data.length
    data[i] = (Math.random() * 2 - 1) * env * env
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.value = vol * 0.18
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 6000
  filter.Q.value = 0.8
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(time)
  bufNodes.push(src)
}

// Ride cymbal (ding léger)
function scheduleRide(ctx: AudioContext, dest: GainNode, time: number) {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2800, time)
  osc.frequency.exponentialRampToValueAtTime(1800, time + 0.3)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.06, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.5)
  oscNodes.push(osc)
}

// Kick doux (caisse grosse feutrée)
function scheduleKick(ctx: AudioContext, dest: GainNode, time: number) {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, time)
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.12)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(time)
  osc.stop(time + 0.25)
  oscNodes.push(osc)
}

// Accords jazz piano — progression ii-V-I en Dm (casino classique)
// Dm7 | G7 | Cmaj7 | Cmaj7
const CHORD_PROGRESSIONS = [
  // Dm7: D F A C
  [146.8, 174.6, 220.0, 261.6],
  // G7: G B D F
  [196.0, 246.9, 293.7, 349.2],
  // Cmaj7: C E G B
  [261.6, 329.6, 392.0, 493.9],
  // Am7: A C E G
  [220.0, 261.6, 329.6, 392.0],
]

// Basse notes correspondantes
const BASS_NOTES = [73.4, 98.0, 65.4, 55.0]  // D G C A

// Mélodie piano jazz (notes individuelles, style improvisation)
const MELODY = [
  { beat: 0,    freq: 392.0, dur: 0.4 },  // G
  { beat: 0.75, freq: 440.0, dur: 0.3 },  // A
  { beat: 1.5,  freq: 493.9, dur: 0.5 },  // B
  { beat: 2.5,  freq: 523.3, dur: 0.4 },  // C5
  { beat: 3.25, freq: 493.9, dur: 0.3 },  // B
  { beat: 4,    freq: 440.0, dur: 0.6 },  // A
  { beat: 5,    freq: 392.0, dur: 0.4 },  // G
  { beat: 6,    freq: 349.2, dur: 0.8 },  // F
  { beat: 7,    freq: 392.0, dur: 0.5 },  // G
]

let barCount = 0

function scheduleBar(ctx: AudioContext, dest: GainNode, start: number) {
  if (!running) return

  const chordIdx = barCount % 4
  const chord = CHORD_PROGRESSIONS[chordIdx]
  const bassFreq = BASS_NOTES[chordIdx]

  // Accord piano sur temps 1 (léger, voicing jazz)
  chord.forEach((freq, i) => {
    schedulePiano(ctx, dest, start + i * 0.008, freq, BAR * 0.85, 0.08)
  })

  // Accord piano sur temps 3 (demi-barre)
  chord.forEach((freq, i) => {
    schedulePiano(ctx, dest, start + BAR * 0.5 + i * 0.006, freq * 0.999, BAR * 0.4, 0.05)
  })

  // Mélodie jazz sur la première barre
  if (barCount % 4 === 0) {
    MELODY.forEach(note => {
      if (note.beat < 8) {
        schedulePiano(ctx, dest, start + note.beat * BEAT, note.freq, note.dur, 0.12)
      }
    })
  }

  // Contrebasse — walking bass
  scheduleBass(ctx, dest, start, bassFreq, BEAT * 0.9)
  scheduleBass(ctx, dest, start + BEAT, bassFreq * 1.125, BEAT * 0.9)
  scheduleBass(ctx, dest, start + BEAT * 2, bassFreq * 1.25, BEAT * 0.9)
  scheduleBass(ctx, dest, start + BEAT * 3, bassFreq * 1.5, BEAT * 0.9)

  // Kick sur temps 1 et 3
  scheduleKick(ctx, dest, start)
  scheduleKick(ctx, dest, start + BEAT * 2)

  // Ride cymbal swing (ding ding ding)
  for (let b = 0; b < 8; b++) {
    scheduleRide(ctx, dest, start + b * (BEAT / 2))
  }

  // Hi-hat swing sur les off-beats
  scheduleSwingHat(ctx, dest, start + BEAT * 0.67, 0.7)
  scheduleSwingHat(ctx, dest, start + BEAT * 1.67, 0.5)
  scheduleSwingHat(ctx, dest, start + BEAT * 2.67, 0.7)
  scheduleSwingHat(ctx, dest, start + BEAT * 3.67, 0.5)

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
  masterGain.gain.value = (volume / 100) * 0.6

  // Légère réverbération globale
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 10
  compressor.ratio.value = 4
  masterGain.connect(compressor)
  compressor.connect(ctx.destination)

  scheduleBar(ctx, masterGain, ctx.currentTime + 0.1)
}

export function stopAmbiance() {
  running = false
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null }
  oscNodes.forEach(o => { try { o.stop(); o.disconnect() } catch {} })
  oscNodes = []
  bufNodes.forEach(b => { try { b.stop(); b.disconnect() } catch {} })
  bufNodes = []
  if (masterGain) { try { masterGain.disconnect() } catch {}; masterGain = null }
}

export function setAmbianceVolume(volume: number, muted: boolean) {
  if (!masterGain) return
  masterGain.gain.value = muted ? 0 : (volume / 100) * 0.6
}

export function isAmbiancePlaying() { return running }
