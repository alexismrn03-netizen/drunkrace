"use client"
import { useState, useEffect } from "react"
import { DRINK_BASES, DRINK_CATEGORIES, alcoholGrams, calcBACAtTime, calcCurrentBAC, calcPeak, calcSoberTime, getBACStatus, fmtTime, cmToMeters, calcDistance, type DrinkEntry } from "@/lib/drinks"

function BACForecast({ drinks, weight_kg, sex }: { drinks: DrinkEntry[], weight_kg: number, sex: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  if (drinks.length === 0) return (
    <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14,textAlign:"center" }}>
      <div style={{ fontSize:24,marginBottom:6 }}>📈</div>
      <div style={{ color:"#4b5563",fontSize:12 }}>Ajoute une boisson pour voir les prévisions</div>
    </div>
  )

  const currentBAC = calcCurrentBAC(drinks, weight_kg, sex)
  const peak = calcPeak(drinks, weight_kg, sex)
  const driveTime = calcSoberTime(drinks, weight_kg, sex, 0.5)
  const soberTime = calcSoberTime(drinks, weight_kg, sex, 0.0)
  const st = getBACStatus(currentBAC)

  const first = Math.min(...drinks.map(d => d.addedAt))
  const end = soberTime ? soberTime + 30 * 60000 : now + 3600000
  const W = 280, H = 70
  const steps = 40
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = first + (i / steps) * (end - first)
    return { x: (i / steps) * W, y: H - Math.max(0, calcBACAtTime(drinks, weight_kg, sex, t)) / Math.max(calcPeak(drinks, weight_kg, sex).bac, 0.1) * H * 0.88 }
  })
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const nowX = Math.min(Math.max((now - first) / (end - first), 0), 1) * W

  return (
    <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>📈 Prévisions alcoolémie</div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9,color:"#6b7280",marginBottom:1 }}>MAINTENANT</div>
          <div style={{ fontSize:26,fontWeight:700,color:st.color,fontFamily:"'Bebas Neue',cursive" }}>{currentBAC.toFixed(3)}‰</div>
          <div style={{ fontSize:11,color:st.color }}>{st.label}</div>
        </div>
        <div style={{ flex:1,textAlign:"center" }}>
          <div style={{ fontSize:9,color:"#6b7280",marginBottom:1 }}>PIC ESTIMÉ</div>
          <div style={{ fontSize:20,fontWeight:700,color:"#f87171",fontFamily:"'Bebas Neue',cursive" }}>{peak.bac.toFixed(3)}‰</div>
          <div style={{ fontSize:10,color:"#6b7280" }}>à {fmtTime(peak.atMs)}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background:"#0f0f1a",borderRadius:10,padding:"8px 4px",marginBottom:12,overflowX:"hidden" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {[0.2, 0.5, 1.0].map(v => {
            const yv = H - (v / Math.max(peak.bac, 0.1)) * H * 0.88
            if (yv < 0 || yv > H) return null
            return <g key={v}>
              <line x1={0} y1={yv} x2={W} y2={yv} stroke={v === 0.5 ? "#f59e0b40" : "#ffffff08"} strokeWidth={1} strokeDasharray={v===0.5?"4,3":""}/>
              <text x={3} y={yv - 2} fill="#4b5563" fontSize={7}>{v}‰</text>
            </g>
          })}
          <path d={pathD + ` L${W},${H} L0,${H} Z`} fill="url(#bg)"/>
          <path d={pathD} fill="none" stroke="#a855f7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
          <line x1={nowX} y1={0} x2={nowX} y2={H} stroke="#ffffff35" strokeWidth={1} strokeDasharray="3,3"/>
          <circle cx={points.reduce((best,p) => p.y < best.y ? p : best, points[0]).x}
                  cy={points.reduce((best,p) => p.y < best.y ? p : best, points[0]).y}
                  r={3.5} fill="#f87171"/>
        </svg>
      </div>

      {/* Timings */}
      <div style={{ display:"flex",gap:8 }}>
        <div style={{ flex:1,background:driveTime&&driveTime<=now?"#1a2e0a":"#13131f",border:`1px solid ${driveTime&&driveTime<=now?"#166534":"#2a2a3e"}`,borderRadius:10,padding:"8px" }}>
          <div style={{ fontSize:9,color:"#4ade80",fontWeight:700,textTransform:"uppercase" as const }}>🚗 Conduire</div>
          <div style={{ fontSize:14,fontWeight:700,color:"#4ade80",fontFamily:"'Bebas Neue',cursive",marginTop:2 }}>
            {!driveTime || driveTime <= now ? "✅ OK" : fmtTime(driveTime)}
          </div>
          <div style={{ fontSize:9,color:"#6b7280" }}>retour à 0,5‰</div>
        </div>
        <div style={{ flex:1,background:"#13131f",border:"1px solid #3b1f6a",borderRadius:10,padding:"8px" }}>
          <div style={{ fontSize:9,color:"#c084fc",fontWeight:700,textTransform:"uppercase" as const }}>😇 Sobre</div>
          <div style={{ fontSize:14,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive",marginTop:2 }}>
            {!soberTime || soberTime <= now ? "✅ OK" : fmtTime(soberTime)}
          </div>
          <div style={{ fontSize:9,color:"#6b7280" }}>retour à 0‰</div>
        </div>
        <div style={{ flex:1,background:"#13131f",border:"1px solid #92400e",borderRadius:10,padding:"8px" }}>
          <div style={{ fontSize:9,color:"#fb923c",fontWeight:700,textTransform:"uppercase" as const }}>📈 Pic</div>
          <div style={{ fontSize:14,fontWeight:700,color:"#fb923c",fontFamily:"'Bebas Neue',cursive",marginTop:2 }}>{fmtTime(peak.atMs)}</div>
          <div style={{ fontSize:9,color:"#6b7280" }}>{peak.bac.toFixed(3)}‰</div>
        </div>
      </div>
      <p style={{ color:"#374151",fontSize:9,margin:"8px 0 0",lineHeight:1.5 }}>⚠️ Estimation Widmark + absorption 90min. Ne conduis jamais sans certitude.</p>
    </div>
  )
}

