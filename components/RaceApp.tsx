"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { DRINK_CATALOG, CATEGORIES, calcBAC, getBACStatus, cmToMeters, type Drink } from "@/lib/drinks"

// ── SAM WHEEL ────────────────────────────────────────────────────────────────
function SamWheel({ members, onSamChosen, onClose }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const rotRef    = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [winner,   setWinner]   = useState<any>(null)
  const [youngDriver, setYoungDriver] = useState(false)
  const COLORS = ["#7c3aed","#db2777","#0891b2","#059669","#d97706","#dc2626","#4f46e5","#0d9488"]
  const count = members.length
  const slice = (2 * Math.PI) / count

  const draw = useCallback((rot: number) => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext("2d")!
    const cx = cv.width/2, cy = cv.height/2, r = cx-6
    ctx.clearRect(0,0,cv.width,cv.height)
    ctx.save(); ctx.shadowColor="#a855f7"; ctx.shadowBlur=30
    ctx.beginPath(); ctx.arc(cx,cy,r+2,0,Math.PI*2)
    ctx.strokeStyle="#a855f750"; ctx.lineWidth=8; ctx.stroke(); ctx.restore()
    members.forEach((m:any,i:number)=>{
      const s=rot+i*slice,e=s+slice
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,e); ctx.closePath()
      ctx.fillStyle=COLORS[i%COLORS.length]; ctx.fill()
      ctx.strokeStyle="#0a0a14"; ctx.lineWidth=2.5; ctx.stroke()
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(s+slice/2)
      ctx.textAlign="right"; ctx.fillStyle="#fff"
      ctx.font=`bold ${count>5?11:13}px 'Space Grotesk',sans-serif`
      ctx.shadowColor="rgba(0,0,0,.7)"; ctx.shadowBlur=4
      ctx.fillText(`${m.avatar} ${m.pseudo}`,r-12,5); ctx.restore()
    })
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,28)
    g.addColorStop(0,"#1a0a30"); g.addColorStop(1,"#0a0a14")
    ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2)
    ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle="#a855f7"; ctx.lineWidth=2.5; ctx.stroke()
    ctx.fillStyle="#c084fc"; ctx.font="bold 13px 'Bebas Neue',cursive"
    ctx.textAlign="center"; ctx.fillText("SAM",cx,cy+5)
    ctx.beginPath(); ctx.moveTo(cx-11,2); ctx.lineTo(cx+11,2); ctx.lineTo(cx,30)
    ctx.closePath(); ctx.fillStyle="#fff"; ctx.shadowColor="#a855f7"; ctx.shadowBlur=12; ctx.fill()
  }, [members,slice])

  useEffect(()=>{draw(rotRef.current)},[draw])

  const spin = () => {
    if(spinning) return; setSpinning(true); setWinner(null)
    const winIdx=Math.floor(Math.random()*count)
    const target=-Math.PI/2-(winIdx*slice+slice/2)
    const extra=(6+Math.random()*4)*Math.PI*2
    const totalR=extra+((target-rotRef.current)%(Math.PI*2))
    const dur=4200,t0=performance.now(),r0=rotRef.current
    const frame=(now:number)=>{
      const t=Math.min((now-t0)/dur,1),ease=1-Math.pow(1-t,4)
      rotRef.current=r0+totalR*ease; draw(rotRef.current)
      if(t<1){animRef.current=requestAnimationFrame(frame)}
      else{setSpinning(false);setWinner(members[winIdx])}
    }
    animRef.current=requestAnimationFrame(frame)
  }
  useEffect(()=>()=>cancelAnimationFrame(animRef.current),[])

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300,padding:20,overflowY:"auto" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 6px",textAlign:"center" }}>Qui est le SAM ?</h2>
      <p style={{ color:"#6b7280",fontSize:12,margin:"0 0 20px",fontFamily:"'Space Grotesk',sans-serif" }}>La roue décide ! 🎡</p>
      <canvas ref={canvasRef} width={300} height={300} style={{ borderRadius:"50%",marginBottom:20 }}/>
      {!winner ? (
        <button onClick={spin} disabled={spinning} style={{ padding:"14px 44px",borderRadius:14,border:"none",cursor:spinning?"not-allowed":"pointer",background:spinning?"#2a2a3e":"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
          {spinning?"⏳ Ça tourne…":"🎡 Lancer la roue !"}
        </button>
      ) : (
        <div style={{ textAlign:"center",width:"100%",maxWidth:320 }}>
          <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",border:"2px solid #a855f7",borderRadius:20,padding:"18px 28px",marginBottom:14 }}>
            <div style={{ fontSize:44,marginBottom:6 }}>{winner.avatar}</div>
            <div style={{ fontSize:22,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive",letterSpacing:2 }}>{winner.pseudo}</div>
            <div style={{ fontSize:12,color:"#9ca3af",marginTop:4 }}>est le SAM ce soir 🚗</div>
          </div>
          <div style={{ background:"#13131f",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:14 }}>
            <p style={{ color:"#e2e8f0",fontSize:13,fontFamily:"'Space Grotesk',sans-serif",margin:"0 0 10px",fontWeight:600 }}>🚗 {winner.pseudo} est jeune conducteur ?</p>
            <p style={{ color:"#6b7280",fontSize:11,margin:"0 0 12px" }}>Moins de 3 ans de permis → limite 0,2‰ au lieu de 0,5‰</p>
            <div style={{ display:"flex",gap:10 }}>
              {[{v:true,l:"🟡 Oui"},{v:false,l:"✅ Non"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>setYoungDriver(opt.v)} style={{ flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,background:youngDriver===opt.v?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:youngDriver===opt.v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0" }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>onSamChosen(winner.user_id,youngDriver)} style={{ flex:2,padding:"13px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>✅ Confirmer</button>
            <button onClick={spin} style={{ flex:1,padding:"13px",borderRadius:14,border:"1px solid #2a2a3e",cursor:"pointer",background:"#13131f",color:"#9ca3af",fontSize:13 }}>🔄 Relancer</button>
          </div>
        </div>
      )}
      <button onClick={onClose} style={{ marginTop:14,background:"none",border:"none",color:"#4b5563",fontSize:12,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif" }}>Annuler</button>
    </div>
  )
}

// ── RACE TRACK ───────────────────────────────────────────────────────────────
function RaceTrack({ members, samMember, isCreator, onShowWheel, onEndRace }: any) {
  const drinkers = members.filter((m:any)=>m.user_id!==samMember?.user_id)
  const maxDist  = Math.max(...drinkers.map((m:any)=>m.drinks.reduce((a:number,d:Drink)=>a+cmToMeters(d.vol_cl),0)),10)
  const sorted   = [...drinkers].sort((a:any,b:any)=>
    b.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)-a.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)
  )
  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <div style={{ textAlign:"center",marginBottom:14 }}>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:4,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>DRUNKRACE</h1>
        <p style={{ color:"#4b5563",fontSize:10,margin:"2px 0 0",letterSpacing:1 }}>EN COURS · {members.length} participants</p>
      </div>

      {samMember ? (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"linear-gradient(90deg,#052e16,#0a2010)",border:"1px solid #166534",borderRadius:12,marginBottom:12 }}>
          <span style={{ fontSize:22 }}>{samMember.avatar}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#4ade80" }}>🚗 SAM{samMember.youngDriver?" (Jeune conducteur)":""}</div>
            <div style={{ fontSize:12,color:"#e2e8f0" }}>{samMember.pseudo} · limite {samMember.youngDriver?"0,2":"0,5"}‰</div>
          </div>
          {isCreator && <button onClick={onShowWheel} style={{ background:"#166534",border:"none",borderRadius:8,color:"#4ade80",fontSize:10,padding:"4px 10px",cursor:"pointer" }}>Changer</button>}
        </div>
      ) : (
        isCreator && <button onClick={onShowWheel} style={{ width:"100%",padding:"11px",marginBottom:12,borderRadius:12,border:"1px dashed #3b1f6a",background:"#0f0f1a",cursor:"pointer",color:"#a855f7",fontSize:13,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>
          🎡 Désigner un SAM
        </button>
      )}

      {/* Circuit */}
      <div style={{ background:"#111827",borderRadius:20,padding:"16px 12px",border:"1px solid #1f2937",marginBottom:14,overflow:"hidden",position:"relative" }}>
        <div style={{ position:"absolute",inset:0,borderRadius:20,background:"repeating-linear-gradient(0deg,transparent,transparent 38px,#ffffff06 38px,#ffffff06 39px)",pointerEvents:"none" as const }}/>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
          <span style={{ color:"#374151",fontSize:10,fontWeight:700,letterSpacing:1 }}>🏁 DÉPART</span>
          <span style={{ color:"#374151",fontSize:10,fontWeight:700,letterSpacing:1 }}>ARRIVÉE 🍺</span>
        </div>
        {sorted.map((member:any,i:number)=>{
          const dist=member.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)
          const pct=maxDist>0?Math.min((dist/maxDist)*100,96):0
          const bac=calcBAC(member.drinks,member.weight_kg,member.sex)
          const st=getBACStatus(bac)
          return (
            <div key={member.user_id} style={{ marginBottom:i<sorted.length-1?10:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  {i===0&&<span style={{ fontSize:12 }}>👑</span>}
                  <span style={{ fontSize:14 }}>{member.avatar}</span>
                  <span style={{ fontSize:12,fontWeight:600,color:member.isMe?"#c084fc":"#d1d5db" }}>{member.pseudo}{member.isMe?" (moi)":""}</span>
                  <span style={{ fontSize:10,color:st.color }}>{st.emoji}</span>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <span style={{ fontSize:10,color:"#6b7280" }}>{bac.toFixed(2)}‰</span>
                  <span style={{ fontSize:11,fontWeight:700,color:member.color }}>{dist.toFixed(1)}m</span>
                </div>
              </div>
              <div style={{ position:"relative",height:42,background:"#1f2937",borderRadius:8,overflow:"hidden",boxShadow:"inset 0 2px 6px rgba(0,0,0,.4)" }}>
                <div style={{ position:"absolute",inset:0,background:"repeating-linear-gradient(90deg,transparent,transparent 48px,#ffffff08 48px,#ffffff08 50px)" }}/>
                <div style={{ position:"absolute",top:"50%",left:0,right:0,height:1,transform:"translateY(-50%)",background:"repeating-linear-gradient(90deg,#ffffff15 0px,#ffffff15 12px,transparent 12px,transparent 24px)" }}/>
                <div style={{ position:"absolute",left:0,top:0,bottom:0,width:6,background:"repeating-linear-gradient(180deg,#ef4444 0px,#ef4444 6px,#fff 6px,#fff 12px)",borderRadius:"8px 0 0 8px" }}/>
                <div style={{ position:"absolute",right:0,top:0,bottom:0,width:6,background:"repeating-linear-gradient(180deg,#ef4444 0px,#ef4444 6px,#fff 6px,#fff 12px)",borderRadius:"0 8px 8px 0" }}/>
                {[25,50,75].map((p:number)=><div key={p} style={{ position:"absolute",left:`${p}%`,top:0,bottom:0,width:1,background:"#ffffff12" }}/>)}
                <div style={{ position:"absolute",left:6,top:0,bottom:0,width:`calc(${pct}% - 6px)`,background:`linear-gradient(90deg,${member.color}25,${member.color}55)`,transition:"width 0.9s cubic-bezier(.34,1.2,.64,1)",borderRadius:"0 4px 4px 0" }}/>
                <div style={{ position:"absolute",left:`calc(${pct}% - 20px)`,top:"50%",transform:"translateY(-50%)",fontSize:24,filter:bac>1.5?"blur(1px)":"none",transition:"left 0.9s cubic-bezier(.34,1.2,.64,1)",zIndex:2 }}>
                  {member.avatar}
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ position:"absolute",right:18,top:36,bottom:16,width:6,background:"repeating-linear-gradient(180deg,#fff 0px,#fff 5px,#000 5px,#000 10px)",borderRadius:2,opacity:0.6 }}/>
      </div>

      {/* Leaderboard */}
      <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #1f2937",marginBottom:12 }}>
        {sorted.map((m:any,i:number)=>{
          const dist=m.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)
          const bac=calcBAC(m.drinks,m.weight_kg,m.sex)
          const st=getBACStatus(bac)
          const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"]
          return (
            <div key={m.user_id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<sorted.length-1?"1px solid #1a1a2a":"none" }}>
              <span style={{ fontSize:18,minWidth:26 }}>{medals[i]}</span>
              <span style={{ fontSize:20 }}>{m.avatar}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,color:m.isMe?"#c084fc":"#e2e8f0" }}>{m.pseudo}</div>
                <div style={{ fontSize:10,color:st.color }}>{st.label}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0" }}>{dist.toFixed(1)}m</div>
                <div style={{ fontSize:9,color:"#6b7280" }}>{m.drinks.length} verre{m.drinks.length>1?"s":""}</div>
              </div>
            </div>
          )
        })}
      </div>

      {isCreator && (
        <button onClick={onEndRace} style={{ width:"100%",padding:"14px",borderRadius:14,border:"1px solid #7f1d1d",cursor:"pointer",background:"#1c0505",color:"#f87171",fontSize:14,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
          🏁 Terminer la soirée
        </button>
      )}
    </div>
  )
}

// ── DRINK TAB ────────────────────────────────────────────────────────────────
function DrinkTab({ myMember, samMember, onAddDrink, onUndo }: any) {
  const [selected, setSelected] = useState<string|null>(null)
  const [added, setAdded] = useState(false)
  const [cat, setCat] = useState("Tous")
  const [search, setSearch] = useState("")
  const isSam = samMember && myMember.user_id === samMember.user_id
  const bac   = calcBAC(myMember.drinks, myMember.weight_kg, myMember.sex)
  const dist  = myMember.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)
  const st    = getBACStatus(bac)
  const samBac   = samMember ? calcBAC(samMember.drinks, samMember.weight_kg, samMember.sex) : 0
  const samLimit = samMember?.youngDriver ? 0.2 : 0.5
  const samLocked = isSam && samBac >= samLimit
  const filtered = DRINK_CATALOG.filter(d=>cat==="Tous"||d.category===cat).filter(d=>search===""||d.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    if (!selected || samLocked) return
    const drink = DRINK_CATALOG.find(d=>d.id===selected)!
    onAddDrink(drink); setAdded(true); setTimeout(()=>setAdded(false),1500); setSelected(null)
  }

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      {/* Status card */}
      <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:18,padding:18,marginBottom:14,border:"1px solid #3b1f6a" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
          <span style={{ fontSize:36 }}>{myMember.avatar}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16,fontWeight:700,color:"#e2e8f0" }}>{myMember.pseudo}</div>
            <div style={{ fontSize:12,color:st.color }}>{isSam?"🚗 SAM · "+st.label:st.label}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:24,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{dist.toFixed(1)}m</div>
            <div style={{ fontSize:9,color:"#6b7280" }}>distance</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {[{l:"Verres",v:myMember.drinks.length},{l:"BAC",v:`${bac.toFixed(3)}‰`},{l:"Alcool",v:`${myMember.drinks.reduce((s:number,d:Drink)=>s+d.alcohol_g,0).toFixed(0)}g`}].map(s=>(
            <div key={s.l} style={{ flex:1,background:"#0f0f1a",borderRadius:8,padding:"8px",textAlign:"center",border:"1px solid #2a2a3e" }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#e2e8f0" }}>{s.v}</div>
              <div style={{ fontSize:9,color:"#6b7280" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {isSam && (
        <div style={{ background:samLocked?"#1c0505":"#0d2b0d",border:`1px solid ${samLocked?"#7f1d1d":"#166534"}`,borderRadius:14,padding:14,marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
            <span style={{ fontSize:12,fontWeight:700,color:samLocked?"#f87171":"#4ade80" }}>
              {samLocked?"🔒 LIMITE ATTEINTE — Ne conduis pas !":"🚗 SAM — Limite légale"}
            </span>
            <span style={{ fontSize:12,color:samLocked?"#f87171":"#4ade80",fontWeight:700 }}>{samBac.toFixed(3)}‰ / {samLimit}‰</span>
          </div>
          <div style={{ height:8,borderRadius:4,background:"#1e1e2e",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${Math.min((samBac/samLimit)*100,100)}%`,background:samLocked?"#ef4444":"#4ade80",borderRadius:4,transition:"width .5s" }}/>
          </div>
        </div>
      )}

      {!samLocked && (
        <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher…" style={{ width:"100%",padding:"10px 14px",borderRadius:12,background:"#13131f",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box" as const,marginBottom:10 }}/>
          <div style={{ display:"flex",gap:6,marginBottom:10,overflowX:"auto" as const,paddingBottom:2 }}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{ padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,background:cat===c?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e",color:cat===c?"#fff":"#6b7280",fontSize:11,fontWeight:cat===c?700:400 }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ background:"#13131f",borderRadius:16,padding:12,border:"1px solid #2a2a3e",marginBottom:12 }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:320,overflowY:"auto" as const }}>
              {filtered.map(d=>{
                const addBac=calcBAC([d],myMember.weight_kg,myMember.sex)
                return (
                  <button key={d.id} onClick={()=>setSelected(d.id)} style={{ padding:"10px 8px",borderRadius:10,border:"none",cursor:"pointer",background:selected===d.id?`linear-gradient(135deg,${d.color}35,${d.color}18)`:"#1e1e2e",outline:selected===d.id?`2px solid ${d.color}`:"2px solid transparent",textAlign:"left" as const,display:"flex",flexDirection:"column" as const,gap:2,transition:"all .15s" }}>
                    <span style={{ fontSize:14 }}>{d.emoji}</span>
                    <span style={{ fontSize:10,fontWeight:600,color:"#e2e8f0",lineHeight:1.3 }}>{d.name}</span>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <span style={{ fontSize:9,color:"#6b7280" }}>{d.degree_pct}% · {d.vol_cl}cl</span>
                      <span style={{ fontSize:9,color:d.color,fontWeight:700 }}>+{cmToMeters(d.vol_cl).toFixed(1)}m</span>
                    </div>
                    <span style={{ fontSize:9,color:"#6b7280" }}>+{addBac.toFixed(3)}‰</span>
                  </button>
                )
              })}
            </div>
            <button onClick={handleAdd} disabled={!selected} style={{ width:"100%",marginTop:10,padding:"13px",borderRadius:12,border:"none",cursor:selected?"pointer":"not-allowed",background:selected?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e",color:selected?"#fff":"#6b7280",fontSize:14,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
              {added?"✅ Ajouté !":"Ajouter 🥂"}
            </button>
          </div>
          {myMember.drinks.length>0&&(
            <div style={{ background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3e" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <span style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const }}>Historique</span>
                <button onClick={onUndo} style={{ background:"#1e1e2e",border:"1px solid #2a2a3e",borderRadius:8,color:"#9ca3af",fontSize:10,padding:"3px 8px",cursor:"pointer" }}>↩ Annuler</button>
              </div>
              {[...myMember.drinks].reverse().slice(0,8).map((d:Drink,i:number)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<7?"1px solid #1e1e2e":"none" }}>
                  <span style={{ fontSize:15 }}>{d.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,color:"#e2e8f0" }}>{d.name}</div>
                    <div style={{ fontSize:9,color:"#6b7280" }}>{d.degree_pct}% · {d.alcohol_g.toFixed(1)}g alc</div>
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

// ── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ myMember, members, samMember }: any) {
  const bac   = calcBAC(myMember.drinks, myMember.weight_kg, myMember.sex)
  const dist  = myMember.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)
  const totalAlc = myMember.drinks.reduce((s:number,d:Drink)=>s+d.alcohol_g,0)
  const totalGroupDist = members.filter((m:any)=>m.user_id!==samMember?.user_id).reduce((s:number,m:any)=>s+m.drinks.reduce((ss:number,d:Drink)=>ss+cmToMeters(d.vol_cl),0),0)
  const drinkCounts = DRINK_CATALOG.map(d=>({...d,count:myMember.drinks.filter((x:Drink)=>x.id===d.id).length})).filter(d=>d.count>0)

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,color:"#c084fc",margin:"0 0 14px" }}>Mes Stats</h2>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
        {[
          {l:"Distance",v:`${dist.toFixed(1)}m`,icon:"🏁",c:"#c084fc"},
          {l:"Verres",v:myMember.drinks.length,icon:"🍺",c:"#ec4899"},
          {l:"BAC",v:`${bac.toFixed(3)}‰`,icon:"🩸",c:"#f87171"},
          {l:"Alcool",v:`${totalAlc.toFixed(1)}g`,icon:"⚗️",c:"#fb923c"},
          {l:"Calories",v:`~${(totalAlc*7).toFixed(0)}`,icon:"🔥",c:"#f97316"},
          {l:"Élimination",v:`~${(bac/0.15).toFixed(1)}h`,icon:"⏱",c:"#38bdf8"},
        ].map(s=>(
          <div key={s.l} style={{ background:"#13131f",borderRadius:12,padding:"12px",border:"1px solid #2a2a3e" }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:18,fontWeight:700,color:s.c,fontFamily:"'Space Grotesk',sans-serif" }}>{s.v}</div>
            <div style={{ fontSize:10,color:"#6b7280" }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* BAC gauge */}
      <div style={{ background:"#13131f",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #2a2a3e" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
          <span style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1 }}>ALCOOLÉMIE</span>
          <span style={{ fontSize:11,color:getBACStatus(bac).color,fontWeight:700 }}>{getBACStatus(bac).label}</span>
        </div>
        <div style={{ display:"flex",gap:2,height:10,borderRadius:6,overflow:"hidden",marginBottom:6 }}>
          {[{max:0.2,c:"#4ade80"},{max:0.5,c:"#a3e635"},{max:0.8,c:"#facc15"},{max:1.2,c:"#fb923c"},{max:1.8,c:"#f87171"},{max:2.5,c:"#dc2626"}].map((seg,i,arr)=>{
            const segStart=i===0?0:arr[i-1].max
            const fill=bac<=segStart?0:bac>=seg.max?100:((bac-segStart)/(seg.max-segStart))*100
            return <div key={i} style={{ flex:seg.max-segStart,background:"#1e1e2e",borderRadius:3,overflow:"hidden" }}><div style={{ height:"100%",width:`${fill}%`,background:seg.c,transition:"width .5s" }}/></div>
          })}
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#374151" }}>
          {["0‰","0.2","0.5","0.8","1.2","1.8","2.5‰"].map(l=><span key={l}>{l}</span>)}
        </div>
      </div>
      {drinkCounts.length>0&&(
        <div style={{ background:"#13131f",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #2a2a3e" }}>
          <h3 style={{ margin:"0 0 10px",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const }}>Ce soir tu as bu</h3>
          {drinkCounts.map(d=>(
            <div key={d.id} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{d.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11,color:"#e2e8f0" }}>{d.name}</div>
                <div style={{ fontSize:9,color:"#6b7280" }}>{d.degree_pct}% alc.</div>
              </div>
              <div style={{ background:`${d.color}20`,borderRadius:20,padding:"2px 10px",fontSize:11,color:d.color,fontWeight:700 }}>×{d.count}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:14,border:"1px solid #3b1f6a" }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,marginBottom:4 }}>GROUPE — DISTANCE TOTALE</div>
        <div style={{ fontSize:28,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive" }}>{totalGroupDist.toFixed(1)}m</div>
        <div style={{ fontSize:11,color:"#6b7280" }}>{members.length} participants 🏆</div>
      </div>
    </div>
  )
}

// ── TAB BAR ──────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: string, onChange: (t:string)=>void }) {
  const tabs=[{id:"race",label:"🏁 Piste"},{id:"drink",label:"🍺 Boire"},{id:"stats",label:"📊 Stats"},{id:"profile",label:"👤 Profil"}]
  return (
    <div style={{ display:"flex",position:"fixed",bottom:0,left:0,right:0,background:"#0a0a14",borderTop:"1px solid #1a1a2a",zIndex:100,maxWidth:480,margin:"0 auto" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{ flex:1,padding:"11px 0 8px",background:"none",border:"none",color:active===t.id?"#c084fc":"#4b5563",fontSize:10,fontWeight:active===t.id?700:400,cursor:"pointer",transition:"color .2s",fontFamily:"'Space Grotesk',sans-serif",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:1 }}>
          <span style={{ fontSize:19 }}>{t.label.split(" ")[0]}</span>
          <span style={{ letterSpacing:.5 }}>{t.label.split(" ").slice(1).join(" ")}</span>
        </button>
      ))}
    </div>
  )
}

// ── PROFILE TAB ──────────────────────────────────────────────────────────────
function ProfileTab({ myMember, user, onUpdate, onLeave }: any) {
  const [pseudo, setPseudo] = useState(myMember.pseudo)
  const [weight, setWeight] = useState(String(myMember.weight_kg))
  const [sex,    setSex]    = useState(myMember.sex)
  const [avatar, setAvatar] = useState(myMember.avatar)
  const [saved,  setSaved]  = useState(false)
  const { AVATARS } = require("@/lib/drinks")
  const supabase = createClient()

  const save = async () => {
    await supabase.from("profiles").update({ pseudo, weight_kg:parseInt(weight)||70, sex, avatar }).eq("id", user.id)
    onUpdate({ pseudo, weight_kg:parseInt(weight)||70, sex, avatar })
    setSaved(true); setTimeout(()=>setSaved(false),1500)
  }

  const logout = async () => { await supabase.auth.signOut() }

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,color:"#c084fc",margin:"0 0 16px" }}>Mon Profil</h2>
      <div style={{ textAlign:"center",marginBottom:20 }}>
        <div style={{ fontSize:56,marginBottom:8 }}>{avatar}</div>
        <div style={{ display:"inline-block",background:"linear-gradient(135deg,#a855f7,#ec4899)",borderRadius:20,padding:"4px 16px",fontSize:13,fontWeight:700,color:"#fff" }}>{pseudo}</div>
      </div>
      <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:12 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>Avatar</div>
        <div style={{ display:"flex",flexWrap:"wrap" as const,gap:8 }}>
          {AVATARS.map((a:string,i:number)=>(
            <button key={i} onClick={()=>setAvatar(a)} style={{ fontSize:26,padding:6,borderRadius:10,border:"none",cursor:"pointer",background:avatar===a?"#3b1f6a":"#1e1e2e",outline:avatar===a?"2px solid #a855f7":"2px solid transparent" }}>{a}</button>
          ))}
        </div>
      </div>
      <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:12 }}>
        {[{l:"Pseudo",t:"text",v:pseudo,s:setPseudo},{l:"Poids (kg)",t:"number",v:weight,s:setWeight}].map(f=>(
          <div key={f.l} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:4 }}>{f.l}</div>
            <input type={f.t} value={f.v} onChange={e=>f.s(e.target.value)} style={{ width:"100%",padding:"11px 12px",borderRadius:10,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box" as const }}/>
          </div>
        ))}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:6 }}>Sexe</div>
          <div style={{ display:"flex",gap:8 }}>
            {[{v:"M",l:"👨 Homme"},{v:"F",l:"👩 Femme"}].map(s=>(
              <button key={s.v} onClick={()=>setSex(s.v)} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:sex===s.v?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:sex===s.v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:12,fontWeight:sex===s.v?700:400 }}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} style={{ width:"100%",padding:"13px",borderRadius:13,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",marginBottom:10 }}>
        {saved?"✅ Sauvegardé !":"Sauvegarder"}
      </button>
      <button onClick={logout} style={{ width:"100%",padding:"12px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#6b7280",fontSize:14,fontFamily:"'Space Grotesk',sans-serif",marginBottom:10 }}>
        Se déconnecter
      </button>
      <div style={{ background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3e" }}>
        <p style={{ color:"#6b7280",fontSize:11,margin:0,lineHeight:1.7 }}>⚠️ Calcul BAC via formule de Widmark — estimation uniquement. Ne conduis jamais après avoir bu. 🚗🚫</p>
      </div>
    </div>
  )
}

// ── MAIN RACE APP ─────────────────────────────────────────────────────────────
export default function RaceApp({ user, profile, group, onLeave, onProfileUpdate }: any) {
  const [tab, setTab]           = useState("race")
  const [members, setMembers]   = useState<any[]>([])
  const [showWheel, setShowWheel] = useState(false)
  const [ended, setEnded]       = useState(group.status === "finished")
  const supabase                = createClient()

  const loadMembers = async () => {
    const { data } = await supabase
      .from("group_members")
      .select("*, profiles(*)")
      .eq("group_id", group.id)
    if (!data) return
    // Each member: merge profile data + drinks
    const enriched = data.map((m:any) => ({
      ...m,
      user_id:   m.user_id,
      pseudo:    m.profiles?.pseudo || "?",
      avatar:    m.profiles?.avatar || "🐺",
      weight_kg: m.profiles?.weight_kg || 70,
      sex:       m.profiles?.sex || "M",
      color:     m.color || "#a855f7",
      drinks:    (m.drinks_log || []).map((id:string) => DRINK_CATALOG.find(d=>d.id===id)).filter(Boolean),
      isMe:      m.user_id === user.id,
      is_creator:m.is_creator,
      youngDriver: m.young_driver || false,
    }))
    setMembers(enriched)
  }

  useEffect(() => {
    loadMembers()
    // Realtime subscription
    const channel = supabase.channel(`group-${group.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"group_members", filter:`group_id=eq.${group.id}` }, () => loadMembers())
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"groups", filter:`id=eq.${group.id}` }, (payload:any) => {
        if (payload.new.status === "finished") setEnded(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [group.id])

  const myMember  = members.find(m=>m.isMe)
  const samMember = members.find(m=>m.is_sam)
  const isCreator = myMember?.is_creator || false

  const handleAddDrink = async (drink: Drink) => {
    if (!myMember) return
    const newLog = [...(myMember.drinks_log||[]), drink.id]
    await supabase.from("group_members").update({ drinks_log: newLog }).eq("group_id", group.id).eq("user_id", user.id)
    loadMembers()
  }

  const handleUndo = async () => {
    if (!myMember || !myMember.drinks_log?.length) return
    const newLog = [...myMember.drinks_log]
    newLog.pop()
    await supabase.from("group_members").update({ drinks_log: newLog }).eq("group_id", group.id).eq("user_id", user.id)
    loadMembers()
  }

  const handleSamChosen = async (userId: string, youngDriver: boolean) => {
    // Reset all is_sam
    await supabase.from("group_members").update({ is_sam: false, young_driver: false }).eq("group_id", group.id)
    // Set new SAM
    await supabase.from("group_members").update({ is_sam: true, young_driver: youngDriver }).eq("group_id", group.id).eq("user_id", userId)
    setShowWheel(false)
    loadMembers()
  }

  const handleEndRace = async () => {
    if (!confirm("Terminer la soirée ? Tout le monde sera éjecté.")) return
    await supabase.from("groups").update({ status: "finished" }).eq("id", group.id)
    setEnded(true)
  }

  const handleProfileUpdate = (patch: any) => {
    setMembers(prev => prev.map(m => m.isMe ? { ...m, ...patch } : m))
    onProfileUpdate()
  }

  if (!myMember) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#6b7280" }}>Chargement…</div>

  if (ended) return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
      <div style={{ fontSize:72,marginBottom:16 }}>🏁</div>
      <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 8px" }}>FIN DE LA SOIRÉE !</h1>
      {members.sort((a,b)=>b.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)-a.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0)).slice(0,3).map((m,i)=>(
        <div key={m.user_id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 20px",background:"#13131f",borderRadius:14,marginBottom:8,width:"100%",maxWidth:320,border:"1px solid #2a2a3e" }}>
          <span style={{ fontSize:20 }}>{["🥇","🥈","🥉"][i]}</span>
          <span style={{ fontSize:22 }}>{m.avatar}</span>
          <div style={{ flex:1,textAlign:"left" }}>
            <div style={{ fontWeight:600,color:"#e2e8f0" }}>{m.pseudo}</div>
          </div>
          <div style={{ fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive",fontSize:18 }}>
            {m.drinks.reduce((s:number,d:Drink)=>s+cmToMeters(d.vol_cl),0).toFixed(1)}m
          </div>
        </div>
      ))}
      <button onClick={onLeave} style={{ marginTop:20,padding:"14px 32px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
        Retour à l'accueil
      </button>
    </div>
  )

  return (
    <div style={{ background:"#0a0a14",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative" }}>
      {tab==="race"    && <RaceTrack members={members} samMember={samMember} isCreator={isCreator} onShowWheel={()=>setShowWheel(true)} onEndRace={handleEndRace}/>}
      {tab==="drink"   && <DrinkTab myMember={myMember} samMember={samMember} onAddDrink={handleAddDrink} onUndo={handleUndo}/>}
      {tab==="stats"   && <StatsTab myMember={myMember} members={members} samMember={samMember}/>}
      {tab==="profile" && <ProfileTab myMember={myMember} user={user} onUpdate={handleProfileUpdate} onLeave={onLeave}/>}
      <TabBar active={tab} onChange={setTab}/>
      {showWheel && <SamWheel members={members} onSamChosen={handleSamChosen} onClose={()=>setShowWheel(false)}/>}
    </div>
  )
}
