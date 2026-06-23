"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import DrunkAvatar, { type AvatarConfig, DEFAULT_AVATAR } from "./DrunkAvatar"

function parseAvatar(raw: any): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR
  if (typeof raw === "string") { try { return { ...DEFAULT_AVATAR, ...JSON.parse(raw) } } catch { return DEFAULT_AVATAR } }
  return { ...DEFAULT_AVATAR, ...(typeof raw === "object" ? raw : {}) }
}

interface Props {
  user: any
  profile: any
  onClose: () => void
}

export default function GlobalProfile({ user, profile, onClose }: Props) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: memberships } = await supabase
        .from("group_members").select("*, groups(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setGroups(memberships || [])
      setLoading(false)
    }
    load()
  }, [])

  // Compute global stats
  const finishedGroups = groups.filter(m => m.groups?.status === "finished")
  const totalVerres = groups.reduce((s, m) => s + (Array.isArray(m.drinks_log) ? m.drinks_log.length : 0), 0)

  const totalDist = groups.reduce((s, m) => {
    const drinks = Array.isArray(m.drinks_log) ? m.drinks_log : []
    return s + drinks.reduce((ds: number, d: any) => {
      if (!d || typeof d !== "object") return ds
      const alc = Number(d.alcohol_g) || 0
      const vol = Number(d.vol_cl) || 0
      return ds + (alc > 0 && vol > 0 ? Math.pow(alc, 0.6) * Math.pow(vol, 0.4) : 0)
    }, 0)
  }, 0)

  // Favorite drink
  const drinkCounts: Record<string, { count: number, emoji: string }> = {}
  groups.forEach(m => {
    (Array.isArray(m.drinks_log) ? m.drinks_log : []).forEach((d: any) => {
      if (d?.name) {
        drinkCounts[d.name] = drinkCounts[d.name]
          ? { count: drinkCounts[d.name].count + 1, emoji: d.emoji || "🍺" }
          : { count: 1, emoji: d.emoji || "🍺" }
      }
    })
  })
  const favDrink = Object.entries(drinkCounts).sort((a, b) => b[1].count - a[1].count)[0]

  // Best distance in a single night
  const bestNight = groups.reduce((best: any, m) => {
    const drinks = Array.isArray(m.drinks_log) ? m.drinks_log : []
    const dist = drinks.reduce((s: number, d: any) => {
      if (!d || typeof d !== "object") return s
      const alc = Number(d.alcohol_g) || 0
      const vol = Number(d.vol_cl) || 0
      return s + (alc > 0 && vol > 0 ? Math.pow(alc, 0.6) * Math.pow(vol, 0.4) : 0)
    }, 0)
    return dist > (best?.dist || 0) ? { ...m, dist } : best
  }, null)

  const totalAlcohol = groups.reduce((s, m) => {
    return s + (Array.isArray(m.drinks_log) ? m.drinks_log : []).reduce((ds: number, d: any) => ds + (Number(d?.alcohol_g) || 0), 0)
  }, 0)

  const avgPerNight = finishedGroups.length > 0 ? totalVerres / finishedGroups.length : 0

  const STATS = [
    { icon:"🍺", label:"Total verres", value: totalVerres, color:"#c084fc" },
    { icon:"🏁", label:"Distance totale", value: `${totalDist.toFixed(0)}m`, color:"#ec4899" },
    { icon:"🎉", label:"Soirées", value: groups.length, color:"#fbbf24" },
    { icon:"⚗️", label:"Alcool total", value: `${totalAlcohol.toFixed(0)}g`, color:"#f87171" },
    { icon:"📈", label:"Moy. verres/soir", value: avgPerNight.toFixed(1), color:"#38bdf8" },
    { icon:"🔥", label:"Calories", value: `~${(totalAlcohol * 7).toFixed(0)}`, color:"#fb923c" },
  ]

  return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a14", zIndex:500, overflowY:"auto" }}>
      <div style={{ padding:"24px 16px 80px", maxWidth:480, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
            Profil Global
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        {/* Profile card */}
        <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)", borderRadius:20, padding:20, border:"1px solid #3b1f6a", marginBottom:20, textAlign:"center" }}>
          <DrunkAvatar config={parseAvatar(profile?.avatar_config)} bac={0} size={90} animate={false}/>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#e2e8f0", letterSpacing:2, marginTop:8 }}>{profile?.pseudo || "Joueur"}</div>
          <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>{user.email}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:14 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:700, color:"#c084fc", fontFamily:"'Bebas Neue',cursive" }}>{groups.length}</div>
              <div style={{ fontSize:10, color:"#6b7280" }}>Soirées</div>
            </div>
            <div style={{ width:1, background:"#2a2a3e" }}/>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:700, color:"#ec4899", fontFamily:"'Bebas Neue',cursive" }}>{totalVerres}</div>
              <div style={{ fontSize:10, color:"#6b7280" }}>Verres</div>
            </div>
            <div style={{ width:1, background:"#2a2a3e" }}/>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:700, color:"#fbbf24", fontFamily:"'Bebas Neue',cursive" }}>{totalDist.toFixed(0)}m</div>
              <div style={{ fontSize:10, color:"#6b7280" }}>Distance</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background:"#13131f", borderRadius:12, padding:14, border:"1px solid #2a2a3e" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:"'Bebas Neue',cursive" }}>{s.value}</div>
              <div style={{ fontSize:10, color:"#6b7280" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Favorite drink */}
        {favDrink && (
          <div style={{ background:"linear-gradient(135deg,#0c1a3a,#071020)", borderRadius:14, padding:16, border:"1px solid #1e3a8a", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:40 }}>{favDrink[1].emoji}</div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:2 }}>🏆 Boisson favorite</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>{favDrink[0]}</div>
              <div style={{ fontSize:11, color:"#60a5fa" }}>commandée {favDrink[1].count} fois</div>
            </div>
          </div>
        )}

        {/* Best night */}
        {bestNight && (
          <div style={{ background:"linear-gradient(135deg,#1a0a00,#140700)", borderRadius:14, padding:16, border:"1px solid #92400e", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:36 }}>🔥</div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:2 }}>Soirée la plus folle</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#e2e8f0" }}>{bestNight.groups?.name || "Soirée"}</div>
              <div style={{ fontSize:11, color:"#fb923c" }}>{bestNight.dist.toFixed(1)}m — {Array.isArray(bestNight.drinks_log)?bestNight.drinks_log.length:0} verres</div>
            </div>
          </div>
        )}

        {/* MAP placeholder — shows list of parties with location */}
        <div style={{ background:"#13131f", borderRadius:14, padding:16, border:"1px solid #2a2a3e", marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:12 }}>📍 Historique des soirées</div>
          {loading ? (
            <div style={{ color:"#4b5563", fontSize:12, textAlign:"center", padding:"20px 0" }}>Chargement…</div>
          ) : groups.length === 0 ? (
            <div style={{ color:"#4b5563", fontSize:12, textAlign:"center", padding:"20px 0" }}>Aucune soirée pour l'instant</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
              {groups.map((m: any, i: number) => {
                const drinks = Array.isArray(m.drinks_log) ? m.drinks_log : []
                const dist = drinks.reduce((s: number, d: any) => {
                  if (!d || typeof d !== "object") return s
                  const alc = Number(d.alcohol_g) || 0
                  const vol = Number(d.vol_cl) || 0
                  return s + (alc > 0 && vol > 0 ? Math.pow(alc, 0.6) * Math.pow(vol, 0.4) : 0)
                }, 0)
                const date = new Date(m.created_at).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
                const statusColor = m.groups?.status === "finished" ? "#4ade80" : m.groups?.status === "active" ? "#fbbf24" : "#6b7280"
                return (
                  <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#1e1e2e", borderRadius:10, border:"1px solid #2a2a3e" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:statusColor, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                        {m.groups?.name || `Soirée #${groups.length - i}`}
                      </div>
                      <div style={{ fontSize:10, color:"#6b7280" }}>{date}</div>
                    </div>
                    <div style={{ textAlign:"right" as const, flexShrink:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#c084fc", fontFamily:"'Bebas Neue',cursive" }}>{dist.toFixed(1)}m</div>
                      <div style={{ fontSize:10, color:"#6b7280" }}>{drinks.length}🍺</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Progress bars for fun */}
        <div style={{ background:"#13131f", borderRadius:14, padding:16, border:"1px solid #2a2a3e" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:14 }}>🏅 Achievements</div>
          {[
            { label:"Soirées", current:groups.length, max:10, color:"#c084fc", emoji:"🎉" },
            { label:"Distance totale", current:Math.min(totalDist, 500), max:500, suffix:`${totalDist.toFixed(0)}m`, color:"#ec4899", emoji:"🏁" },
            { label:"Verres totaux", current:Math.min(totalVerres, 100), max:100, suffix:`${totalVerres}`, color:"#fbbf24", emoji:"🍺" },
          ].map(a => (
            <div key={a.label} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, color:"#9ca3af" }}>{a.emoji} {a.label}</span>
                <span style={{ fontSize:11, color:a.color, fontWeight:700 }}>{a.suffix || a.current}/{a.max}</span>
              </div>
              <div style={{ height:8, background:"#1e1e2e", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min((a.current/a.max)*100,100)}%`, background:`linear-gradient(90deg,${a.color}80,${a.color})`, borderRadius:4, transition:"width 1s ease-out" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
