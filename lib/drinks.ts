export interface Drink {
  id: string
  emoji: string
  name: string
  vol_cl: number
  degree_pct: number
  alcohol_g: number
  bottle_cm: number
  color: string
  category: string
  label: string
}

function mkDrink(id: string, emoji: string, name: string, vol_cl: number, degree_pct: number, color: string, category: string): Drink {
  const alcohol_g = parseFloat((vol_cl * 10 * (degree_pct / 100) * 0.8).toFixed(1))
  return { id, emoji, name, vol_cl, degree_pct, alcohol_g, bottle_cm: vol_cl, color, category, label: `${emoji} ${name}` }
}

export const DRINK_CATALOG: Drink[] = [
  // Bières
  mkDrink("castel_25",     "🍺","Castel Rouge 25cl",        25,  5.0, "#f59e0b", "Bière"),
  mkDrink("castel_50",     "🍺","Castel Rouge 50cl",        50,  5.0, "#f59e0b", "Bière"),
  mkDrink("kronenbourg_25","🍺","Kronenbourg 25cl",          25,  5.0, "#f59e0b", "Bière"),
  mkDrink("kronenbourg_50","🍺","Kronenbourg 50cl",          50,  5.0, "#f59e0b", "Bière"),
  mkDrink("heineken_33",   "🍺","Heineken 33cl",            33,  5.0, "#22c55e", "Bière"),
  mkDrink("heineken_50",   "🍺","Heineken 50cl",            50,  5.0, "#22c55e", "Bière"),
  mkDrink("corona_33",     "🍺","Corona 33cl",              33,  4.6, "#fbbf24", "Bière"),
  mkDrink("leffe_25",      "🍺","Leffe Blonde 25cl",        25,  6.6, "#d97706", "Bière"),
  mkDrink("leffe_50",      "🍺","Leffe Blonde 50cl",        50,  6.6, "#d97706", "Bière"),
  mkDrink("despe_33",      "🍾","Desperados 33cl",          33,  5.9, "#84cc16", "Bière"),
  mkDrink("despe_50",      "🍾","Desperados 50cl",          50,  5.9, "#84cc16", "Bière"),
  mkDrink("grimbergen_25", "🍺","Grimbergen 25cl",          25,  6.7, "#b45309", "Bière"),
  mkDrink("paulaner_50",   "🍺","Paulaner 50cl",            50,  5.5, "#fbbf24", "Bière"),
  mkDrink("guinness_33",   "🍺","Guinness 33cl",            33,  4.2, "#44403c", "Bière"),
  mkDrink("stella_33",     "🍺","Stella Artois 33cl",       33,  5.2, "#facc15", "Bière"),
  mkDrink("1664_33",       "🍺","1664 Blanc 33cl",          33,  5.0, "#60a5fa", "Bière"),
  // Shots
  mkDrink("shot_vodka",    "🥃","Shot Vodka (4cl)",          4, 40.0, "#60a5fa", "Shots"),
  mkDrink("shot_tequila",  "🥃","Shot Tequila (4cl)",        4, 40.0, "#fde68a", "Shots"),
  mkDrink("shot_rhum",     "🥃","Shot Rhum (4cl)",           4, 37.5, "#d97706", "Shots"),
  mkDrink("shot_whisky",   "🥃","Shot Whisky (4cl)",         4, 40.0, "#b45309", "Shots"),
  mkDrink("shot_gin",      "🥃","Shot Gin (4cl)",            4, 40.0, "#818cf8", "Shots"),
  mkDrink("shot_get27",    "🥃","Shot Get 27 (4cl)",         4, 21.0, "#4ade80", "Shots"),
  mkDrink("shot_get31",    "🥃","Shot Get 31 (4cl)",         4, 18.0, "#86efac", "Shots"),
  mkDrink("shot_pastis",   "🥃","Shot Pastis (4cl)",         4, 45.0, "#fbbf24", "Shots"),
  mkDrink("shot_jager",    "🥃","Jägermeister (4cl)",        4, 35.0, "#166534", "Shots"),
  mkDrink("shot_sambuca",  "🥃","Sambuca (4cl)",             4, 38.0, "#4f46e5", "Shots"),
  mkDrink("shot_baileys",  "🥃","Baileys (4cl)",             4, 17.0, "#d6b896", "Shots"),
  mkDrink("shot_captain",  "🥃","Captain Morgan (4cl)",      4, 35.0, "#92400e", "Shots"),
  mkDrink("shot_malibu",   "🥃","Malibu (4cl)",              4, 21.0, "#bae6fd", "Shots"),
  mkDrink("shot_limoncello","🥃","Limoncello (4cl)",         4, 30.0, "#fef08a", "Shots"),
  mkDrink("shot_cointreau","🥃","Cointreau (4cl)",           4, 40.0, "#fb923c", "Shots"),
  // Cocktails
  mkDrink("vodka_redbull", "⚡","Vodka Red Bull (20cl)",    20,  8.0, "#6366f1", "Cocktails"),
  mkDrink("vodka_orange",  "🍊","Vodka Orange (20cl)",      20,  8.0, "#fb923c", "Cocktails"),
  mkDrink("captain_cola",  "🏴‍☠️","Captain & Cola (20cl)",  20, 10.0, "#92400e", "Cocktails"),
  mkDrink("captain_ananas","🍍","Captain & Ananas (20cl)",  20, 10.0, "#fbbf24", "Cocktails"),
  mkDrink("malibu_ananas", "🥥","Malibu Ananas (20cl)",     20,  8.0, "#bae6fd", "Cocktails"),
  mkDrink("gin_tonic",     "🫧","Gin Tonic (20cl)",         20, 10.0, "#818cf8", "Cocktails"),
  mkDrink("mojito",        "🍃","Mojito (25cl)",            25,  8.0, "#34d399", "Cocktails"),
  mkDrink("pina_colada",   "🥥","Piña Colada (20cl)",       20, 10.0, "#fde68a", "Cocktails"),
  mkDrink("rhum_coca",     "🥤","Rhum Coca (20cl)",         20, 10.0, "#78350f", "Cocktails"),
  mkDrink("tequila_sunrise","🌅","Tequila Sunrise (20cl)",  20, 10.0, "#f97316", "Cocktails"),
  mkDrink("sex_beach",     "🏖️","Sex on the Beach (20cl)", 20,  9.0, "#fb7185", "Cocktails"),
  mkDrink("whisky_cola",   "🥃","Whisky Cola (20cl)",       20, 10.0, "#a16207", "Cocktails"),
  mkDrink("long_island",   "🍹","Long Island (20cl)",       20, 22.0, "#e879f9", "Cocktails"),
  mkDrink("margarita",     "🍸","Margarita (15cl)",         15, 15.0, "#4ade80", "Cocktails"),
  mkDrink("spritz",        "🍾","Aperol Spritz (20cl)",     20,  8.0, "#fb923c", "Cocktails"),
  mkDrink("cuba_libre",    "🥤","Cuba Libre (20cl)",        20,  9.0, "#78350f", "Cocktails"),
  mkDrink("cosmopolitan",  "🍸","Cosmopolitan (15cl)",      15, 15.0, "#f43f5e", "Cocktails"),
  mkDrink("negroni",       "🍸","Negroni (10cl)",           10, 24.0, "#dc2626", "Cocktails"),
  mkDrink("blue_lagoon",   "🐟","Blue Lagoon (20cl)",       20,  8.0, "#38bdf8", "Cocktails"),
  mkDrink("kir_royal",     "🥂","Kir Royal (12cl)",         12, 10.0, "#e879f9", "Cocktails"),
  // Vin & Champagne
  mkDrink("vin_rouge_15",  "🍷","Vin rouge 15cl",           15, 13.5, "#be123c", "Vin"),
  mkDrink("vin_rouge_25",  "🍷","Vin rouge 25cl",           25, 13.5, "#be123c", "Vin"),
  mkDrink("vin_blanc_15",  "🥂","Vin blanc 15cl",           15, 12.5, "#fef08a", "Vin"),
  mkDrink("vin_blanc_25",  "🥂","Vin blanc 25cl",           25, 12.5, "#fef08a", "Vin"),
  mkDrink("rose_15",       "🌸","Rosé 15cl",                15, 12.0, "#fda4af", "Vin"),
  mkDrink("champagne_12",  "🥂","Champagne 12cl",           12, 12.0, "#fde68a", "Vin"),
  mkDrink("prosecco_12",   "🥂","Prosecco 12cl",            12, 11.0, "#fef9c3", "Vin"),
  mkDrink("porto_10",      "🍷","Porto 10cl",               10, 19.0, "#7f1d1d", "Vin"),
]

