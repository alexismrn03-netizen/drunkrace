"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { DRINK_BASES, alcoholGrams, serializeDrink, calcCurrentBAC, calcPeak, calcSoberTime, getBACStatus, fmtTime, calcDistance, ELIM_RATE, type DrinkEntry } from "@/lib/drinks"
import { parseDrinksLog } from "@/lib/memberUtils"
import DrunkAvatar, { type AvatarConfig, DEFAULT_AVATAR } from "./DrunkAvatar"
import DrinkTab from "./DrinkTab"
import PhotoTab from "./PhotoTab"
import AvatarEditor from "./AvatarEditor"

// ── helpers ──────────────────────────────────────────────────────────────────
function memberDist(drinks: DrinkEntry[]) {
  return drinks.reduce((s, d) => s + calcDistance(d.alcohol_g, d.vol_cl), 0)
}
function parseAvatar(raw: any): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR
  if (typeof raw === "string") { try { return { ...DEFAULT_AVATAR, ...JSON.parse(raw) } } catch { return DEFAULT_AVATAR } }
  if (typeof raw === "object") return { ...DEFAULT_AVATAR, ...raw }
  return DEFAULT_AVATAR
}

// ── SAM WHEEL ────────────────────────────────────────────────────────────────
function SamWheel({ members, onSamChosen, onClose }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotRef = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [youngDriver, setYoungDriver] = useState(false)
  const COLORS = ["#7c3aed","#db2777","#0891b2","#059669","#d97706","#dc2626","#4f46e5","#0d9488"]
  const count = members.length, slice = (2*Math.PI)/count
  const draw = useCallback((rot:number)=>{
    const cv=canvasRef.current; if(!cv)return
    const ctx=cv.getContext("2d")!,cx=cv.width/2,cy=cv.height/2,r=cx-6
    ctx.clearRect(0,0,cv.width,cv.height)
    ctx.save();ctx.shadowColor="#a855f7";ctx.shadowBlur=30
    ctx.beginPath();ctx.arc(cx,cy,r+2,0,Math.PI*2);ctx.strokeStyle="#a855f750";ctx.lineWidth=8;ctx.stroke();ctx.restore()
    members.forEach((m:any,i:number)=>{
      const s=rot+i*slice,e=s+slice
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,s,e);ctx.closePath()
      ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();ctx.strokeStyle="#0a0a14";ctx.lineWidth=2.5;ctx.stroke()
      ctx.save();ctx.translate(cx,cy);ctx.rotate(s+slice/2);ctx.textAlign="right";ctx.fillStyle="#fff"
      ctx.font=`bold ${count>5?11:13}px 'Space Grotesk',sans-serif`;ctx.shadowColor="rgba(0,0,0,.7)";ctx.shadowBlur=4
      ctx.fillText(m.pseudo,r-12,5);ctx.restore()
    })
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,28);g.addColorStop(0,"#1a0a30");g.addColorStop(1,"#0a0a14")
    ctx.beginPath();ctx.arc(cx,cy,28,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle="#a855f7";ctx.lineWidth=2.5;ctx.stroke()
    ctx.fillStyle="#c084fc";ctx.font="bold 13px 'Bebas Neue',cursive";ctx.textAlign="center";ctx.fillText("SAM",cx,cy+5)
    ctx.beginPath();ctx.moveTo(cx-11,2);ctx.lineTo(cx+11,2);ctx.lineTo(cx,30);ctx.closePath()
    ctx.fillStyle="#fff";ctx.shadowColor="#a855f7";ctx.shadowBlur=12;ctx.fill()
  },[members,slice])
  useEffect(()=>{draw(rotRef.current)},[draw])
  const spin=()=>{
    if(spinning)return;setSpinning(true);setWinner(null)
    const winIdx=Math.floor(Math.random()*count)
    const target=-Math.PI/2-(winIdx*slice+slice/2)
    const totalR=(6+Math.random()*4)*Math.PI*2+((target-rotRef.current)%(Math.PI*2))
    const dur=4200,t0=performance.now(),r0=rotRef.current
    const frame=(now:number)=>{
      const t=Math.min((now-t0)/dur,1),ease=1-Math.pow(1-t,4)
      rotRef.current=r0+totalR*ease;draw(rotRef.current)
      if(t<1){animRef.current=requestAnimationFrame(frame)}else{setSpinning(false);setWinner(members[winIdx])}
    }
    animRef.current=requestAnimationFrame(frame)
  }
  useEffect(()=>()=>cancelAnimationFrame(animRef.current),[])
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300,padding:20,overflowY:"auto"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 6px",textAlign:"center"}}>Qui est le SAM ?</h2>
      <p style={{color:"#6b7280",fontSize:12,margin:"0 0 20px"}}>La roue décide ! 🎡</p>
      <canvas ref={canvasRef} width={300} height={300} style={{borderRadius:"50%",marginBottom:20}}/>
      {!winner ? (
        <button onClick={spin} disabled={spinning} style={{padding:"14px 44px",borderRadius:14,border:"none",cursor:spinning?"not-allowed":"pointer",background:spinning?"#2a2a3e":"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700}}>
          {spinning?"⏳ Ça tourne…":"🎡 Lancer la roue !"}
        </button>
      ):(
        <div style={{textAlign:"center",width:"100%",maxWidth:320}}>
          <div style={{background:"linear-gradient(135deg,#1a1030,#130d22)",border:"2px solid #a855f7",borderRadius:20,padding:"18px 28px",marginBottom:14}}>
            <DrunkAvatar config={parseAvatar(winner.avatar_config)} bac={0} size={70} animate={false}/>
            <div style={{fontSize:20,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive",letterSpacing:2,marginTop:8}}>{winner.pseudo}</div>
            <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>est le SAM ce soir 🚗</div>
          </div>
          <div style={{background:"#13131f",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:14}}>
            <p style={{color:"#e2e8f0",fontSize:13,margin:"0 0 10px",fontWeight:600}}>🚗 {winner.pseudo} est jeune conducteur ?</p>
            <p style={{color:"#6b7280",fontSize:11,margin:"0 0 12px"}}>Moins de 3 ans de permis → limite 0,2‰ au lieu de 0,5‰</p>
            <div style={{display:"flex",gap:10}}>
              {[{v:true,l:"🟡 Oui"},{v:false,l:"✅ Non"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>setYoungDriver(opt.v)} style={{flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:youngDriver===opt.v?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:youngDriver===opt.v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0"}}>{opt.l}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>onSamChosen(winner.user_id,youngDriver)} style={{flex:2,padding:"13px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700}}>✅ Confirmer</button>
            <button onClick={spin} style={{flex:1,padding:"13px",borderRadius:14,border:"1px solid #2a2a3e",cursor:"pointer",background:"#13131f",color:"#9ca3af",fontSize:13}}>🔄 Relancer</button>
          </div>
        </div>
      )}
      <button onClick={onClose} style={{marginTop:14,background:"none",border:"none",color:"#4b5563",fontSize:12,cursor:"pointer"}}>Annuler</button>
    </div>
  )
}

// ── RED FLAG MODAL ────────────────────────────────────────────────────────────
function RedFlagModal({ members, myId, groupId, onClose }: any) {
  const [target, setTarget] = useState<string>("")
  const [preview, setPreview] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setPreview(ev.target?.result as string); r.readAsDataURL(f)
  }

  const submit = async () => {
    if (!target) { alert("Sélectionne quelqu'un !"); return }
    setUploading(true)
    let photoUrl = null
    if (preview) {
      const blob = await fetch(preview).then(r=>r.blob())
      const filename = `redflags/${groupId}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from("party-photos").upload(filename, blob, { contentType:"image/jpeg" })
      if (!upErr) {
        const { data } = supabase.storage.from("party-photos").getPublicUrl(filename)
        photoUrl = data.publicUrl
      }
    }
    await supabase.from("race_events").insert({
      group_id: groupId, type: "red_flag",
      target_user_id: target, triggered_by: myId,
      photo_url: photoUrl, distance_delta: -5
    })
    setUploading(false)
    onClose()
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>🚩</div>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,color:"#ef4444",margin:"0 0 4px"}}>DRAPEAU ROUGE !</h2>
          <p style={{color:"#6b7280",fontSize:12,margin:0}}>−5m pour la personne désignée</p>
        </div>
        <div style={{background:"#13131f",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10}}>Qui a vomi ? 🤮</div>
          <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
            {members.filter((m:any)=>m.user_id!==myId).map((m:any)=>(
              <button key={m.user_id} onClick={()=>setTarget(m.user_id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,border:"none",cursor:"pointer",background:target===m.user_id?"linear-gradient(135deg,#ef444420,#dc262615)":"#1e1e2e",outline:target===m.user_id?"2px solid #ef4444":"2px solid transparent"}}>
                <DrunkAvatar config={parseAvatar(m.avatar_config)} bac={calcCurrentBAC(m.drinks,m.weight_kg,m.sex)} size={36} animate={false}/>
                <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{m.pseudo}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{background:"#13131f",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10}}>Photo (optionnel) 📸</div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          {preview ? (
            <img src={preview} style={{width:"100%",borderRadius:10,marginBottom:8,maxHeight:160,objectFit:"cover"}} alt="proof"/>
          ) : (
            <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px dashed #374151",background:"none",cursor:"pointer",color:"#6b7280",fontSize:13}}>
              📷 Prendre la photo
            </button>
          )}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#6b7280",fontSize:14,fontWeight:700}}>Annuler</button>
          <button onClick={submit} disabled={uploading||!target} style={{flex:2,padding:"13px",borderRadius:13,border:"none",cursor:target?"pointer":"not-allowed",background:target?"linear-gradient(135deg,#ef4444,#dc2626)":"#2a2a3e",color:"#fff",fontSize:14,fontWeight:700}}>
            {uploading?"⏳ Envoi…":"🚩 Infliger le malus"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RACE TRACK ───────────────────────────────────────────────────────────────
function RaceTrack({ members, samMember, isCreator, group, events, onShowWheel, onRemoveSam, onEndRace, onRedFlag, myId }: any) {
  const drinkers = members.filter((m:any)=>m.user_id!==samMember?.user_id)
  const maxDist  = Math.max(...drinkers.map((m:any)=>memberDist(m.drinks)),10)
  const sorted   = [...drinkers].sort((a:any,b:any)=>memberDist(b.drinks)-memberDist(a.drinks))
  const recentEvents = events.slice(0,3)

  // Fastest lap tracking: who drank 3 in last 30min
  const now = Date.now()
  const fastestLap = drinkers.find((m:any)=>{
    const recent = m.drinks.filter((d:DrinkEntry)=>now-d.addedAt < 30*60000)
    return recent.length >= 3
  })

  return (
    <div style={{padding:"16px 16px 100px"}}>
      <div style={{textAlign:"center",marginBottom:14}}>
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:4,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0}}>DRUNKRACE</h1>
        <p style={{color:"#4b5563",fontSize:10,margin:"2px 0 0",letterSpacing:1}}>EN COURS · {members.length} participants</p>
      </div>

      {/* Fastest Lap banner */}
      {fastestLap && (
        <div style={{background:"linear-gradient(90deg,#78350f,#92400e)",border:"1px solid #f59e0b",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>⚡</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#fbbf24"}}>FASTEST LAP +10m !</div>
            <div style={{fontSize:12,color:"#e2e8f0"}}>{fastestLap.pseudo} a bu 3 verres en 30min 🏆</div>
          </div>
        </div>
      )}

      {/* SAM banner */}
      {samMember ? (
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"linear-gradient(90deg,#052e16,#0a2010)",border:"1px solid #166534",borderRadius:12,marginBottom:12}}>
          <DrunkAvatar config={parseAvatar(samMember.avatar_config)} bac={0} size={36} animate={false}/>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>🚗 SAM{samMember.youngDriver?" (Jeune conducteur)":""}</div>
            <div style={{fontSize:12,color:"#e2e8f0"}}>{samMember.pseudo} · limite {samMember.youngDriver?"0,2":"0,5"}‰</div>
          </div>
          {isCreator && <div style={{display:"flex",gap:6}}>
            <button onClick={onShowWheel} style={{background:"#166534",border:"none",borderRadius:8,color:"#4ade80",fontSize:10,padding:"4px 8px",cursor:"pointer"}}>Changer</button>
            <button onClick={onRemoveSam} style={{background:"#7f1d1d",border:"none",borderRadius:8,color:"#fca5a5",fontSize:10,padding:"4px 8px",cursor:"pointer"}}>Retirer</button>
          </div>}
        </div>
      ) : isCreator && (
        <button onClick={onShowWheel} style={{width:"100%",padding:"11px",marginBottom:12,borderRadius:12,border:"1px dashed #3b1f6a",background:"#0f0f1a",cursor:"pointer",color:"#a855f7",fontSize:13,fontWeight:600}}>
          🎡 Désigner un SAM
        </button>
      )}

      {/* Red flag button */}
      <button onClick={onRedFlag} style={{width:"100%",padding:"10px",marginBottom:12,borderRadius:12,border:"1px solid #7f1d1d",background:"#1c0505",cursor:"pointer",color:"#f87171",fontSize:13,fontWeight:700}}>
        🚩 Drapeau Rouge (−5m)
      </button>

      {/* Recent events */}
      {recentEvents.length > 0 && (
        <div style={{marginBottom:12}}>
          {recentEvents.map((ev:any)=>(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#1c0505",border:"1px solid #7f1d1d",borderRadius:10,marginBottom:4}}>
              <span style={{fontSize:14}}>🚩</span>
              <span style={{fontSize:11,color:"#f87171",flex:1}}><strong>{ev.target_pseudo||"?"}</strong> a vomi → −5m</span>
              <span style={{fontSize:9,color:"#6b7280"}}>{fmtTime(new Date(ev.created_at).getTime())}</span>
            </div>
          ))}
        </div>
      )}

      {/* Circuit */}
      <div style={{background:"#111827",borderRadius:20,padding:"16px 12px",border:"1px solid #1f2937",marginBottom:14,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",inset:0,borderRadius:20,background:"repeating-linear-gradient(0deg,transparent,transparent 38px,#ffffff06 38px,#ffffff06 39px)",pointerEvents:"none" as const}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <span style={{color:"#374151",fontSize:10,fontWeight:700,letterSpacing:1}}>🏁 DÉPART</span>
          <span style={{color:"#374151",fontSize:10,fontWeight:700,letterSpacing:1}}>ARRIVÉE 🍺</span>
        </div>
        {sorted.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#4b5563",fontSize:12}}>Personne n'a encore bu... 🫤</div>}
        {sorted.map((member:any,i:number)=>{
          const dist=memberDist(member.drinks)
          const bonus = events.filter((e:any)=>e.target_user_id===member.user_id).reduce((s:number,e:any)=>s+e.distance_delta,0)
          const totalDist = Math.max(0, dist + bonus)
          const pct=maxDist>0?Math.min((totalDist/maxDist)*100,96):0
          const bac=calcCurrentBAC(member.drinks,member.weight_kg,member.sex)
          const st=getBACStatus(bac)
          return (
            <div key={member.user_id} style={{marginBottom:i<sorted.length-1?12:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,gap:4}}>
                <div style={{display:"flex",alignItems:"center",gap:4,flex:1,minWidth:0}}>
                  {i===0&&<span style={{fontSize:11,flexShrink:0}}>👑</span>}
                  <span style={{fontSize:11,fontWeight:600,color:member.isMe?"#c084fc":"#d1d5db",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{member.pseudo}{member.isMe?" (moi)":""}</span>
                  <span style={{fontSize:10,color:st.color,flexShrink:0}}>{st.emoji}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <span style={{fontSize:10,color:"#6b7280"}}>{bac.toFixed(2)}‰</span>
                  <span style={{fontSize:11,fontWeight:700,color:member.color}}>{totalDist.toFixed(1)}m</span>
                </div>
              </div>
              <div style={{position:"relative",height:44,background:"#1f2937",borderRadius:8,overflow:"hidden",boxShadow:"inset 0 2px 6px rgba(0,0,0,.4)"}}>
                <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(90deg,transparent,transparent 48px,#ffffff08 48px,#ffffff08 50px)"}}/>
                <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,transform:"translateY(-50%)",background:"repeating-linear-gradient(90deg,#ffffff15 0,#ffffff15 12px,transparent 12px,transparent 24px)"}}/>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:6,background:"repeating-linear-gradient(180deg,#ef4444 0,#ef4444 6px,#fff 6px,#fff 12px)",borderRadius:"8px 0 0 8px"}}/>
                <div style={{position:"absolute",right:0,top:0,bottom:0,width:6,background:"repeating-linear-gradient(180deg,#ef4444 0,#ef4444 6px,#fff 6px,#fff 12px)",borderRadius:"0 8px 8px 0"}}/>
                {[25,50,75].map(p=><div key={p} style={{position:"absolute",left:`${p}%`,top:0,bottom:0,width:1,background:"#ffffff12"}}/>)}
                <div style={{position:"absolute",left:6,top:0,bottom:0,width:`calc(${pct}% - 6px)`,background:`linear-gradient(90deg,${member.color}25,${member.color}55)`,transition:"width 0.9s cubic-bezier(.34,1.2,.64,1)",borderRadius:"0 4px 4px 0"}}/>
                <div style={{position:"absolute",left:`calc(${pct}% - 14px)`,top:"50%",transform:"translateY(-50%)",transition:"left 0.9s cubic-bezier(.34,1.2,.64,1)",zIndex:2,pointerEvents:"none" as const}}>
                  <DrunkAvatar config={parseAvatar(member.avatar_config)} bac={bac} size={28} animate={true} isMe={member.isMe} color={member.color}/>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Leaderboard */}
      <div style={{background:"#13131f",borderRadius:14,padding:14,border:"1px solid #1f2937",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10}}>Classement</div>
        {sorted.map((m:any,i:number)=>{
          const dist=memberDist(m.drinks)
          const bonus=events.filter((e:any)=>e.target_user_id===m.user_id).reduce((s:number,e:any)=>s+e.distance_delta,0)
          const totalDist=Math.max(0,dist+bonus)
          const bac=calcCurrentBAC(m.drinks,m.weight_kg,m.sex);const st=getBACStatus(bac)
          const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"]
          return (
            <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<sorted.length-1?"1px solid #1a1a2a":"none"}}>
              <span style={{fontSize:18,minWidth:26}}>{medals[i]||"·"}</span>
              <DrunkAvatar config={parseAvatar(m.avatar_config)} bac={bac} size={36} animate={false}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:m.isMe?"#c084fc":"#e2e8f0"}}>{m.pseudo}</div>
                <div style={{fontSize:10,color:st.color}}>{st.label}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{totalDist.toFixed(1)}m</div>
                <div style={{fontSize:9,color:"#6b7280"}}>{m.drinks.length} verre{m.drinks.length>1?"s":""}</div>
              </div>
            </div>
          )
        })}
        {samMember&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid #1a1a2a",marginTop:4}}>
          <span style={{fontSize:18,minWidth:26}}>🚗</span>
          <DrunkAvatar config={parseAvatar(samMember.avatar_config)} bac={0} size={36} animate={false}/>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:"#4ade80"}}>{samMember.pseudo}</div><div style={{fontSize:10,color:"#4ade80"}}>SAM — Héros de la soirée</div></div>
          <div style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>0.00‰</div>
        </div>}
      </div>
      {isCreator&&<button onClick={onEndRace} style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid #7f1d1d",cursor:"pointer",background:"#1c0505",color:"#f87171",fontSize:14,fontWeight:700}}>🏁 Terminer la soirée</button>}
    </div>
  )
}

// ── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ myMember, members, samMember, events }: any) {
  const bac=calcCurrentBAC(myMember.drinks,myMember.weight_kg,myMember.sex)
  const dist=memberDist(myMember.drinks)
  const bonus=events.filter((e:any)=>e.target_user_id===myMember.user_id).reduce((s:number,e:any)=>s+e.distance_delta,0)
  const totalDist=Math.max(0,dist+bonus)
  const totalAlc=myMember.drinks.reduce((s:number,d:DrinkEntry)=>s+d.alcohol_g,0)
  const totalGroupDist=members.filter((m:any)=>m.user_id!==samMember?.user_id).reduce((s:number,m:any)=>s+memberDist(m.drinks),0)
  const peak=calcPeak(myMember.drinks,myMember.weight_kg,myMember.sex)
  const soberTime=calcSoberTime(myMember.drinks,myMember.weight_kg,myMember.sex,0)
  const driveTime=calcSoberTime(myMember.drinks,myMember.weight_kg,myMember.sex,0.5)
  const drinkCounts=(myMember.drinks as DrinkEntry[]).reduce((acc:any[],d)=>{
    const ex=acc.find(x=>x.drinkId===d.drinkId&&x.vol_cl===d.vol_cl);if(ex)ex.count++;else acc.push({...d,count:1});return acc
  },[])
  return (
    <div style={{padding:"16px 16px 100px"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,color:"#c084fc",margin:"0 0 14px"}}>Mes Stats</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {l:"Distance",v:`${totalDist.toFixed(1)}m`,icon:"🏁",c:"#c084fc"},
          {l:"Verres",v:myMember.drinks.length,icon:"🍺",c:"#ec4899"},
          {l:"BAC actuel",v:`${bac.toFixed(3)}‰`,icon:"🩸",c:"#f87171"},
          {l:"Pic estimé",v:`${peak.bac.toFixed(3)}‰`,icon:"📈",c:"#fb923c"},
          {l:"Alcool",v:`${totalAlc.toFixed(1)}g`,icon:"⚗️",c:"#f97316"},
          {l:"Calories",v:`~${(totalAlc*7).toFixed(0)}`,icon:"🔥",c:"#38bdf8"},
        ].map(s=>(
          <div key={s.l} style={{background:"#13131f",borderRadius:12,padding:"12px",border:"1px solid #2a2a3e"}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:"#6b7280"}}>{s.l}</div>
          </div>
        ))}
      </div>
      {myMember.drinks.length>0&&<div style={{background:"#13131f",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #2a2a3e"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10}}>Prévisions</div>
        <div style={{display:"flex",gap:8}}>
          {[{c:"#4ade80",bg:"#1a2e0a",bdr:"#166534",l:"🚗 Conduire",v:!driveTime||driveTime<=Date.now()?"✅ OK":fmtTime(driveTime),s:"retour à 0,5‰"},
            {c:"#c084fc",bg:"#13131f",bdr:"#3b1f6a",l:"😇 Sobre",v:!soberTime||soberTime<=Date.now()?"✅ OK":fmtTime(soberTime),s:"retour à 0‰"},
            {c:"#fb923c",bg:"#13131f",bdr:"#92400e",l:"📈 Pic",v:fmtTime(peak.atMs),s:`${peak.bac.toFixed(3)}‰`}
          ].map(x=>(
            <div key={x.l} style={{flex:1,background:x.bg,border:`1px solid ${x.bdr}`,borderRadius:10,padding:"8px"}}>
              <div style={{fontSize:9,color:x.c,fontWeight:700,textTransform:"uppercase" as const}}>{x.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:x.c,fontFamily:"'Bebas Neue',cursive",marginTop:2}}>{x.v}</div>
              <div style={{fontSize:9,color:"#6b7280"}}>{x.s}</div>
            </div>
          ))}
        </div>
      </div>}
      <div style={{background:"#13131f",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #2a2a3e"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1}}>ALCOOLÉMIE</span>
          <span style={{fontSize:11,color:getBACStatus(bac).color,fontWeight:700}}>{getBACStatus(bac).label}</span>
        </div>
        <div style={{display:"flex",gap:2,height:10,borderRadius:6,overflow:"hidden",marginBottom:6}}>
          {[{max:0.2,c:"#4ade80"},{max:0.5,c:"#a3e635"},{max:0.8,c:"#facc15"},{max:1.2,c:"#fb923c"},{max:1.8,c:"#f87171"},{max:2.5,c:"#dc2626"}].map((seg,i,arr)=>{
            const start=i===0?0:arr[i-1].max;const fill=bac<=start?0:bac>=seg.max?100:((bac-start)/(seg.max-start))*100
            return <div key={i} style={{flex:seg.max-start,background:"#1e1e2e",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${fill}%`,background:seg.c,transition:"width .5s"}}/></div>
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#374151"}}>{["0‰","0.2","0.5","0.8","1.2","1.8","2.5‰"].map(l=><span key={l}>{l}</span>)}</div>
      </div>
      {drinkCounts.length>0&&<div style={{background:"#13131f",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #2a2a3e"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10}}>Ce soir tu as bu</div>
        {drinkCounts.map((d:any,i:number)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:16}}>{d.emoji}</span>
            <div style={{flex:1}}><div style={{fontSize:11,color:"#e2e8f0"}}>{d.name} {d.vol_cl}cl</div><div style={{fontSize:9,color:"#6b7280"}}>{d.degree_pct}% · {d.alcohol_g.toFixed(1)}g · +{calcDistance(d.alcohol_g,d.vol_cl).toFixed(1)}m</div></div>
            <div style={{background:`${d.color}20`,borderRadius:20,padding:"2px 10px",fontSize:11,color:d.color,fontWeight:700}}>×{d.count}</div>
          </div>
        ))}
      </div>}
      <div style={{background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:14,border:"1px solid #3b1f6a"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,marginBottom:4}}>GROUPE — DISTANCE TOTALE</div>
        <div style={{fontSize:28,fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive"}}>{totalGroupDist.toFixed(1)}m</div>
        <div style={{fontSize:11,color:"#6b7280"}}>{members.length} participants 🏆</div>
      </div>
    </div>
  )
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ myMember, user, group, onUpdate }: any) {
  const [pseudo, setPseudo] = useState(myMember.pseudo)
  const [weight, setWeight] = useState(String(myMember.weight_kg))
  const [sex, setSex]       = useState(myMember.sex)
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(parseAvatar(myMember.avatar_config))
  const [saved, setSaved]   = useState(false)
  const [copied, setCopied] = useState(false)
  const [editAvatar, setEditAvatar] = useState(false)
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://drunkrace.vercel.app"

  const save = async () => {
    await supabase.from("profiles").update({ pseudo, weight_kg:parseInt(weight)||70, sex, avatar_config: avatarCfg }).eq("id", user.id)
    onUpdate({ pseudo, weight_kg:parseInt(weight)||70, sex, avatar_config: avatarCfg })
    setSaved(true); setTimeout(()=>setSaved(false),1500)
  }
  const copyInvite = () => {
    navigator.clipboard.writeText(`${appUrl}/join/${group.join_code}`)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  if (editAvatar) return (
    <AvatarEditor initial={avatarCfg} onSave={(cfg)=>setAvatarCfg(cfg)} onClose={()=>setEditAvatar(false)}/>
  )

  return (
    <div style={{padding:"16px 16px 100px"}}>
      <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,color:"#c084fc",margin:"0 0 16px"}}>Mon Profil</h2>
      {/* Invite */}
      <div style={{background:"linear-gradient(135deg,#1a1030,#130d22)",borderRadius:14,padding:14,border:"1px solid #3b1f6a",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8}}>🎉 Inviter des amis</div>
        <div style={{background:"#0f0f1a",borderRadius:10,padding:"10px 14px",marginBottom:10,textAlign:"center"}}>
          <div style={{fontSize:10,color:"#6b7280",marginBottom:2}}>Code de la soirée</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,color:"#c084fc",letterSpacing:6}}>{group.join_code}</div>
        </div>
        <button onClick={copyInvite} style={{width:"100%",padding:"11px",borderRadius:11,border:"none",cursor:"pointer",background:copied?"#166534":"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:13,fontWeight:700}}>
          {copied?"✅ Lien copié !":"📋 Copier le lien d'invitation"}
        </button>
      </div>

      {/* Avatar preview + edit */}
      <div style={{textAlign:"center",marginBottom:16}}>
        <DrunkAvatar config={avatarCfg} bac={0} size={100} animate={false}/>
        <div style={{display:"inline-block",background:"linear-gradient(135deg,#a855f7,#ec4899)",borderRadius:20,padding:"4px 16px",fontSize:13,fontWeight:700,color:"#fff",marginTop:8,marginBottom:10}}>{pseudo}</div>
        <br/>
        <button onClick={()=>setEditAvatar(true)} style={{background:"#13131f",border:"1px solid #3b1f6a",borderRadius:12,padding:"8px 20px",color:"#c084fc",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          🎨 Personnaliser l'avatar
        </button>
      </div>

      <div style={{background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:12}}>
        {[{l:"Pseudo",t:"text",v:pseudo,s:setPseudo},{l:"Poids (kg)",t:"number",v:weight,s:setWeight}].map(f=>(
          <div key={f.l} style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:4}}>{f.l}</div>
            <input type={f.t} value={f.v} onChange={e=>f.s(e.target.value)} style={{width:"100%",padding:"11px 12px",borderRadius:10,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box" as const}}/>
          </div>
        ))}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:6}}>Sexe biologique</div>
          <div style={{display:"flex",gap:8}}>
            {[{v:"M",l:"👨 Homme"},{v:"F",l:"👩 Femme"}].map(s=>(
              <button key={s.v} onClick={()=>setSex(s.v)} style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:sex===s.v?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:sex===s.v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:12,fontWeight:sex===s.v?700:400}}>{s.l}</button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} style={{width:"100%",padding:"13px",borderRadius:13,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,marginBottom:10}}>
        {saved?"✅ Sauvegardé !":"Sauvegarder"}
      </button>
      <button onClick={()=>supabase.auth.signOut()} style={{width:"100%",padding:"12px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#6b7280",fontSize:14,marginBottom:10}}>
        Se déconnecter
      </button>
      <div style={{background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3e"}}>
        <p style={{color:"#6b7280",fontSize:11,margin:0,lineHeight:1.7}}>⚠️ BAC estimé via Widmark + absorption 90min. Ne conduis jamais après avoir bu. 🚗🚫</p>
      </div>
    </div>
  )
}

// ── TAB BAR ──────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: {active:string, onChange:(t:string)=>void}) {
  const tabs=[{id:"race",label:"🏁 Piste"},{id:"drink",label:"🍺 Boire"},{id:"stats",label:"📊 Stats"},{id:"photo",label:"📸 Photos"},{id:"profile",label:"👤 Profil"}]
  return (
    <div style={{display:"flex",position:"fixed",bottom:0,left:0,right:0,background:"#0a0a14",borderTop:"1px solid #1a1a2a",zIndex:1000,paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:"10px 0 7px",background:"none",border:"none",color:active===t.id?"#c084fc":"#4b5563",fontSize:9,fontWeight:active===t.id?700:400,cursor:"pointer",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:1}}>
          <span style={{fontSize:17}}>{t.label.split(" ")[0]}</span>
          <span style={{letterSpacing:.3}}>{t.label.split(" ").slice(1).join(" ")}</span>
        </button>
      ))}
    </div>
  )
}

