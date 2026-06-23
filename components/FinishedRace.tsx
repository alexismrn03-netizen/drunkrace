"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import DrunkAvatar, { type AvatarConfig, DEFAULT_AVATAR } from "./DrunkAvatar"
import { calcCurrentBAC } from "@/lib/drinks"

function parseAvatar(raw: any): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR
  if (typeof raw === "string") { try { return { ...DEFAULT_AVATAR, ...JSON.parse(raw) } } catch { return DEFAULT_AVATAR } }
  if (typeof raw === "object") return { ...DEFAULT_AVATAR, ...raw }
  return DEFAULT_AVATAR
}

// ── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 8 + Math.random() * 10,
      h: 4 + Math.random() * 6,
      color: ["#c084fc","#ec4899","#fbbf24","#4ade80","#60a5fa","#f87171","#a855f7"][Math.floor(Math.random()*7)],
      vy: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 3,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      opacity: 0.8 + Math.random() * 0.2,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.vrot
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h)
        ctx.restore()
      })
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:1 }}/>
}

// ── PODIUM ────────────────────────────────────────────────────────────────────
function PodiumBlock({ member, rank, totalDist, delay }: any) {
  const [visible, setVisible] = useState(false)
  const heights = [180, 130, 100]
  const colors = ["#fbbf24", "#94a3b8", "#b45309"]
  const labels = ["🥇", "🥈", "🥉"]
  const h = heights[rank] || 80
  const c = colors[rank] || "#6b7280"

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end" }}>
      {/* Avatar + name above podium */}
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition:"all 0.6s cubic-bezier(.34,1.4,.64,1)", marginBottom:8, textAlign:"center" }}>
        <div style={{ marginBottom:4 }}>
          <DrunkAvatar config={parseAvatar(member.avatar_config)} bac={0} size={rank===0?70:54} animate={false}/>
        </div>
        <div style={{ fontSize:rank===0?13:11, fontWeight:700, color:rank===0?"#fbbf24":"#e2e8f0", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
          {member.pseudo}
        </div>
        <div style={{ fontSize:rank===0?16:12, fontWeight:700, color:c, fontFamily:"'Bebas Neue',cursive", letterSpacing:1 }}>
          {totalDist.toFixed(1)}m
        </div>
      </div>
      {/* Block */}
      <div style={{
        width: rank===0 ? 90 : 72,
        height: visible ? h : 0,
        background: `linear-gradient(180deg, ${c}cc, ${c}44)`,
        border: `2px solid ${c}`,
        borderRadius:"8px 8px 0 0",
        transition:`height 0.8s cubic-bezier(.34,1.2,.64,1) ${delay}ms`,
        display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:10,
        position:"relative",
      }}>
        <span style={{ fontSize:rank===0?28:20 }}>{labels[rank]}</span>
        {rank===0 && (
          <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", fontSize:24 }}>✨</div>
        )}
      </div>
    </div>
  )
}

