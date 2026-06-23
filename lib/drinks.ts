export interface DrinkEntry {
  id: string
  drinkId: string
  name: string
  emoji: string
  vol_cl: number
  degree_pct: number
  alcohol_g: number
  color: string
  mixer?: string
  addedAt: number // timestamp ms
}

// ── BASE SPIRITS & DRINKS ────────────────────────────────────────────────────
export interface DrinkBase {
  id: string
  emoji: string
  name: string
  category: "Bière" | "Alcool fort" | "Vin & Champagne" | "Shots"
  degree_pct: number
  color: string
  // Available volumes in cl
  volumes: number[]
  // If mixable: list of mixers
  mixers?: string[]
}

export const DRINK_BASES: DrinkBase[] = [
  // ── BIÈRES ──
  { id:"castel",      emoji:"🍺", name:"Castel Rouge",      category:"Bière",          degree_pct:5.0,  color:"#f59e0b", volumes:[25,33,50] },
  { id:"kronenbourg", emoji:"🍺", name:"Kronenbourg 1664",  category:"Bière",          degree_pct:5.0,  color:"#f59e0b", volumes:[25,33,50] },
  { id:"heineken",    emoji:"🍺", name:"Heineken",           category:"Bière",          degree_pct:5.0,  color:"#22c55e", volumes:[25,33,50] },
  { id:"corona",      emoji:"🍺", name:"Corona",             category:"Bière",          degree_pct:4.6,  color:"#fbbf24", volumes:[33,50] },
  { id:"leffe",       emoji:"🍺", name:"Leffe Blonde",       category:"Bière",          degree_pct:6.6,  color:"#d97706", volumes:[25,33,50] },
  { id:"despe",       emoji:"🍾", name:"Desperados",         category:"Bière",          degree_pct:5.9,  color:"#84cc16", volumes:[25,33,50] },
  { id:"grimbergen",  emoji:"🍺", name:"Grimbergen",         category:"Bière",          degree_pct:6.7,  color:"#b45309", volumes:[25,33,50] },
  { id:"guinness",    emoji:"🍺", name:"Guinness",           category:"Bière",          degree_pct:4.2,  color:"#44403c", volumes:[33,50] },
  { id:"stella",      emoji:"🍺", name:"Stella Artois",      category:"Bière",          degree_pct:5.2,  color:"#facc15", volumes:[25,33,50] },
  { id:"paulaner",    emoji:"🍺", name:"Paulaner",           category:"Bière",          degree_pct:5.5,  color:"#fbbf24", volumes:[50] },
  { id:"1664blanc",   emoji:"🍺", name:"1664 Blanc",         category:"Bière",          degree_pct:5.0,  color:"#60a5fa", volumes:[25,33,50] },
  // ── ALCOOLS FORTS (purs ou mixés) ──
  { id:"vodka",       emoji:"🫙", name:"Vodka",              category:"Alcool fort",    degree_pct:40.0, color:"#60a5fa", volumes:[2,4,5,10,20], mixers:["Pure","Red Bull","Orange","Citron","Cranberry","Ananas","Grenadine","Lemon Ice"] },
  { id:"captain",     emoji:"🏴‍☠️", name:"Captain Morgan",   category:"Alcool fort",    degree_pct:35.0, color:"#92400e", volumes:[2,4,5,10,20], mixers:["Pure","Cola","Ananas","Orange","Ginger Beer"] },
  { id:"whisky",      emoji:"🥃", name:"Whisky",             category:"Alcool fort",    degree_pct:40.0, color:"#b45309", volumes:[2,4,5,10,20], mixers:["Pure","Cola","Ginger Ale","Eau","Glace"] },
  { id:"rhum",        emoji:"🌴", name:"Rhum",               category:"Alcool fort",    degree_pct:37.5, color:"#d97706", volumes:[2,4,5,10,20], mixers:["Pure","Cola","Ananas","Citron vert","Sirop canne"] },
  { id:"tequila",     emoji:"🌵", name:"Tequila",            category:"Alcool fort",    degree_pct:40.0, color:"#fde68a", volumes:[2,4,5,10], mixers:["Pure","Orange","Citron","Grenadine"] },
  { id:"gin",         emoji:"🫧", name:"Gin",                category:"Alcool fort",    degree_pct:40.0, color:"#818cf8", volumes:[2,4,5,10,20], mixers:["Pure","Tonic","Concombre","Citron","Fraise"] },
  { id:"get27",       emoji:"🌿", name:"Get 27",             category:"Alcool fort",    degree_pct:21.0, color:"#4ade80", volumes:[2,4,5,10,20], mixers:["Pure","Eau","Citron","Lemon Ice"] },
  { id:"get31",       emoji:"🌿", name:"Get 31",             category:"Alcool fort",    degree_pct:18.0, color:"#86efac", volumes:[2,4,5,10,20], mixers:["Pure","Eau","Citron"] },
  { id:"malibu",      emoji:"🥥", name:"Malibu",             category:"Alcool fort",    degree_pct:21.0, color:"#bae6fd", volumes:[2,4,5,10,20], mixers:["Pure","Ananas","Orange","Coca","Lait de coco"] },
  { id:"pastis",      emoji:"☀️", name:"Pastis",             category:"Alcool fort",    degree_pct:45.0, color:"#fbbf24", volumes:[2,4,5], mixers:["Pure","Eau (5x)"] },
  { id:"jager",       emoji:"🦌", name:"Jägermeister",       category:"Alcool fort",    degree_pct:35.0, color:"#166534", volumes:[2,4,5], mixers:["Pure","Red Bull"] },
  { id:"sambuca",     emoji:"🌟", name:"Sambuca",            category:"Alcool fort",    degree_pct:38.0, color:"#4f46e5", volumes:[2,4,5], mixers:["Pure"] },
  { id:"baileys",     emoji:"🍫", name:"Baileys",            category:"Alcool fort",    degree_pct:17.0, color:"#d6b896", volumes:[4,5,10,20], mixers:["Pure","Lait","Café","Glace"] },
  { id:"cointreau",   emoji:"🍊", name:"Cointreau",          category:"Alcool fort",    degree_pct:40.0, color:"#fb923c", volumes:[2,4,5], mixers:["Pure","Citron","Orange"] },
  { id:"limoncello",  emoji:"🍋", name:"Limoncello",         category:"Alcool fort",    degree_pct:30.0, color:"#fef08a", volumes:[2,4,5,10], mixers:["Pure","Eau"] },
  { id:"aperol",      emoji:"🌅", name:"Aperol",             category:"Alcool fort",    degree_pct:11.0, color:"#f97316", volumes:[5,10,20], mixers:["Pure","Prosecco","Eau gazeuse"] },
  // ── VIN & CHAMPAGNE ──
  { id:"vin_rouge",   emoji:"🍷", name:"Vin rouge",          category:"Vin & Champagne",degree_pct:13.5, color:"#be123c", volumes:[10,15,20,25] },
  { id:"vin_blanc",   emoji:"🥂", name:"Vin blanc",          category:"Vin & Champagne",degree_pct:12.5, color:"#fef08a", volumes:[10,15,20,25] },
  { id:"rose",        emoji:"🌸", name:"Rosé",               category:"Vin & Champagne",degree_pct:12.0, color:"#fda4af", volumes:[10,15,20,25] },
  { id:"champagne",   emoji:"🥂", name:"Champagne",          category:"Vin & Champagne",degree_pct:12.0, color:"#fde68a", volumes:[10,12,15,20] },
  { id:"prosecco",    emoji:"🥂", name:"Prosecco",           category:"Vin & Champagne",degree_pct:11.0, color:"#fef9c3", volumes:[10,12,15,20] },
  { id:"porto",       emoji:"🍷", name:"Porto",              category:"Vin & Champagne",degree_pct:19.0, color:"#7f1d1d", volumes:[5,10,15] },
  // ── SHOTS ──
  { id:"shot_vodka",  emoji:"🥃", name:"Shot Vodka",         category:"Shots",          degree_pct:40.0, color:"#60a5fa", volumes:[4] },
  { id:"shot_tequila",emoji:"🥃", name:"Shot Tequila",       category:"Shots",          degree_pct:40.0, color:"#fde68a", volumes:[4] },
  { id:"shot_whisky", emoji:"🥃", name:"Shot Whisky",        category:"Shots",          degree_pct:40.0, color:"#b45309", volumes:[4] },
  { id:"shot_rhum",   emoji:"🥃", name:"Shot Rhum",          category:"Shots",          degree_pct:37.5, color:"#d97706", volumes:[4] },
  { id:"shot_get27",  emoji:"🥃", name:"Shot Get 27",        category:"Shots",          degree_pct:21.0, color:"#4ade80", volumes:[4] },
  { id:"shot_get31",  emoji:"🥃", name:"Shot Get 31",        category:"Shots",          degree_pct:18.0, color:"#86efac", volumes:[4] },
  { id:"shot_jager",  emoji:"🥃", name:"Shot Jäger",         category:"Shots",          degree_pct:35.0, color:"#166534", volumes:[4] },
  { id:"shot_pastis", emoji:"🥃", name:"Shot Pastis",        category:"Shots",          degree_pct:45.0, color:"#fbbf24", volumes:[4] },
  { id:"shot_sambuca",emoji:"🥃", name:"Shot Sambuca",       category:"Shots",          degree_pct:38.0, color:"#4f46e5", volumes:[4] },
  { id:"shot_baileys",emoji:"🥃", name:"Shot Baileys",       category:"Shots",          degree_pct:17.0, color:"#d6b896", volumes:[4] },
  { id:"shot_gin",    emoji:"🥃", name:"Shot Gin",           category:"Shots",          degree_pct:40.0, color:"#818cf8", volumes:[4] },
  { id:"shot_malibu", emoji:"🥃", name:"Shot Malibu",        category:"Shots",          degree_pct:21.0, color:"#bae6fd", volumes:[4] },
]

