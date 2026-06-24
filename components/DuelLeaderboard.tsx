"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { DRINK_BASES } from "@/lib/drinks"

interface DuelRecord {
  id: string
  user_id: string
  pseudo: string
  drink_name: string
  drink_id: string
  vol_cl: number
  degree_pct: number
  time_ms: number
  won: boolean
  created_at: string
}

function fmt(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`
}

function getMedal(i: number) {
  return ["🥇","🥈","🥉","4️⃣","5️⃣"][i] || `${i+1}.`
}

export default function DuelLeaderboard({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [records, setRecords] = useState<DuelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDrink, setFilterDrink] = useState<string>("all")
  const [filterVol, setFilterVol] = useState<number | "all">("all")

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("duel_records")
      .select("*, profiles!user_id(pseudo)")
      .order("time_ms", { ascending: true })
      .limit(200)
    if (data) {
      setRecords(data.map((r: any) => ({
        ...r, pseudo: r.profiles?.pseudo || "?"
      })))
    }
    setLoading(false)
  }

  // Get unique drinks from records
  const drinkOptions = Array.from(new Set(records.map(r => r.drink_id)))
    .map(id => ({ id, name: records.find(r => r.drink_id === id)?.drink_name || id }))

  // Get available volumes for selected drink
  const volOptions = filterDrink === "all" ? [] :
    Array.from(new Set(records.filter(r => r.drink_id === filterDrink).map(r => r.vol_cl))).sort((a,b)=>a-b)

  // Filter + group by drink+vol
  const filtered = records
    .filter(r => filterDrink === "all" || r.drink_id === filterDrink)
    .filter(r => filterVol === "all" || r.vol_cl === filterVol)

  // Group by drink+vol combo for display when "all" selected
  const grouped: {[key:string]: DuelRecord[]} = {}
  filtered.forEach(r => {
    const key = `${r.drink_id}_${r.vol_cl}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  const BG: any = {
    position:"fixed", inset:0, background:"#0a0a14", zIndex:500,
    overflowY:"auto", padding:"24px 16px 80px"
  }

  return (
    <div style={BG}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🏎️ Classement Duels
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      {/* Filters */}
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>
          Filtrer par boisson
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom: volOptions.length > 0 ? 10 : 0 }}>
          <button onClick={() => { setFilterDrink("all"); setFilterVol("all") }}
            style={{ padding:"5px 12px", borderRadius:16, border:"none", cursor:"pointer", fontSize:11, fontWeight:filterDrink==="all"?700:400, background:filterDrink==="all"?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e", color:filterDrink==="all"?"#fff":"#6b7280" }}>
            Tous
          </button>
          {drinkOptions.map(d => (
            <button key={d.id} onClick={() => { setFilterDrink(d.id); setFilterVol("all") }}
              style={{ padding:"5px 12px", borderRadius:16, border:"none", cursor:"pointer", fontSize:11, fontWeight:filterDrink===d.id?700:400, background:filterDrink===d.id?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e", color:filterDrink===d.id?"#fff":"#6b7280" }}>
              {d.name}
            </button>
          ))}
        </div>
        {/* Volume filter */}
        {volOptions.length > 1 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
            <button onClick={() => setFilterVol("all")}
              style={{ padding:"4px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:10, fontWeight:filterVol==="all"?700:400, background:filterVol==="all"?"#3b1f6a":"#1e1e2e", color:filterVol==="all"?"#c084fc":"#6b7280" }}>
              Tous volumes
            </button>
            {volOptions.map(v => (
              <button key={v} onClick={() => setFilterVol(v)}
                style={{ padding:"4px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:10, fontWeight:filterVol===v?700:400, background:filterVol===v?"#3b1f6a":"#1e1e2e", color:filterVol===v?"#c084fc":"#6b7280" }}>
                {v}cl
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563" }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🏎️</div>
          <div style={{ fontSize:13 }}>Aucun duel enregistré pour l'instant</div>
          <div style={{ fontSize:11, marginTop:4, color:"#374151" }}>Joue des duels pour remplir le classement !</div>
        </div>
      ) : filterDrink !== "all" ? (
        // Specific drink selected — show flat leaderboard
        <div style={{ background:"#13131f", borderRadius:14, border:"1px solid #2a2a3e" }}>
          <div style={{ padding:"12px 14px", borderBottom:"1px solid #1a1a2a" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>
              {filtered[0]?.drink_name} — {filterVol !== "all" ? `${filterVol}cl` : "tous volumes"}
            </div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>{filtered.length} duel{filtered.length>1?"s":""}</div>
          </div>
          {filtered.slice(0,10).map((r, i) => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:i<Math.min(filtered.length,10)-1?"1px solid #1a1a2a":"none" }}>
              <span style={{ fontSize:16, minWidth:24 }}>{getMedal(i)}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{r.pseudo}</div>
                <div style={{ fontSize:10, color:"#6b7280" }}>
                  {r.vol_cl}cl · {r.won ? "✅ Victoire" : "❌ Défaite"}
                </div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color: i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#b45309":"#c084fc" }}>
                {fmt(r.time_ms)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // All drinks — show grouped by drink+vol
        <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
          {Object.entries(grouped).map(([key, recs]) => {
            const r0 = recs[0]
            const drink = DRINK_BASES.find(d => d.id === r0.drink_id)
            return (
              <div key={key} style={{ background:"#13131f", borderRadius:14, border:"1px solid #2a2a3e" }}>
                <div style={{ padding:"12px 14px", borderBottom:"1px solid #1a1a2a", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>{drink?.emoji || "🍺"}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{r0.drink_name} — {r0.vol_cl}cl</div>
                    <div style={{ fontSize:10, color:"#6b7280" }}>{recs.length} duel{recs.length>1?"s":""}</div>
                  </div>
                </div>
                {recs.slice(0,3).map((r, i) => (
                  <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderBottom:i<Math.min(recs.length,3)-1?"1px solid #1a1a2a":"none" }}>
                    <span style={{ fontSize:14, minWidth:22 }}>{getMedal(i)}</span>
                    <span style={{ flex:1, fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{r.pseudo}</span>
                    <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:i===0?"#fbbf24":i===1?"#94a3b8":"#b45309" }}>{fmt(r.time_ms)}</span>
                  </div>
                ))}
                {recs.length > 3 && (
                  <button onClick={() => { setFilterDrink(r0.drink_id); setFilterVol(r0.vol_cl) }}
                    style={{ width:"100%", padding:"8px", borderRadius:"0 0 14px 14px", border:"none", cursor:"pointer", background:"#1e1e2e", color:"#6b7280", fontSize:11 }}>
                    Voir les {recs.length} records →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