// ── FINISHED RACE ─────────────────────────────────────────────────────────────
export default function FinishedRace({ race, onBack }: { race: any, onBack: () => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [showConfetti, setShowConfetti] = useState(true)
  const [phase, setPhase] = useState<"podium"|"stats"|"photos">("podium")
  const supabase = createClient()

  // Sound: fanfare
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = "square"
        o.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.15, t + 0.05)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        o.start(t); o.stop(t + 0.4)
      })
    } catch (e) {}

    const t = setTimeout(() => setShowConfetti(false), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: membersData } = await supabase.from("group_members").select("*").eq("group_id", race.id)
      if (!membersData) return
      const { data: profilesData } = await supabase.from("profiles").select("*").in("id", membersData.map((m:any)=>m.user_id))
      const profileMap: Record<string,any> = {}
      ;(profilesData||[]).forEach((p:any) => { profileMap[p.id] = p })
      const { data: eventsData } = await supabase.from("race_events").select("*").eq("group_id", race.id)
      const { data: photosData } = await supabase.from("group_photos").select("*").eq("group_id", race.id).order("created_at", { ascending:false })
      const enriched = membersData.map((m:any) => {
        const prof = profileMap[m.user_id] || {}
        const drinks = m.drinks_log || []
        const dist = drinks.reduce((s:number, d:any) => {
          if (!d || typeof d !== "object") return s
          const alc = Number(d.alcohol_g) || 0
          const vol = Number(d.vol_cl) || 0
          return s + (alc>0&&vol>0 ? Math.pow(alc,0.6)*Math.pow(vol,0.4) : 0)
        }, 0)
        const bonus = (eventsData||[]).filter((e:any)=>e.target_user_id===m.user_id).reduce((s:number,e:any)=>s+e.distance_delta,0)
        return { ...m, pseudo:prof.pseudo||"?", avatar_config:prof.avatar_config||{}, dist:Math.max(0, dist+bonus), drinks, is_sam:m.is_sam }
      })
      setMembers(enriched)
      setEvents(eventsData || [])
      setPhotos(photosData || [])
    }
    load()
  }, [race.id])

  const drinkers = members.filter(m => !m.is_sam).sort((a,b) => b.dist - a.dist)
  const samMember = members.find(m => m.is_sam)
  const top3 = drinkers.slice(0, 3)
  const totalVerres = drinkers.reduce((s,m) => s + (m.drinks?.length||0), 0)
  const totalDist = drinkers.reduce((s,m) => s + m.dist, 0)
  const drinkCounts: Record<string,number> = {}
  drinkers.forEach(m => (m.drinks||[]).forEach((d:any) => { if(d?.name) drinkCounts[d.name] = (drinkCounts[d.name]||0)+1 }))
  const favoriteDrink = Object.entries(drinkCounts).sort((a,b)=>b[1]-a[1])[0]

  // Podium order: 2nd left, 1st center, 3rd right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumRanks = [1, 0, 2]

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a14", position:"relative", overflowX:"hidden" }}>
      {showConfetti && <Confetti/>}

      {/* Header */}
      <div style={{ textAlign:"center", paddingTop:28, paddingBottom:16, position:"relative", zIndex:2 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, letterSpacing:4, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          🏁 FIN DE SOIRÉE !
        </div>
        <div style={{ color:"#6b7280", fontSize:11, marginTop:2 }}>{race.name || "Soirée DrunkRace"}</div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, margin:"0 16px 20px", borderRadius:12, overflow:"hidden", border:"1px solid #1f2937", position:"relative", zIndex:2 }}>
        {[{id:"podium",l:"🏆 Podium"},{id:"stats",l:"📊 Stats"},{id:"photos",l:"📸 Photos"}].map(t => (
          <button key={t.id} onClick={()=>setPhase(t.id as any)} style={{ flex:1, padding:"10px 0", border:"none", cursor:"pointer", background:phase===t.id?"linear-gradient(135deg,#a855f720,#ec489920)":"#13131f", color:phase===t.id?"#c084fc":"#6b7280", fontSize:11, fontWeight:phase===t.id?700:400, outline:phase===t.id?"2px solid #a855f730":"none" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* PODIUM */}
      {phase === "podium" && (
        <div style={{ position:"relative", zIndex:2, padding:"0 16px" }}>
          {/* Podium visual */}
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:8, marginBottom:24, paddingBottom:4, borderBottom:"3px solid #1f2937" }}>
            {podiumOrder.map((m, i) => m && (
              <PodiumBlock key={m.user_id} member={m} rank={podiumRanks[i]} totalDist={m.dist} delay={podiumRanks[i]===0?600:podiumRanks[i]===1?200:900}/>
            ))}
          </div>

          {/* Full ranking */}
          <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Classement complet</div>
            {drinkers.map((m, i) => (
              <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<drinkers.length-1?"1px solid #1a1a2a":"none" }}>
                <span style={{ fontSize:16, minWidth:24 }}>{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]||"•"}</span>
                <DrunkAvatar config={parseAvatar(m.avatar_config)} bac={0} size={32} animate={false}/>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{m.pseudo}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#c084fc", fontFamily:"'Bebas Neue',cursive" }}>{m.dist.toFixed(1)}m</span>
                <span style={{ fontSize:10, color:"#6b7280" }}>{m.drinks?.length||0}🍺</span>
              </div>
            ))}
            {samMember && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop:"1px solid #2a2a3e", marginTop:4 }}>
                <span style={{ fontSize:16, minWidth:24 }}>🚗</span>
                <DrunkAvatar config={parseAvatar(samMember.avatar_config)} bac={0} size={32} animate={false}/>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#4ade80" }}>{samMember.pseudo}</span>
                <span style={{ fontSize:11, color:"#4ade80" }}>Héros SAM 🦸</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATS */}
      {phase === "stats" && (
        <div style={{ padding:"0 16px", position:"relative", zIndex:2 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { l:"Total verres", v:totalVerres, icon:"🍺", c:"#c084fc" },
              { l:"Distance totale", v:`${totalDist.toFixed(1)}m`, icon:"🏁", c:"#ec4899" },
              { l:"Participants", v:drinkers.length, icon:"👥", c:"#38bdf8" },
              { l:"Événements", v:events.length, icon:"🎭", c:"#fbbf24" },
            ].map(s => (
              <div key={s.l} style={{ background:"#13131f", borderRadius:12, padding:14, border:"1px solid #2a2a3e" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.c, fontFamily:"'Bebas Neue',cursive" }}>{s.v}</div>
                <div style={{ fontSize:10, color:"#6b7280" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {favoriteDrink && (
            <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)", borderRadius:14, padding:14, border:"1px solid #3b1f6a", marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, marginBottom:6 }}>🍹 BOISSON DU SOIR</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#c084fc" }}>{favoriteDrink[0]}</div>
              <div style={{ fontSize:11, color:"#6b7280" }}>commandée {favoriteDrink[1]} fois</div>
            </div>
          )}

          {/* Events recap */}
          {events.length > 0 && (
            <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Événements de la soirée</div>
              {events.slice(0,6).map((e:any,i:number) => (
                <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:i<Math.min(events.length,6)-1?"1px solid #1a1a2a":"none" }}>
                  <span style={{ fontSize:14 }}>{e.type==="red_flag"?"🚩":e.type==="fastest_lap"?"⚡":e.type==="duel_win"?"🏎️":"🤜"}</span>
                  <span style={{ fontSize:11, color:"#9ca3af", flex:1 }}>
                    {e.type==="red_flag"?"Drapeau rouge":e.type==="fastest_lap"?"Fastest lap":e.type==="duel_win"?"Duel gagné":"Mini-jeu"}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:e.distance_delta>0?"#4ade80":"#f87171" }}>
                    {e.distance_delta>0?"+":""}{e.distance_delta}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PHOTOS */}
      {phase === "photos" && (
        <div style={{ padding:"0 16px", position:"relative", zIndex:2 }}>
          {photos.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📷</div>
              <div style={{ fontSize:13 }}>Aucune photo cette soirée</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {photos.map((p:any) => (
                <div key={p.id} style={{ borderRadius:12, overflow:"hidden", border:"1px solid #2a2a3e", aspectRatio:"1", position:"relative" }}>
                  <img src={p.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="soirée"/>
                  <button onClick={()=>window.open(p.url,"_blank")} style={{ position:"absolute", bottom:6, right:6, background:"rgba(0,0,0,.7)", border:"none", borderRadius:8, color:"#fff", fontSize:14, padding:"3px 7px", cursor:"pointer" }}>⬇️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back button */}
      <div style={{ padding:"20px 16px 40px", position:"relative", zIndex:2 }}>
        <button onClick={onBack} style={{ width:"100%", padding:"13px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"#13131f", color:"#9ca3af", fontSize:14, fontWeight:700 }}>
          ← Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