export default function DrinkTab({ myMember, samMember, onAddDrink, onUndo }: any) {
  const [cat, setCat] = useState("Bière")
  const [selectedBase, setSelectedBase] = useState<string | null>(null)
  const [selectedVol, setSelectedVol] = useState<number | null>(null)
  const [selectedMixer, setSelectedMixer] = useState<string>("Pure")
  const [added, setAdded] = useState(false)

  const isSam = samMember && myMember.user_id === samMember.user_id
  const currentBAC = calcCurrentBAC(myMember.drinks, myMember.weight_kg, myMember.sex)
  const samLimit = samMember?.youngDriver ? 0.2 : 0.5
  const samLocked = isSam && currentBAC >= samLimit
  const dist = myMember.drinks.reduce((s: number, d: DrinkEntry) => s + calcDistance(d.alcohol_g, d.vol_cl), 0)
  const st = getBACStatus(currentBAC)
  const base = selectedBase ? DRINK_BASES.find(b => b.id === selectedBase) : null
  const catBases = DRINK_BASES.filter(b => b.category === cat)

  const handleSelectBase = (id: string) => {
    const b = DRINK_BASES.find(x => x.id === id)!
    setSelectedBase(id); setSelectedVol(b.volumes[0])
    setSelectedMixer(b.mixers ? b.mixers[0] : "Pure")
  }

  const handleAdd = () => {
    if (!base || !selectedVol || samLocked) return
    const entry: DrinkEntry = {
      id: `${base.id}_${Date.now()}`,
      drinkId: base.id,
      name: base.name + (base.mixers && selectedMixer !== "Pure" ? ` + ${selectedMixer}` : ""),
      emoji: base.emoji, vol_cl: selectedVol, degree_pct: base.degree_pct,
      alcohol_g: alcoholGrams(selectedVol, base.degree_pct),
      color: base.color,
      mixer: base.mixers ? selectedMixer : undefined,
      addedAt: Date.now(),
    }
    onAddDrink(entry); setAdded(true); setTimeout(() => setAdded(false), 1500)
    setSelectedBase(null); setSelectedVol(null)
  }

  const previewAlcG = base && selectedVol ? alcoholGrams(selectedVol, base.degree_pct) : 0
  const previewBACAdd = base && selectedVol ? parseFloat((previewAlcG / (myMember.weight_kg * (myMember.sex === "M" ? 0.68 : 0.55) * 10)).toFixed(3)) : 0

  const S: any = {
    cat: (a: boolean) => ({ padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",background:a?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e",color:a?"#fff":"#6b7280",fontSize:11,fontWeight:a?700:400,whiteSpace:"nowrap" }),
    base: (a: boolean, c: string) => ({ padding:"10px 8px",borderRadius:11,border:"none",cursor:"pointer",background:a?`linear-gradient(135deg,${c}35,${c}18)`:"#1e1e2e",outline:a?`2px solid ${c}`:"2px solid transparent",textAlign:"left",display:"flex",flexDirection:"column",gap:3,transition:"all .15s" }),
    vol: (a: boolean) => ({ flex:1,padding:"9px 4px",borderRadius:10,border:"none",cursor:"pointer",background:a?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:a?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:12,fontWeight:a?700:400 }),
    mix: (a: boolean) => ({ padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",background:a?"#3b1f6a":"#1e1e2e",outline:a?"2px solid #a855f7":"2px solid transparent",color:a?"#c084fc":"#6b7280",fontSize:11,fontWeight:a?700:400,whiteSpace:"nowrap" }),
  }

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      {/* Status */}
      <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:18,padding:16,marginBottom:14,border:"1px solid #3b1f6a" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:36 }}>{myMember.avatar}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16,fontWeight:700,color:"#e2e8f0" }}>{myMember.pseudo}</div>
            <div style={{ fontSize:12,color:st.color }}>{isSam ? "🚗 SAM · " : ""}{st.label}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:22,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{dist.toFixed(1)}m</div>
            <div style={{ fontSize:9,color:"#6b7280" }}>{myMember.drinks.length} verre{myMember.drinks.length > 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      {isSam && (
        <div style={{ background:samLocked?"#1c0505":"#0d2b0d",border:`1px solid ${samLocked?"#7f1d1d":"#166534"}`,borderRadius:12,padding:12,marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
            <span style={{ fontSize:12,fontWeight:700,color:samLocked?"#f87171":"#4ade80" }}>{samLocked?"🔒 LIMITE ATTEINTE !":"🚗 SAM — Limite légale"}</span>
            <span style={{ fontSize:12,color:samLocked?"#f87171":"#4ade80",fontWeight:700 }}>{currentBAC.toFixed(3)}‰ / {samLimit}‰</span>
          </div>
          <div style={{ height:8,borderRadius:4,background:"#1e1e2e",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${Math.min((currentBAC/samLimit)*100,100)}%`,background:samLocked?"#ef4444":"#4ade80",borderRadius:4,transition:"width .5s" }}/>
          </div>
        </div>
      )}

      <BACForecast drinks={myMember.drinks} weight_kg={myMember.weight_kg} sex={myMember.sex} />

      {!samLocked && (<>
        {/* Category tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
          {DRINK_CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCat(c); setSelectedBase(null); setSelectedVol(null) }} style={S.cat(cat === c)}>
              {c === "Bière" ? "🍺" : c === "Alcool fort" ? "🥃" : c === "Vin & Champagne" ? "🍷" : "🥃"} {c}
            </button>
          ))}
        </div>

        {/* Drink grid */}
        <div style={{ background:"#13131f",borderRadius:16,padding:12,border:"1px solid #2a2a3e",marginBottom:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>Choisis ta boisson</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
            {catBases.map(b => (
              <button key={b.id} onClick={() => handleSelectBase(b.id)} style={S.base(selectedBase === b.id, b.color)}>
                <span style={{ fontSize:20 }}>{b.emoji}</span>
                <span style={{ fontSize:10,fontWeight:600,color:"#e2e8f0",lineHeight:1.2 }}>{b.name}</span>
                <span style={{ fontSize:9,color:b.color }}>{b.degree_pct}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        {base && (
          <div style={{ background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:10 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>Volume</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
              {base.volumes.map(v => <button key={v} onClick={() => setSelectedVol(v)} style={{ ...S.vol(selectedVol === v), minWidth:52 }}>{v}cl</button>)}
            </div>
          </div>
        )}

        {/* Mixer */}
        {base?.mixers && base.mixers.length > 1 && (
          <div style={{ background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:10 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>Avec quoi ?</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
              {base.mixers.map(m => <button key={m} onClick={() => setSelectedMixer(m)} style={S.mix(selectedMixer === m)}>{m}</button>)}
            </div>
          </div>
        )}

        {/* Preview + Add */}
        {base && selectedVol && (
          <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:12,border:"1px solid #3b1f6a",marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0" }}>{base.emoji} {base.name}{base.mixers && selectedMixer !== "Pure" ? ` + ${selectedMixer}` : ""} {selectedVol}cl</div>
                <div style={{ fontSize:10,color:"#6b7280",marginTop:2 }}>{base.degree_pct}% · {previewAlcG.toFixed(1)}g alcool</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>+{calcDistance(previewAlcG,selectedVol).toFixed(1)}m</div>
                <div style={{ fontSize:10,color:"#f87171" }}>+{previewBACAdd.toFixed(3)}‰</div>
              </div>
            </div>
            <button onClick={handleAdd} style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,transform:added?"scale(.97)":"scale(1)",transition:"all .15s" }}>
              {added ? "✅ Ajouté !" : "Ajouter ce verre 🥂"}
            </button>
          </div>
        )}

        {/* History */}
        {myMember.drinks.length > 0 && (
          <div style={{ background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3e" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const }}>Historique</span>
              <button onClick={onUndo} style={{ background:"#1e1e2e",border:"1px solid #2a2a3e",borderRadius:8,color:"#9ca3af",fontSize:10,padding:"3px 8px",cursor:"pointer" }}>↩ Annuler</button>
            </div>
            {[...myMember.drinks].reverse().slice(0, 8).map((d: DrinkEntry, i: number) => (
              <div key={d.id || i} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i < 7 ? "1px solid #1e1e2e" : "none" }}>
                <span style={{ fontSize:15 }}>{d.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:"#e2e8f0" }}>{d.name} {d.vol_cl}cl</div>
                  <div style={{ fontSize:9,color:"#6b7280" }}>{d.degree_pct}% · {d.alcohol_g.toFixed(1)}g · {fmtTime(d.addedAt)}</div>
                </div>
                <span style={{ fontSize:10,color:d.color,fontWeight:600 }}>+{calcDistance(d.alcohol_g,d.vol_cl).toFixed(1)}m</span>
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}
