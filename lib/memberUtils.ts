import { DRINK_BASES, alcoholGrams, deserializeDrink, type DrinkEntry } from "./drinks"

export function parseDrinksLog(raw: any): DrinkEntry[] {
  if (!raw) return []
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(raw)) return []
  
  const result: DrinkEntry[] = []
  for (const item of raw) {
    if (!item) continue
    let parsed = item
    if (typeof item === "string") {
      try {
        parsed = JSON.parse(item)
      } catch {
        // plain drink ID (legacy)
        const base = DRINK_BASES.find((b) => b.id === item)
        if (base) {
          result.push({
            id: `${base.id}_legacy`,
            drinkId: base.id,
            name: base.name,
            emoji: base.emoji,
            vol_cl: base.volumes[0],
            degree_pct: base.degree_pct,
            alcohol_g: alcoholGrams(base.volumes[0], base.degree_pct),
            color: base.color,
            addedAt: Date.now(),
          })
        }
        continue
      }
    }
    const d = deserializeDrink(parsed)
    if (d) result.push(d)
  }
  return result
}