export const CATEGORIES = ["Tous", "Bière", "Shots", "Cocktails", "Vin"]

export const AVATARS = ["🐺","🦊","🐱","🐻","🐼","🦁","🐯","🦋","🐸","🐨","🦅","🐬"]
export const MEMBER_COLORS = ["#a855f7","#ec4899","#38bdf8","#4ade80","#fb923c","#f43f5e","#818cf8","#34d399"]

// Formule Widmark
export function calcBAC(drinks: Drink[], weight_kg: number, sex: string): number {
  const r = sex === "M" ? 0.68 : 0.55
  const total = drinks.reduce((a, d) => a + d.alcohol_g, 0)
  return Math.max(0, parseFloat((total / (weight_kg * r * 10)).toFixed(3)))
}

export function getBACStatus(bac: number) {
  if (bac < 0.2)  return { label: "Sobre 😇",             color: "#4ade80", emoji: "🏃" }
  if (bac < 0.5)  return { label: "Légèrement chaud 😊",  color: "#facc15", emoji: "🚶" }
  if (bac < 0.8)  return { label: "Bien parti 😄",         color: "#fb923c", emoji: "🤸" }
  if (bac < 1.2)  return { label: "Bourré 🤪",             color: "#f87171", emoji: "🤣" }
  if (bac < 1.8)  return { label: "Très bourré 🫨",        color: "#ef4444", emoji: "😵" }
  return          { label: "Dans les vapes 💀",             color: "#dc2626", emoji: "☠️" }
}

// distance piste: 1cl de volume = 0.5m
export const cmToMeters = (cl: number) => cl * 0.5
