"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { DRINK_BASES, calcCurrentBAC, cmToMeters, type DrinkEntry } from "@/lib/drinks"

function PodiumChart({ members }: { members: any[] }) {
  const sorted = [...members].filter(m => !m.is_sam)
    .sort((a, b) => b.dist - a.dist).slice(0, 3)
  const maxDist = sorted[0]?.dist || 1
  const heights = [180, 130, 100]
  const medals = ["🥇", "🥈", "🥉"]
  const colors = ["#c084fc", "#9ca3af", "#b45309"]
  const order = [1, 0, 2] // podium order: 2nd left, 1st center, 3rd right

  return (
    <div style={{ background:"#13131f",borderRadius:16,padding:20,border:"1px solid #2a2a3e",marginBottom:16 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:2,textTransform:"uppercase" as const,textAlign:"center",marginBottom:20 }}>
        🏆 Podium
      </div>
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"center",gap:8,height:220 }}>
        {order.map(idx => {
          const m = sorted[idx]
          if (!m) return <div key={idx} style={{ flex:1 }}/>
          const h = heights[idx]
          const barH = Math.max(40, (m.dist / maxDist) * h)
          return (
            <div key={m.user_id} style={{ flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",gap:6 }}>
              <div style={{ fontSize:28 }}>{m.avatar}</div>
              <div style={{ fontSize:11,fontWeight:700,color:"#e2e8f0",textAlign:"center" }}>{m.pseudo}</div>
              <div style={{ fontSize:12,color:colors[idx],fontWeight:700,fontFamily:"'Bebas Neue',cursive" }}>{m.dist.toFixed(1)}m</div>
              <div style={{ width:"100%",background:`linear-gradient(180deg,${colors[idx]},${colors[idx]}80)`,borderRadius:"8px 8px 0 0",height:barH,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8,fontSize:22,transition:"height .5s" }}>
                {medals[idx]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FinishedRace({ race, onBack }: { race: any, onBack: () => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [tab, setTab] = useState<"stats" | "photos">("stats")
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: membersData } = await supabase.from("group_members").select("*").eq("group_id", race.id)
      if (!membersData) return
      const userIds = membersData.map((m: any) => m.user_id)
      const { data: profilesData } = await supabase.from("profiles").select("*").in("id", userIds)
      const profileMap: Record<string, any> = {}
      ;(profilesData || []).forEach((p: any) => { profileMap[p.id] = p })
      const enriched = membersData.map((m: any) => {
        const prof = profileMap[m.user_id] || {}
        const drinks: DrinkEntry[] = (m.drinks_log || []).map((e: any) => {
          if (typeof e === "string") {
            const base = DRINK_BASES.find(b => b.id === e)
            if (!base) return null
            return { id: e, drinkId: base.id, name: base.name, emoji: base.emoji, vol_cl: base.volumes[0], degree_pct: base.degree_pct, alcohol_g: base.volumes[0] * 10 * (base.degree_pct / 100) * 0.8, color: base.color, addedAt: Date.now() }
          }
          return e
        }).filter(Boolean)
        return { ...m, pseudo: prof.pseudo || "?", avatar: prof.avatar || "🐺", weight_kg: prof.weight_kg || 70, sex: prof.sex || "M", drinks, dist: drinks.reduce((s: number, d: DrinkEntry) => s + cmToMeters(d.vol_cl), 0) }
      })
      setMembers(enriched)
      const { data: photosData } = await supabase.from("group_photos").select("*").eq("group_id", race.id).order("created_at", { ascending: false })
      setPhotos(photosData || [])
    }
    load()
  }, [race.id])

  const sorted = [...members].filter(m => !m.is_sam).sort((a, b) => b.dist - a.dist)
  const sam = members.find(m => m.is_sam)
  const totalDist = sorted.reduce((s, m) => s + m.dist, 0)

  const downloadPhoto = (url: string, name: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click()
  }

  return (
    <div style={{ background:"#0a0a14",minHeight:"100vh",padding:"16px 16px 40px",maxWidth:480,margin:"0 auto" }}>
      <button onClick={onBack} style={{ background:"none",border:"none",color:"#6b7280",fontSize:13,cursor:"pointer",marginBottom:16,padding:0 }}>← Retour</button>
      <div style={{ textAlign:"center",marginBottom:20 }}>
        <div style={{ fontSize:40,marginBottom:6 }}>🏁</div>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 4px" }}>{race.name}</h1>
        <p style={{ color:"#4b5563",fontSize:11,margin:0 }}>{new Date(race.created_at).toLocaleDateString("fr-FR", { weekday:"long",day:"numeric",month:"long" })}</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        {[{id:"stats",label:"📊 Stats"},{id:"photos",label:`📸 Photos (${photos.length})`}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex:1,padding:"11px",borderRadius:12,cursor:"pointer",background:tab===t.id?"linear-gradient(135deg,#a855f7,#ec4899)":"#13131f",color:tab===t.id?"#fff":"#6b7280",fontSize:13,fontWeight:700,border:tab===t.id?"none":"1px solid #2a2a3e" } as any}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && (<>
        <PodiumChart members={members}/>

        {/* Full leaderboard */}
        <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>Classement complet</div>
          {sorted.map((m, i) => (
            <div key={m.user_id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<sorted.length-1?"1px solid #1a1a2a":"none" }}>
              <span style={{ fontSize:18,minWidth:26 }}>{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]||"·"}</span>
              <span style={{ fontSize:20 }}>{m.avatar}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,color:"#e2e8f0" }}>{m.pseudo}</div>
                <div style={{ fontSize:10,color:"#6b7280" }}>{m.drinks.length} verre{m.drinks.length>1?"s":""} · {m.drinks.reduce((s:number,d:DrinkEntry)=>s+d.alcohol_g,0).toFixed(0)}g alcool</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#c084fc" }}>{m.dist.toFixed(1)}m</div>
                <div style={{ fontSize:10,color:"#6b7280" }}>{calcCurrentBAC(m.drinks,m.weight_kg,m.sex).toFixed(2)}‰ peak</div>
              </div>
            </div>
          ))}
          {sam && (
            <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid #1a1a2a",marginTop:4 }}>
              <span style={{ fontSize:18,minWidth:26 }}>🚗</span>
              <span style={{ fontSize:20 }}>{sam.avatar}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,color:"#4ade80" }}>{sam.pseudo}</div>
                <div style={{ fontSize:10,color:"#4ade80" }}>SAM — Héros de la soirée</div>
              </div>
            </div>
          )}
        </div>

        {/* Group total */}
        <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:14,border:"1px solid #3b1f6a" }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,marginBottom:4 }}>DISTANCE TOTALE DU GROUPE</div>
          <div style={{ fontSize:32,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{totalDist.toFixed(1)}m</div>
          <div style={{ fontSize:11,color:"#6b7280" }}>{members.length} participants 🏆</div>
        </div>
      </>)}

      {tab === "photos" && (
        photos.length === 0 ? (
          <div style={{ textAlign:"center",padding:"60px 0",color:"#4b5563" }}>
            <div style={{ fontSize:48,marginBottom:12 }}>📷</div>
            <div style={{ fontSize:13 }}>Aucune photo pour cette soirée</div>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {photos.map((p: any) => (
              <div key={p.id} style={{ position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #2a2a3e" }}>
                <img src={p.url} style={{ width:"100%",aspectRatio:"1",objectFit:"cover",display:"block" }} alt="photo"/>
                <button onClick={() => downloadPhoto(p.url, `drunkrace_${p.id}.jpg`)}
                  style={{ position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.75)",border:"none",borderRadius:8,color:"#fff",fontSize:16,padding:"4px 8px",cursor:"pointer" }}>
                  ⬇️
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
