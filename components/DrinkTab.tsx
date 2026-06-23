"use client"
import { useState } from "react"
import { DRINK_BASES, DRINK_CATEGORIES, alcoholGrams, calcBACAtTime, calcCurrentBAC, calcPeak, calcSoberTime, getBACStatus, fmtTime, cmToMeters, type DrinkEntry } from "@/lib/drinks"

// ── BAC FORECAST CARD ────────────────────────────────────────────────────────
function BACForecast({ drinks, weight_kg, sex }: { drinks: DrinkEntry[], weight_kg: number, sex: string }) {
  const now = Date.now()
  const currentBAC = calcCurrentBAC(drinks, weight_kg, sex)
  const peak = calcPeak(drinks, weight_kg, sex)
  const driveTime = calcSoberTime(drinks, weight_kg, sex, 0.5)
  const soberTime = calcSoberTime(drinks, weight_kg, sex, 0.0)
  const st = getBACStatus(currentBAC)

  // Build mini chart: sample BAC every 15min from first drink to sober
  const first = drinks.length > 0 ? Math.min(...drinks.map(d => d.addedAt)) : now
  const end = soberTime ? soberTime + 30*60000 : now + 3600000
  const points: { x: number, bac: number }[] = []
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const t = first + (i / steps) * (end - first)
    points.push({ x: i / steps, bac: calcBACAtTime(drinks, weight_kg, sex, t) })
  }
  const maxBac = Math.max(...points.map(p => p.bac), 0.1)
  const nowX = Math.min((now - first) / (end - first), 1)

  const W = 300, H = 80
  const toSvg = (p: { x: number, bac: number }) => ({
    x: p.x * W,
    y: H - (p.bac / maxBac) * H * 0.9
  })
  const pathD = points.map((p, i) => {
    const { x, y } = toSvg(p)
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  if (drinks.length === 0) return (
    <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14,textAlign:"center" }}>
      <div style={{ fontSize:24,marginBottom:6 }}>📈</div>
      <div style={{ color:"#4b5563",fontSize:12 }}>Ajoute une boisson pour voir les prévisions</div>
    </div>
  )

  return (
    <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:12 }}>
        📈 Prévisions alcoolémie
      </div>

      {/* Current BAC big */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10,color:"#6b7280",marginBottom:2 }}>MAINTENANT</div>
          <div style={{ fontSize:28,fontWeight:700,color:st.color,fontFamily:"'Bebas Neue',cursive" }}>
            {currentBAC.toFixed(3)}‰
          </div>
          <div style={{ fontSize:11,color:st.color }}>{st.label}</div>
        </div>
        <div style={{ flex:1,textAlign:"center" }}>
          <div style={{ fontSize:10,color:"#6b7280",marginBottom:2 }}>PIC ESTIMÉ</div>
          <div style={{ fontSize:22,fontWeight:700,color:"#f87171",fontFamily:"'Bebas Neue',cursive" }}>
            {peak.bac.toFixed(3)}‰
          </div>
          <div style={{ fontSize:11,color:"#6b7280" }}>à {fmtTime(peak.atMs)}</div>
        </div>
      </div>

      {/* SVG chart */}
      <div style={{ background:"#0f0f1a",borderRadius:10,padding:"8px 4px",marginBottom:12,overflow:"hidden" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
          {/* Grid lines */}
          {[0.5, 1.0, 1.5].map(v => {
            const y = H - (v / maxBac) * H * 0.9
            if (y < 0) return null
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={W} y2={y} stroke="#ffffff08" strokeWidth={1}/>
                <text x={4} y={y-2} fill="#4b5563" fontSize={8}>{v}‰</text>
              </g>
            )
          })}
          {/* Legal limit 0.5 */}
          {maxBac > 0.5 && (
            <line x1={0} y1={H-(0.5/maxBac)*H*0.9} x2={W} y2={H-(0.5/maxBac)*H*0.9}
              stroke="#f59e0b50" strokeWidth={1} strokeDasharray="4,4"/>
          )}
          {/* Area fill */}
          <defs>
            <linearGradient id="bacGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <path d={pathD + ` L${W},${H} L0,${H} Z`} fill="url(#bacGrad)"/>
          {/* Line */}
          <path d={pathD} fill="none" stroke="#a855f7" strokeWidth={2} strokeLinecap="round"/>
          {/* Now marker */}
          {nowX >= 0 && nowX <= 1 && (
            <line x1={nowX*W} y1={0} x2={nowX*W} y2={H} stroke="#ffffff40" strokeWidth={1} strokeDasharray="3,3"/>
          )}
          {/* Peak dot */}
          <circle cx={toSvg(points.find(p=>Math.abs(p.bac-peak.bac)<0.001)||points[0]).x}
                  cy={toSvg(points.find(p=>Math.abs(p.bac-peak.bac)<0.001)||points[0]).y}
                  r={4} fill="#f87171"/>
        </svg>
      </div>

      {/* Timeline */}
      <div style={{ display:"flex",gap:8 }}>
        {driveTime && driveTime > now && (
          <div style={{ flex:1,background:"#1a2e0a",border:"1px solid #166534",borderRadius:10,padding:"8px 10px" }}>
            <div style={{ fontSize:9,color:"#4ade80",fontWeight:700,letterSpacing:1,textTransform:"uppercase" as const }}>🚗 Conduire</div>
            <div style={{ fontSize:15,fontWeight:700,color:"#4ade80",fontFamily:"'Bebas Neue',cursive" }}>{fmtTime(driveTime)}</div>
            <div style={{ fontSize:9,color:"#6b7280" }}>retour à 0,5‰</div>
          </div>
        )}
        {driveTime && driveTime <= now && (
          <div style={{ flex:1,background:"#1a2e0a",border:"1px solid #166534",borderRadius:10,padding:"8px 10px" }}>
            <div style={{ fontSize:9,color:"#4ade80",fontWeight:700 }}>🚗 Conduire</div>
            <div style={{ fontSize:13,fontWeight:700,color:"#4ade80" }}>OK maintenant</div>
          </div>
        )}
        {soberTime && soberTime > now && (
          <div style={{ flex:1,background:"#1a1a2e",border:"1px solid #3b1f6a",borderRadius:10,padding:"8px 10px" }}>
            <div style={{ fontSize:9,color:"#c084fc",fontWeight:700,letterSpacing:1,textTransform:"uppercase" as const }}>😇 Sobre</div>
            <div style={{ fontSize:15,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{fmtTime(soberTime)}</div>
            <div style={{ fontSize:9,color:"#6b7280" }}>retour à 0‰</div>
          </div>
        )}
      </div>

      <p style={{ color:"#374151",fontSize:9,margin:"10px 0 0",lineHeight:1.5 }}>
        ⚠️ Estimation via formule de Widmark + courbe d'absorption 90min. Ne conduis jamais sans certitude.
      </p>
    </div>
  )
}

// ── DRINK SELECTOR ───────────────────────────────────────────────────────────
export default function DrinkTab({ myMember, samMember, onAddDrink, onUndo }: any) {
  const [cat, setCat] = useState("Bière")
  const [selectedBase, setSelectedBase] = useState<string|null>(null)
  const [selectedVol, setSelectedVol] = useState<number|null>(null)
  const [selectedMixer, setSelectedMixer] = useState<string>("Pure")
  const [added, setAdded] = useState(false)

  const isSam = samMember && myMember.user_id === samMember.user_id
  const currentBAC = calcCurrentBAC(myMember.drinks, myMember.weight_kg, myMember.sex)
  const samLimit = samMember?.youngDriver ? 0.2 : 0.5
  const samLocked = isSam && currentBAC >= samLimit
  const dist = myMember.drinks.reduce((s: number, d: DrinkEntry) => s + cmToMeters(d.vol_cl), 0)
  const st = getBACStatus(currentBAC)

  const base = selectedBase ? DRINK_BASES.find(b => b.id === selectedBase) : null
  const catBases = DRINK_BASES.filter(b => b.category === cat)

  const handleSelectBase = (id: string) => {
    const b = DRINK_BASES.find(x => x.id === id)!
    setSelectedBase(id)
    setSelectedVol(b.volumes[0])
    setSelectedMixer(b.mixers ? b.mixers[0] : "Pure")
  }

  const handleAdd = () => {
    if (!base || !selectedVol || samLocked) return
    const alc = alcoholGrams(selectedVol, base.degree_pct)
    const entry: DrinkEntry = {
      id: `${base.id}_${Date.now()}`,
      drinkId: base.id,
      name: base.name + (base.mixers && selectedMixer !== "Pure" ? ` + ${selectedMixer}` : ""),
      emoji: base.emoji,
      vol_cl: selectedVol,
      degree_pct: base.degree_pct,
      alcohol_g: alc,
      color: base.color,
      mixer: base.mixers ? selectedMixer : undefined,
      addedAt: Date.now(),
    }
    onAddDrink(entry)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    setSelectedBase(null); setSelectedVol(null)
  }

  // Preview: what would this drink add to BAC
  const previewAlcG = base && selectedVol ? alcoholGrams(selectedVol, base.degree_pct) : 0
  const previewBACAdd = base && selectedVol
    ? parseFloat((previewAlcG / (myMember.weight_kg * (myMember.sex === "M" ? 0.68 : 0.55) * 10)).toFixed(3))
    : 0

  const S = {
    catBtn: (active: boolean) => ({
      padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",
      background:active?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e",
      color:active?"#fff":"#6b7280",fontSize:11,fontWeight:active?700:400,
      whiteSpace:"nowrap" as const,
    }),
    baseBtn: (active: boolean, color: string) => ({
      padding:"10px 8px",borderRadius:11,border:"none",cursor:"pointer",
      background:active?`linear-gradient(135deg,${color}35,${color}18)`:"#1e1e2e",
      outline:active?`2px solid ${color}`:"2px solid transparent",
      textAlign:"left" as const,display:"flex",flexDirection:"column" as const,gap:3,
      transition:"all .15s",
    }),
    volBtn: (active: boolean) => ({
      flex:1,padding:"9px 4px",borderRadius:10,border:"none",cursor:"pointer",
      background:active?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",
      outline:active?"2px solid #a855f7":"2px solid transparent",
      color:"#e2e8f0",fontSize:12,fontWeight:active?700:400,
    }),
    mixBtn: (active: boolean) => ({
      padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",
      background:active?"#3b1f6a":"#1e1e2e",
      outline:active?"2px solid #a855f7":"2px solid transparent",
      color:active?"#c084fc":"#6b7280",fontSize:11,fontWeight:active?700:400,
      whiteSpace:"nowrap" as const,
    }),
  }

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      {/* Status card */}
      <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:18,padding:16,marginBottom:14,border:"1px solid #3b1f6a" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
          <span style={{ fontSize:36 }}>{myMember.avatar}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16,fontWeight:700,color:"#e2e8f0" }}>{myMember.pseudo}</div>
            <div style={{ fontSize:12,color:st.color }}>{isSam?"🚗 SAM · ":""}{st.label}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:22,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{dist.toFixed(1)}m</div>
            <div style={{ fontSize:9,color:"#6b7280" }}>{myMember.drinks.length} verre{myMember.drinks.length>1?"s":""}</div>
          </div>
        </div>
      </div>

      {/* SAM locked */}
      {isSam && (
        <div style={{ background:samLocked?"#1c0505":"#0d2b0d",border:`1px solid ${samLocked?"#7f1d1d":"#166534"}`,borderRadius:12,padding:12,marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
            <span style={{ fontSize:12,fontWeight:700,color:samLocked?"#f87171":"#4ade80" }}>
              {samLocked?"🔒 LIMITE ATTEINTE — Ne conduis pas !":"🚗 SAM — Limite légale"}
            </span>
            <span style={{ fontSize:12,color:samLocked?"#f87171":"#4ade80",fontWeight:700 }}>
              {currentBAC.toFixed(3)}‰ / {samLimit}‰
            </span>
          </div>
          <div style={{ height:8,borderRadius:4,background:"#1e1e2e",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${Math.min((currentBAC/samLimit)*100,100)}%`,background:samLocked?"#ef4444":"#4ade80",borderRadius:4,transition:"width .5s" }}/>
          </div>
        </div>
      )}

      {/* BAC Forecast */}
      <BACForecast drinks={myMember.drinks} weight_kg={myMember.weight_kg} sex={myMember.sex}/>

      {!samLocked && (
        <>
          {/* Category tabs */}
          <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto" as const,paddingBottom:2 }}>
            {DRINK_CATEGORIES.map(c => (
              <button key={c} onClick={()=>{setCat(c);setSelectedBase(null);setSelectedVol(null)}} style={S.catBtn(cat===c)}>
                {c==="Bière"?"🍺":c==="Alcool fort"?"🥃":c==="Vin & Champagne"?"🍷":"🥃"} {c}
              </button>
            ))}
          </div>

          {/* Base drink grid */}
          <div style={{ background:"#13131f",borderRadius:16,padding:12,border:"1px solid #2a2a3e",marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>
              Choisis ta boisson
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
              {catBases.map(b => (
                <button key={b.id} onClick={()=>handleSelectBase(b.id)} style={S.baseBtn(selectedBase===b.id, b.color)}>
                  <span style={{ fontSize:20 }}>{b.emoji}</span>
                  <span style={{ fontSize:10,fontWeight:600,color:"#e2e8f0",lineHeight:1.2 }}>{b.name}</span>
                  <span style={{ fontSize:9,color:b.color }}>{b.degree_pct}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Volume selector */}
          {base && (
            <div style={{ background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:10 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>
                Volume
              </div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
                {base.volumes.map(v => (
                  <button key={v} onClick={()=>setSelectedVol(v)} style={{ ...S.volBtn(selectedVol===v),minWidth:52 }}>
                    {v}cl
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mixer selector */}
          {base?.mixers && base.mixers.length > 1 && (
            <div style={{ background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:10 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>
                Avec quoi ?
              </div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
                {base.mixers.map(m => (
                  <button key={m} onClick={()=>setSelectedMixer(m)} style={S.mixBtn(selectedMixer===m)}>{m}</button>
                ))}
              </div>
            </div>
          )}

          {/* Preview + Add button */}
          {base && selectedVol && (
            <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:12,border:"1px solid #3b1f6a",marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0" }}>
                    {base.emoji} {base.name} {base.mixers&&selectedMixer!=="Pure"?`+ ${selectedMixer}`:""} {selectedVol}cl
                  </div>
                  <div style={{ fontSize:10,color:"#6b7280",marginTop:2 }}>
                    {base.degree_pct}% · {previewAlcG.toFixed(1)}g alcool
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:16,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>
                    +{cmToMeters(selectedVol).toFixed(1)}m
                  </div>
                  <div style={{ fontSize:10,color:"#f87171" }}>+{previewBACAdd.toFixed(3)}‰</div>
                </div>
              </div>
              <button onClick={handleAdd} style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",transform:added?"scale(.97)":"scale(1)",transition:"all .15s" }}>
                {added?"✅ Ajouté !":"Ajouter ce verre 🥂"}
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
              {[...myMember.drinks].reverse().slice(0,8).map((d: DrinkEntry, i: number) => (
                <div key={d.id||i} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<7?"1px solid #1e1e2e":"none" }}>
                  <span style={{ fontSize:15 }}>{d.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,color:"#e2e8f0" }}>{d.name} {d.vol_cl}cl</div>
                    <div style={{ fontSize:9,color:"#6b7280" }}>{d.degree_pct}% · {d.alcohol_g.toFixed(1)}g alc · {fmtTime(d.addedAt)}</div>
                  </div>
                  <span style={{ fontSize:10,color:d.color,fontWeight:600 }}>+{cmToMeters(d.vol_cl).toFixed(1)}m</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