// ── MAIN RACE APP ─────────────────────────────────────────────────────────────
export default function RaceApp({ user, profile, group, onLeave, onProfileUpdate }: any) {
  const [tab, setTab]           = useState("race")
  const [members, setMembers]   = useState<any[]>([])
  const [events, setEvents]     = useState<any[]>([])
  const [showWheel, setShowWheel]   = useState(false)
  const [showRedFlag, setShowRedFlag] = useState(false)
  const [ended, setEnded]       = useState(group.status==="finished")
  const supabase = createClient()

  const loadMembers = async () => {
    const { data: membersData } = await supabase.from("group_members").select("*").eq("group_id",group.id)
    if (!membersData) return
    const userIds = membersData.map((m:any)=>m.user_id)
    const { data: profilesData } = await supabase.from("profiles").select("*").in("id",userIds)
    const profileMap: Record<string,any> = {}
    ;(profilesData||[]).forEach((p:any)=>{profileMap[p.id]=p})
    const enriched = membersData.map((m:any)=>{
      const prof=profileMap[m.user_id]||{}
      const drinks:DrinkEntry[]=parseDrinksLog(m.drinks_log)
      return { ...m, pseudo:prof.pseudo||"?", avatar_config:prof.avatar_config||{}, weight_kg:prof.weight_kg||70, sex:prof.sex||"M", color:m.color||"#a855f7", drinks, isMe:m.user_id===user.id, youngDriver:m.young_driver||false }
    })
    setMembers(enriched)
  }

  const loadEvents = async () => {
    const { data } = await supabase.from("race_events").select("*, profiles!target_user_id(pseudo)").eq("group_id",group.id).order("created_at",{ascending:false}).limit(10)
    if (data) setEvents(data.map((e:any)=>({...e, target_pseudo:e.profiles?.pseudo})))
  }

  useEffect(()=>{
    loadMembers(); loadEvents()
    const channel = supabase.channel(`group-${group.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"group_members",filter:`group_id=eq.${group.id}`},()=>loadMembers())
      .on("postgres_changes",{event:"*",schema:"public",table:"race_events",filter:`group_id=eq.${group.id}`},()=>loadEvents())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"groups",filter:`id=eq.${group.id}`},(payload:any)=>{if(payload.new.status==="finished")setEnded(true)})
      .subscribe()
    // Fastest lap check every 30s
    const flInterval = setInterval(async ()=>{
      const now=Date.now()
      const fastestMember = members.find(m=>{
        if(m.is_sam) return false
        const recent=m.drinks.filter((d:DrinkEntry)=>now-d.addedAt<30*60000)
        return recent.length>=3
      })
      if(fastestMember) {
        const already = events.find(e=>e.type==="fastest_lap"&&e.target_user_id===fastestMember.user_id&&now-new Date(e.created_at).getTime()<35*60000)
        if(!already) {
          await supabase.from("race_events").insert({group_id:group.id,type:"fastest_lap",target_user_id:fastestMember.user_id,triggered_by:user.id,distance_delta:10})
          loadEvents()
        }
      }
    }, 30000)
    return ()=>{supabase.removeChannel(channel);clearInterval(flInterval)}
  },[group.id])

  const myMember  = members.find(m=>m.isMe)
  const samMember = members.find(m=>m.is_sam)
  const isCreator = myMember?.is_creator||false

  const handleAddDrink = async (drink:DrinkEntry)=>{
    if(!myMember) return
    const currentSerialized=(myMember.drinks as DrinkEntry[]).map((d:DrinkEntry)=>serializeDrink(d))
    const newLog=[...currentSerialized,serializeDrink(drink)]
    const {error}=await supabase.from("group_members").update({drinks_log:newLog}).eq("group_id",group.id).eq("user_id",user.id)
    if(error){console.error("addDrink:",error);alert("Erreur: "+error.message)}
    else loadMembers()
  }
  const handleUndo = async ()=>{
    if(!myMember||!myMember.drinks.length) return
    const currentSerialized=(myMember.drinks as DrinkEntry[]).map((d:DrinkEntry)=>serializeDrink(d))
    currentSerialized.pop()
    await supabase.from("group_members").update({drinks_log:currentSerialized}).eq("group_id",group.id).eq("user_id",user.id)
    loadMembers()
  }
  const handleSamChosen=async(userId:string,youngDriver:boolean)=>{
    await supabase.from("group_members").update({is_sam:false,young_driver:false}).eq("group_id",group.id)
    await supabase.from("group_members").update({is_sam:true,young_driver:youngDriver}).eq("group_id",group.id).eq("user_id",userId)
    setShowWheel(false);loadMembers()
  }
  const handleRemoveSam=async()=>{
    await supabase.from("group_members").update({is_sam:false,young_driver:false}).eq("group_id",group.id);loadMembers()
  }
  const handleEndRace=async()=>{
    if(!confirm("Terminer la soirée pour tout le monde ?"))return
    await supabase.from("groups").update({status:"finished"}).eq("id",group.id);setEnded(true)
  }

  if(!myMember) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#6b7280"}}>Chargement…</div>

  if(ended) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16}}>🏁</div>
      <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 8px"}}>FIN DE LA SOIRÉE !</h1>
      {[...members].filter(m=>!m.is_sam).sort((a,b)=>memberDist(b.drinks)-memberDist(a.drinks)).slice(0,3).map((m,i)=>(
        <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",background:"#13131f",borderRadius:14,marginBottom:8,width:"100%",maxWidth:320,border:"1px solid #2a2a3e"}}>
          <span style={{fontSize:20}}>{["🥇","🥈","🥉"][i]}</span>
          <DrunkAvatar config={parseAvatar(m.avatar_config)} bac={0} size={40} animate={false}/>
          <div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:600,color:"#e2e8f0"}}>{m.pseudo}</div></div>
          <div style={{fontWeight:700,color:"#c084fc",fontFamily:"'Bebas Neue',cursive",fontSize:18}}>{memberDist(m.drinks).toFixed(1)}m</div>
        </div>
      ))}
      <button onClick={onLeave} style={{marginTop:20,padding:"14px 32px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700}}>Retour à l'accueil</button>
    </div>
  )

  return (
    <div style={{background:"#0a0a14",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative"}}>
      {tab==="race"    && <RaceTrack members={members} samMember={samMember} isCreator={isCreator} group={group} events={events} onShowWheel={()=>setShowWheel(true)} onRemoveSam={handleRemoveSam} onEndRace={handleEndRace} onRedFlag={()=>setShowRedFlag(true)} myId={user.id}/>}
      {tab==="drink"   && <DrinkTab myMember={myMember} samMember={samMember} onAddDrink={handleAddDrink} onUndo={handleUndo}/>}
      {tab==="stats"   && <StatsTab myMember={myMember} members={members} samMember={samMember} events={events}/>}
      {tab==="photo"   && <PhotoTab groupId={group.id} userId={user.id}/>}
      {tab==="profile" && <ProfileTab myMember={myMember} user={user} group={group} onUpdate={(p:any)=>{setMembers(prev=>prev.map(m=>m.isMe?{...m,...p}:m));onProfileUpdate()}}/>}
      <TabBar active={tab} onChange={setTab}/>
      {showWheel&&<SamWheel members={members} onSamChosen={handleSamChosen} onClose={()=>setShowWheel(false)}/>}
      {showRedFlag&&<RedFlagModal members={members} myId={user.id} groupId={group.id} onClose={()=>{setShowRedFlag(false);loadEvents()}}/>}
    </div>
  )
}