export const DRINK_CATEGORIES = ["Bière","Alcool fort","Vin & Champagne","Shots"]

// Compute alcohol grams: vol_ml * degree/100 * 0.8
export function alcoholGrams(vol_cl: number, degree_pct: number): number {
  return parseFloat((vol_cl * 10 * (degree_pct / 100) * 0.8).toFixed(2))
}

// distance piste: 1cl = 0.5m
export const cmToMeters = (cl: number) => cl * 0.5

// ── BAC ENGINE ───────────────────────────────────────────────────────────────
// Widmark: BAC = alcohol_g / (weight_kg * r * 10)
// Absorption: alcool absorbé progressivement sur ~60 min (pic à t+45min)
// Elimination: 0.12‰/h (conservative average)

export const ELIM_RATE = 0.12 // ‰ per hour

export function calcBACAtTime(drinks: DrinkEntry[], weight_kg: number, sex: string, atMs: number): number {
  const r = sex === "M" ? 0.68 : 0.55
  let totalAbsorbed = 0
  for (const d of drinks) {
    const minsElapsed = (atMs - d.addedAt) / 60000
    if (minsElapsed < 0) continue
    // Absorption curve: 0 at t=0, 100% at t=90min (linear approx)
    const absorbPct = Math.min(minsElapsed / 90, 1)
    totalAbsorbed += d.alcohol_g * absorbPct
  }
  const bac = totalAbsorbed / (weight_kg * r * 10)
  // Elimination: starts from first drink
  if (drinks.length === 0) return 0
  const firstDrink = Math.min(...drinks.map(d => d.addedAt))
  const hoursTotal = (atMs - firstDrink) / 3600000
  const eliminated = Math.max(0, hoursTotal * ELIM_RATE)
  return Math.max(0, parseFloat((bac - eliminated).toFixed(3)))
}

