import { DRINK_BASES, deserializeDrink, type DrinkEntry } from "./drinks"

// Safely parse drinks_log from Supabase (JSONB array)
export function parseDrinksLog(raw: any): DrinkEntry[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map((item: any) => deserializeDrink(item)).filter((d): d is DrinkEntry => d !== null)
}
