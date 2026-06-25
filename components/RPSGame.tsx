"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"

type Choice = "rock" | "paper" | "scissors" | null
type Phase = "invite" | "waiting_accept" | "ready_p1" | "lights_p1" | "choose_p1" | "waiting_p2" | "ready_p2" | "lights_p2" | "choose_p2" | "reveal" | "result"

const CHOICES = [
  { id: "rock" as Choice,     emoji: "🪨", label: "Pierre" },
  { id: "paper" as Choice,    emoji: "📄", label: "Feuille" },
  { id: "scissors" as Choice, emoji: "✂️", label: "Ciseaux" },
]

function getWinner(a: Choice, b: Choice): "p1" | "p2" | "draw" {
  if (a === b) return "draw"
  if ((a==="rock"&&b==="scissors")||(a==="paper"&&b==="rock")||(a==="scissors"&&b==="paper")) return "p1"
  return "p2"
}

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  invite?: any // existing invite if responding
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

export default function RPSGame({ members, myUserId, groupId, invite, onAwardDistance, onClose }: Props) {
  const supabase = createClient()
  const isChallenger = !invite || invite.from_user_id === myUserId

  const [phase, setPhase] = useState<Phase>(invite ? (invite.from_user_id === myUserId ? "waiting_accept" : "ready_p2") : "invite")
  const [targetUserId, setTargetUserId] = useState(invite?.to_user_id || "")
  const [inviteId, setInviteId] = useState(invite?.id || "")
  const [myChoice, setMyChoice] = useState<Choice>(null)
  const p1ChoiceRef = useRef<Choice>(null)
  const myChoiceRef = useRef<Choice>(null)
  const [opponentChoice, setOpponentChoice] = useState<Choice>(null)
  const [result, setResult] = useState<"win"|"lose"|"draw"|"win_p1"|"win_p2"|null>(null)
  const [sending, setSending] = useState(false)
  const [modeSelected, setModeSelected] = useState<'local'|'invite'|null>(invite ? 'invite' : null)
  const [isLocalP1, setIsLocalP1] = useState(true)
  const [localP2Choice, setLocalP2Choice] = useState<Choice>(null)

  const me = members.find(m => m.user_id === myUserId)
  const opponent = members.find(m => m.user_id === (isChallenger ? targetUserId : invite?.from_user_id))

  // Subscribe to invite updates + polling backup
  useEffect(() => {
    if (!inviteId) return

    // Polling every 1.5s as reliable backup
    const poll = setInterval(async () => {
      const { data } = await supabase.from("game_invites").select("*").eq("id", inviteId).single()
      if (!data) return
      if (isChallenger && data.status === "accepted" && phase === "waiting_accept") {
        // Mode online: pas besoin de "passe le téléphone", aller direct au choix
        setPhase("choose_p1")
      }
      if (isChallenger && data.game_data?.p2_choice && phase === "waiting_p2") {
        setOpponentChoice(data.game_data.p2_choice)
        computeResult(myChoiceRef.current, data.game_data.p2_choice)
      }
      if (data.game_data?.p1_choice && data.game_data?.p2_choice && data.status === "completed") {
        const w = getWinner(data.game_data.p1_choice, data.game_data.p2_choice)
        const iWin = isChallenger ? w === "p1" : w === "p2"
        setMyChoice(isChallenger ? data.game_data.p1_choice : data.game_data.p2_choice)
        setOpponentChoice(isChallenger ? data.game_data.p2_choice : data.game_data.p1_choice)
        setResult(w === "draw" ? "draw" : iWin ? "win" : "lose")
        setPhase("result")
      }
    }, 1500)

    const channel = supabase.channel(`rps-${inviteId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "game_invites",
        filter: `id=eq.${inviteId}`
      }, (payload: any) => {
        const data = payload.new
        // Challenger sees: opponent accepted → go to lights
        if (isChallenger && data.status === "accepted" && phase === "waiting_accept") {
          setPhase("choose_p1")
        }
        // Challenger sees: opponent made choice
        if (isChallenger && data.game_data?.p2_choice && phase === "waiting_p2") {
          setOpponentChoice(data.game_data.p2_choice)
          computeResult(myChoiceRef.current, data.game_data.p2_choice)
        }
        // Opponent sees: challenger made choice → go to their turn
        // P1 chose notification handled by opponent's own flow
        // Both have chosen → show result
        if (data.game_data?.p1_choice && data.game_data?.p2_choice && data.status === "completed") {
          const w = getWinner(data.game_data.p1_choice, data.game_data.p2_choice)
          const iWin = isChallenger ? w === "p1" : w === "p2"
          setMyChoice(isChallenger ? data.game_data.p1_choice : data.game_data.p2_choice)
          setOpponentChoice(isChallenger ? data.game_data.p2_choice : data.game_data.p1_choice)
          setResult(w === "draw" ? "draw" : iWin ? "win" : "lose")
          setPhase("result")
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [inviteId, phase, myChoice, isChallenger])

  const computeResult = async (my: Choice, opp: Choice) => {
    const w = getWinner(my!, opp)
    const iWin = isChallenger ? w === "p1" : w === "p2"
    setResult(w === "draw" ? "draw" : iWin ? "win" : "lose")
    setPhase("result")
    // Update DB as completed
    const p1c = isChallenger ? my : opp
    const p2c = isChallenger ? opp : my
    await supabase.from("game_invites").update({
      status: "completed",
      game_data: { p1_choice: p1c, p2_choice: p2c }
    }).eq("id", inviteId)
  }

  // Send invite
  const sendInvite = async () => {
    if (!targetUserId) return
    setSending(true)
    const { data, error } = await supabase.from("game_invites").insert({
      group_id: groupId, game_type: "rps",
      from_user_id: myUserId, to_user_id: targetUserId,
      status: "pending", game_data: {}
    }).select().single()
    if (error) { alert("Erreur: "+error.message); setSending(false); return }
    setInviteId(data.id)
    setPhase("waiting_accept")
    setSending(false)
  }

  // Accept invite (opponent)
  const acceptInvite = async () => {
    await supabase.from("game_invites").update({ status: "accepted" }).eq("id", inviteId)
    setPhase("ready_p2")
  }

  // Launch F1 lights then allow choice


  // Submit my choice
  const submitChoice = async (c: Choice) => {
    if (modeSelected === "local") {
      if (isLocalP1) {
        // P1 chose — save to ref AND state, do NOT overwrite with P2 later
        p1ChoiceRef.current = c
        setMyChoice(c)          // myChoice = P1's choice
        setIsLocalP1(false)
        setPhase("ready_p2")
      } else {
        // P2 chose — read P1 from ref (state safe), save P2 separately
        const p1c = p1ChoiceRef.current
        setLocalP2Choice(c)     // localP2Choice = P2's choice
        setOpponentChoice(c)
        // DO NOT call setMyChoice here — it would overwrite P1's choice!
        const w = getWinner(p1c, c)
        setResult(w === "draw" ? "draw" : w === "p1" ? "win_p1" : "win_p2")
        setPhase("result")
      }
      return
    }
    // Online mode — my choice is always me
    setMyChoice(c)
    myChoiceRef.current = c
    if (isChallenger) {
      // P1 chose → save and wait for P2
      await supabase.from("game_invites").update({
        game_data: { p1_choice: c }
      }).eq("id", inviteId)
      setPhase("waiting_p2")
    } else {
      // P2 chose → check if P1 already chose
      const { data } = await supabase.from("game_invites").select("game_data").eq("id", inviteId).single()
      const p1c = data?.game_data?.p1_choice
      if (p1c) {
        setOpponentChoice(p1c)
        await supabase.from("game_invites").update({
          status: "completed",
          game_data: { p1_choice: p1c, p2_choice: c }
        }).eq("id", inviteId)
        const w = getWinner(p1c, c)
        const iWin = w === "p2"
        setResult(w === "draw" ? "draw" : iWin ? "win" : "lose")
        setPhase("result")
      } else {
        await supabase.from("game_invites").update({
          game_data: { ...(data?.game_data||{}), p2_choice: c }
        }).eq("id", inviteId)
        setPhase("waiting_p2")
      }
    }
  }

  const applyAndClose = () => {
    if (!result) return
    if (modeSelected === "local") {
      const p1Id = myUserId
      const p2Id = targetUserId
      if (result === "win_p1") { onAwardDistance(p1Id, 8); if(p2Id) onAwardDistance(p2Id, -3) }
      else if (result === "win_p2") { if(p2Id) onAwardDistance(p2Id, 8); onAwardDistance(p1Id, -3) }
      else { onAwardDistance(p1Id, 2); if(p2Id) onAwardDistance(p2Id, 2) }
    } else {
      const myId = myUserId
      const oppId = isChallenger ? targetUserId : invite?.from_user_id
      if (result === "win") { onAwardDistance(myId, 8) }
      else if (result === "lose") { onAwardDistance(myId, -3) }
      else { onAwardDistance(myId, 2); if(oppId) onAwardDistance(oppId, 2) }
    }
    onClose()
  }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, overflowY:"auto" }

  // ── MODE SELECT ──────────────────────────────────────────────────────────
  if (phase === "invite" && !modeSelected) return (
    <div style={BG}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:24, alignItems:"center" }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🤜 PIERRE FEUILLE CISEAUX
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14 }}>
        <button onClick={() => setModeSelected("local")}
          style={{ padding:"24px", borderRadius:18, border:"1px solid #3b1f6a", cursor:"pointer", background:"linear-gradient(135deg,#1a1030,#130d22)", textAlign:"left" as const }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📱</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#c084fc", letterSpacing:2, marginBottom:4 }}>Même téléphone</div>
          <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>Les deux joueurs jouent sur ce téléphone. Chacun choisit en se passant l'appareil.</div>
        </button>
        <button onClick={() => setModeSelected("invite")}
          style={{ padding:"24px", borderRadius:18, border:"1px solid #1e3a8a", cursor:"pointer", background:"linear-gradient(135deg,#0c1a3a,#071020)", textAlign:"left" as const }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📨</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#60a5fa", letterSpacing:2, marginBottom:4 }}>Inviter un joueur</div>
          <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>Chaque joueur joue depuis son propre téléphone en temps réel.</div>
        </button>
      </div>
    </div>
  )

  // ── INVITE SCREEN ─────────────────────────────────────────────────────────
  if (phase === "invite" && modeSelected === "invite") return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🤜 PIERRE FEUILLE CISEAUX
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>
          1 manche. Gagnant <span style={{ color:"#4ade80", fontWeight:700 }}>+8m</span> · Perdant <span style={{ color:"#f87171", fontWeight:700 }}>−3m</span> + boit un shot 🥃<br/>
          Chaque joueur choisit depuis son propre téléphone 📱
        </div>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:16, border:"1px solid #2a2a3e", width:"100%", maxWidth:360, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Défier un joueur</div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {members.filter(m => m.user_id !== myUserId && !m.is_sam).map((m: any) => (
            <button key={m.user_id} onClick={() => setTargetUserId(m.user_id)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", background:targetUserId===m.user_id?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e", outline:targetUserId===m.user_id?"2px solid #a855f7":"2px solid transparent", transition:"all .15s" }}>
              <div style={{ fontSize:28 }}>
                {m.avatar || "🐺"}
              </div>
              <div style={{ flex:1, textAlign:"left" as const }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{m.pseudo}</div>
              </div>
              {targetUserId===m.user_id && <span style={{ color:"#c084fc", fontSize:16 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <button onClick={sendInvite} disabled={!targetUserId || sending}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:targetUserId?"pointer":"not-allowed", background:targetUserId?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e", color:targetUserId?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        {sending ? "⏳ Envoi…" : "📨 Envoyer le défi !"}
      </button>
    </div>
  )

  // ── LOCAL MODE: player select ────────────────────────────────────────────
  if (phase === "invite" && modeSelected === "local") return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🤜 MÊME TÉLÉPHONE
        </h2>
        <button onClick={()=>setModeSelected(null)} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>← Retour</button>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>
          Gagnant <span style={{ color:"#4ade80", fontWeight:700 }}>+8m</span> · Perdant <span style={{ color:"#f87171", fontWeight:700 }}>−3m</span> + boit un shot 🥃<br/>
          Passez-vous le téléphone pour choisir en secret 📱
        </div>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:16, border:"1px solid #2a2a3e", width:"100%", maxWidth:360, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:8 }}>🔴 Joueur 1 (toi)</div>
        <div style={{ padding:"10px 14px", borderRadius:10, background:"#1e1e2e", color:"#e2e8f0", fontSize:13, marginBottom:16 }}>
          {me?.pseudo}
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:"#3b82f6", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:8 }}>🔵 Joueur 2</div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {members.filter((m:any) => m.user_id !== myUserId && !m.is_sam).map((m:any) => (
            <button key={m.user_id} onClick={() => setTargetUserId(m.user_id)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer", background:targetUserId===m.user_id?"linear-gradient(135deg,#1e3a8a,#0c1a3a)":"#1e1e2e", outline:targetUserId===m.user_id?"2px solid #3b82f6":"2px solid transparent" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{m.pseudo}</span>
              {targetUserId===m.user_id && <span style={{ marginLeft:"auto", color:"#60a5fa" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => { if(targetUserId) setPhase("ready_p1") }} disabled={!targetUserId}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:targetUserId?"pointer":"not-allowed", background:targetUserId?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e", color:targetUserId?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        ✊ Commencer !
      </button>
    </div>
  )

  // ── WAITING FOR ACCEPT ────────────────────────────────────────────────────
  if (phase === "waiting_accept") return (
    <div style={BG}>
      <div style={{ textAlign:"center", maxWidth:320 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>📨</div>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#c084fc", letterSpacing:2, marginBottom:8 }}>
          DÉFI ENVOYÉ !
        </div>
        <div style={{ color:"#9ca3af", fontSize:13, marginBottom:24 }}>
          En attente que <span style={{ color:"#e2e8f0", fontWeight:700 }}>{opponent?.pseudo || "ton adversaire"}</span> accepte…
        </div>
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:32 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#a855f7", animation:`pulse 1s ${i*0.3}s infinite` }}/>
          ))}
        </div>
        <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:12, border:"1px solid #2a2a3e", cursor:"pointer", background:"#1e1e2e", color:"#6b7280", fontSize:13 }}>
          Annuler
        </button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )

  // ── READY SCREENS → direct choose (pas de feux) ──────────────────────────
  if (phase === "ready_p1" || phase === "ready_p2") {
    // En mode online, skip l'écran "passe le téléphone" → direct au choix
    if (modeSelected === "invite") {
      const nextPhase = phase === "ready_p1" ? "choose_p1" : "choose_p2"
      setTimeout(() => setPhase(nextPhase), 0)
      return null
    }
    const isP1 = phase === "ready_p1"
    const color = isP1 ? "#ef4444" : "#3b82f6"
    const bg = isP1 ? "#1c0505" : "#0c1a3a"
    const border = isP1 ? "#7f1d1d" : "#1e3a8a"
    const nextPhase = isP1 ? "choose_p1" : "choose_p2"
    const playerName = isP1 ? (me?.pseudo || "Joueur 1") : (opponent?.pseudo || "Joueur 2")
    return (
      <div style={BG}>
        <div style={{ background:bg, border:`2px solid ${border}`, borderRadius:24, padding:"28px 24px", textAlign:"center", width:"100%", maxWidth:340, marginBottom:32 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color, letterSpacing:3, marginBottom:8 }}>
            {isP1 ? "🔴 CHALLENGER" : "🔵 ADVERSAIRE"}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#e2e8f0", letterSpacing:2, marginBottom:12 }}>{playerName}</div>
          <div style={{ fontSize:48, marginBottom:12 }}>🤜</div>
          <div style={{ fontSize:12, color:"#6b7280" }}>Prends le téléphone et choisis en secret !</div>
        </div>
        <button onClick={() => setPhase(nextPhase)}
          style={{ width:"100%", maxWidth:340, padding:"18px", borderRadius:18, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${color},${color}cc)`, color:"#fff", fontSize:18, fontWeight:700, boxShadow:`0 0 24px ${color}50` }}>
          ✊ JE SUIS PRÊT !
        </button>
      </div>
    )
  }

  // ── CHOOSE ───────────────────────────────────────────────────────────────
  if (phase === "choose_p1" || phase === "choose_p2") {
    const isP1 = phase === "choose_p1"
    const color = isP1 ? "#ef4444" : "#3b82f6"
    const bg = isP1 ? "#1c0505" : "#0c1a3a"
    const border = isP1 ? "#7f1d1d" : "#1e3a8a"
    return (
      <div style={BG}>
        {/* GO flash */}
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:64, color:"#4ade80", letterSpacing:6, textShadow:"0 0 40px #4ade80, 0 0 80px #4ade8050", marginBottom:32, animation:"goFlash 0.5s ease-out" }}>
          GO!
        </div>
        <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, padding:"12px 20px", marginBottom:28, textAlign:"center" }}>
          <div style={{ fontSize:12, color, fontWeight:700 }}>{me?.pseudo} — Choisis en secret ! 🤫</div>
        </div>
        <div style={{ display:"flex", gap:14 }}>
          {CHOICES.map(c => (
            <button key={c.id} onClick={() => submitChoice(c.id)}
              style={{ width:94, height:94, borderRadius:20, border:`2px solid ${border}`, cursor:"pointer", background:bg, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:6, transition:"transform .15s", fontSize:38 }}
              onTouchStart={e => (e.currentTarget.style.transform = "scale(0.93)")}
              onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}>
              {c.emoji}
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>{c.label}</span>
            </button>
          ))}
        </div>
        <style>{`@keyframes goFlash{0%{opacity:0;transform:scale(0.5)}50%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    )
  }

  // ── WAITING FOR OPPONENT ──────────────────────────────────────────────────
  if (phase === "waiting_p2") return (
    <div style={BG}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#c084fc", letterSpacing:2, marginBottom:8 }}>
          {myChoice ? `Tu as choisi ${CHOICES.find(c=>c.id===myChoice)?.emoji}` : ""}
        </div>
        <div style={{ color:"#6b7280", fontSize:13, marginBottom:24 }}>
          En attente du choix de <span style={{ color:"#e2e8f0", fontWeight:700 }}>{opponent?.pseudo}…</span>
        </div>
        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
          {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#a855f7", animation:`pulse 1s ${i*0.3}s infinite` }}/>)}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const p1Choice_local = myChoice
    const p2Choice_local = localP2Choice
    const localResult = modeSelected==="local" ? getWinner(p1Choice_local, p2Choice_local) : null
    const myEm = modeSelected==="local" ? (CHOICES.find(c=>c.id===p1Choice_local)?.emoji||"❓") : (CHOICES.find(c=>c.id===myChoice)?.emoji||"❓")
    const oppEm = modeSelected==="local" ? (CHOICES.find(c=>c.id===p2Choice_local)?.emoji||"❓") : (CHOICES.find(c=>c.id===opponentChoice)?.emoji||"❓")
    const oppName = modeSelected==="local" ? (members.find((m:any)=>m.user_id===targetUserId)?.pseudo||"J2") : (opponent?.pseudo || "Adversaire")
    const displayResult = result
    return (
      <div style={BG}>
        <div style={{ textAlign:"center", marginBottom:24, width:"100%", maxWidth:340 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:3, color:displayResult==="win"?"#4ade80":displayResult==="draw"?"#fbbf24":"#f87171", marginBottom:8 }}>
            {modeSelected==="local"?(result==="win_p1"?`🏆 ${me?.pseudo} GAGNE !`:result==="win_p2"?`🏆 ${oppName} GAGNE !`:"🤝 ÉGALITÉ !"):(displayResult==="win"?"🏆 VICTOIRE !":displayResult==="draw"?"🤝 ÉGALITÉ !":"💀 DÉFAITE !")}
          </div>
          {/* Choices reveal */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:isChallenger?"#ef4444":"#3b82f6", fontWeight:700, marginBottom:8 }}>{me?.pseudo}</div>
              <div style={{ fontSize:64, animation:"popIn 0.4s ease-out" }}>{myEm}</div>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#4b5563" }}>VS</div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:isChallenger?"#3b82f6":"#ef4444", fontWeight:700, marginBottom:8 }}>{oppName}</div>
              <div style={{ fontSize:64, animation:"popIn 0.4s 0.1s ease-out both" }}>{oppEm}</div>
            </div>
          </div>
          {/* Delta */}
          <div style={{ background:displayResult==="win"?"#052e16":displayResult==="draw"?"#1a1030":"#1c0505", border:`1px solid ${displayResult==="win"?"#166534":displayResult==="draw"?"#3b1f6a":"#7f1d1d"}`, borderRadius:14, padding:"12px 20px", marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:result==="win"?"#4ade80":result==="draw"?"#c084fc":"#f87171" }}>
              {result==="draw"?"+2m chacun 🤝":result==="win"||result==="win_p1"||result==="win_p2"?"+8m / −3m 🏁":"−3m + bois un shot 🥃"}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:340 }}>
          <button onClick={() => {
            setPhase("invite")
            setMyChoice(null)
            setOpponentChoice(null)
            setResult(null)
            setTargetUserId("")
            setInviteId("")
            setModeSelected(null)
            setLocalTieCount(0)
          }}
            style={{ flex:1, padding:"14px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"#13131f", color:"#9ca3af", fontSize:14, fontWeight:700 }}>
            🔄 Rejouer
          </button>
          <button onClick={applyAndClose}
            style={{ flex:1, padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>
            ✅ Appliquer
          </button>
        </div>
        <style>{`@keyframes popIn{0%{transform:scale(0.3);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    )
  }

  return null
}