export function calcCurrentBAC(drinks: DrinkEntry[], weight_kg: number, sex: string): number {
  return calcBACAtTime(drinks, weight_kg, sex, Date.now())
}

// Find peak BAC time and value
export function calcPeak(drinks: DrinkEntry[], weight_kg: number, sex: string): { bac: number, atMs: number } {
  if (drinks.length === 0) return { bac: 0, atMs: Date.now() }
  // Sample every 5 min from first drink to +4h
  const first = Math.min(...drinks.map(d => d.addedAt))
  let peak = 0, peakMs = first
  for (let i = 0; i <= 48; i++) {
    const t = first + i * 5 * 60000
    const b = calcBACAtTime(drinks, weight_kg, sex, t)
    if (b > peak) { peak = b; peakMs = t }
  }
  return { bac: peak, atMs: peakMs }
}

// When will BAC reach a threshold (0 = sober, 0.5 = legal drive)
export function calcSoberTime(drinks: DrinkEntry[], weight_kg: number, sex: string, threshold = 0): number | null {
  if (drinks.length === 0) return null
  const peak = calcPeak(drinks, weight_kg, sex)
  if (peak.bac <= threshold) return Date.now()
  // After peak, linear elimination
  const hoursAfterPeak = (peak.bac - threshold) / ELIM_RATE
  return peak.atMs + hoursAfterPeak * 3600000
}

export function getBACStatus(bac: number) {
  if (bac < 0.2)  return { label: "Sobre 😇",            color: "#4ade80", emoji: "🏃" }
  if (bac < 0.5)  return { label: "Légèrement chaud 😊", color: "#facc15", emoji: "🚶" }
  if (bac < 0.8)  return { label: "Bien parti 😄",        color: "#fb923c", emoji: "🤸" }
  if (bac < 1.2)  return { label: "Bourré 🤪",            color: "#f87171", emoji: "🤣" }
  if (bac < 1.8)  return { label: "Très bourré 🫨",       color: "#ef4444", emoji: "😵" }
  return          { label: "Dans les vapes 💀",            color: "#dc2626", emoji: "☠️" }
}

export function fmtTime(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export const AVATARS = ["🐺","🦊","🐱","🐻","🐼","🦁","🐯","🦋","🐸","🐨","🦅","🐬"]
