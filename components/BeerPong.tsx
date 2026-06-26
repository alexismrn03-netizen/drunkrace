"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { stopAmbiance, startAmbiance, isAmbiancePlaying } from "@/lib/ambiance"
import { getSavedVolume, getSavedMuted } from "@/lib/theme"

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

// ── SON PLOUF ──────────────────────────────────────────────────────────────
function playPlouf() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    const dur = 0.35

    // Bruit blanc filtré (splash eau)
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 18)
      data[i] = (Math.random() * 2 - 1) * env
    }
    const src = ctx.createBufferSource()
    src.buffer = buf

    // Filtre passe-bas pour effet "eau"
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.setValueAtTime(800, ctx.currentTime)
    lpf.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur)

    // Tonalité basse (le "plouf")
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15)
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.5, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.7

    src.connect(lpf)
    lpf.connect(masterGain)
    osc.connect(oscGain)
    oscGain.connect(masterGain)
    masterGain.connect(ctx.destination)

    src.start()
    src.stop(ctx.currentTime + dur)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)

    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

function playMiss() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.2)
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

// ── TYPES ──────────────────────────────────────────────────────────────────
type GamePhase = "menu" | "create" | "join" | "lobby" | "playing" | "finished"
type TurnPhase = "aim" | "throwing" | "result" | "waiting"

const TOTAL_CUPS = 6 // 3-2-1

function generateCode() { return Math.floor(1000 + Math.random() * 9000).toString() }

// ── COMPOSANT VERRE ───────────────────────────────────────────────────────
function Glass({ full, size = "sm", splashing = false }: { full: boolean; size?: "sm"|"lg"; splashing?: boolean }) {
  const w = size === "lg" ? 42 : 28
  const h = size === "lg" ? 52 : 32

  const color = splashing ? "rgba(96,165,250,0.8)" : full ? "rgba(245,158,11,0.75)" : "transparent"
  const foamColor = splashing ? "rgba(147,197,253,0.9)" : "rgba(254,243,199,0.95)"
  const borderColor = splashing
    ? "rgba(96,165,250,0.9)"
    : full
    ? "rgba(255,255,255,0.3)"
    : "rgba(255,255,255,0.1)"

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ filter: splashing ? `drop-shadow(0 0 8px #60a5fa)` : full ? `drop-shadow(0 0 3px rgba(245,158,11,0.3))` : "none" }}>
      {/* Corps trapézoïdal */}
      <defs>
        <clipPath id={`clip-${w}-${h}`}>
          <polygon points={`${w*0.08},0 ${w*0.92},0 ${w},${h} 0,${h}`} />
        </clipPath>
      </defs>
      {/* Fond */}
      {(full || splashing) && (
        <polygon
          points={`${w*0.08},0 ${w*0.92},0 ${w},${h} 0,${h}`}
          fill={color}
        />
      )}
      {/* Mousse */}
      {(full || splashing) && (
        <ellipse cx={w/2} cy={h*0.08} rx={w*0.38} ry={h*0.1} fill={foamColor} />
      )}
      {/* Paroi */}
      <polygon
        points={`${w*0.08},0 ${w*0.92},0 ${w},${h} 0,${h}`}
        fill="none"
        stroke={borderColor}
        strokeWidth="1.5"
      />
      {/* Reflet */}
      {(full || splashing) && (
        <line x1={w*0.2} y1={h*0.15} x2={w*0.22} y2={h*0.7}
          stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

// ── COMPOSANT BALLE ────────────────────────────────────────────────────────
function Ball({ x, y, size = 18 }: { x: number; y: number; size?: number }) {
  return (
    <div style={{
      position: "absolute",
      left: x - size/2,
      top: y - size/2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #f1f5f9 35%, #94a3b8 100%)",
      boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.15)",
      pointerEvents: "none",
      zIndex: 20,
    }}>
      <div style={{ position:"absolute", top:"18%", left:"18%", width:"28%", height:"22%", borderRadius:"50%", background:"rgba(255,255,255,0.7)", filter:"blur(1px)" }}/>
    </div>
  )
}

// ── VUE JEU ────────────────────────────────────────────────────────────────
function GameView({
  myCups, enemyCups, isMyTurn, enemyName, myName,
  onShot, splashingCup, missAnim,
}: {
  myCups: boolean[]; enemyCups: boolean[]
  isMyTurn: boolean; enemyName: string; myName: string
  onShot: (direction: number, power: number) => void
  splashingCup: number | null; missAnim: boolean
}) {
  const [gaugePos, setGaugePos] = useState(50) // 0-100
  const [gaugeDir, setGaugeDir] = useState(1)
  const [turnPhase, setTurnPhase] = useState<TurnPhase>(isMyTurn ? "aim" : "waiting")
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 })
  const [ballVisible, setBallVisible] = useState(false)
  const [throwing, setThrowing] = useState(false)
  const frameRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)
  const swipeStartY = useRef<number | null>(null)
  const lockedGauge = useRef<number>(50)

  // Reset turn phase when isMyTurn changes
  useEffect(() => {
    setTurnPhase(isMyTurn ? "aim" : "waiting")
    setThrowing(false)
    setBallVisible(false)
  }, [isMyTurn])

  // Gauge animation
  useEffect(() => {
    if (turnPhase !== "aim") return
    let pos = gaugePos
    let dir = gaugeDir
    const loop = () => {
      pos += dir * 1.8
      if (pos >= 100) { pos = 100; dir = -1 }
      if (pos <= 0)   { pos = 0;   dir = 1 }
      setGaugePos(pos)
      setGaugeDir(dir)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [turnPhase])

  const getContainerRect = () => containerRef.current?.getBoundingClientRect()

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMyTurn || turnPhase !== "aim") return
    swipeStartY.current = e.touches[0].clientY
    // Bloquer la jauge
    lockedGauge.current = gaugePos
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    setTurnPhase("throwing")
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMyTurn || turnPhase !== "throwing" || swipeStartY.current === null) return
    const endY = e.changedTouches[0].clientY
    const swipeDist = swipeStartY.current - endY
    if (swipeDist < 20) {
      // Pas assez de swipe → reset
      setTurnPhase("aim")
      swipeStartY.current = null
      return
    }
    const power = Math.min(Math.max(swipeDist / 150, 0.3), 1)
    launchBall(lockedGauge.current, power)
    swipeStartY.current = null
  }

  const launchBall = (direction: number, power: number) => {
    setThrowing(true)
    const rect = getContainerRect()
    if (!rect) return

    const startX = rect.width / 2
    const startY = rect.height * 0.78
    setBallPos({ x: startX, y: startY })
    setBallVisible(true)

    // Cible (coupe adversaire active aléatoire)
    const activeCups = enemyCups.map((full, i) => full ? i : -1).filter(i => i >= 0)
    const targetCupIdx = activeCups[Math.floor(Math.random() * activeCups.length)]

    // Position cible en vue 1ère personne
    const targetX = rect.width / 2 + (direction - 50) * 0.8
    const targetY = rect.height * 0.18

    let t = 0
    const totalFrames = 30
    const animate = () => {
      t++
      const progress = t / totalFrames
      // Arc parabolique
      const x = startX + (targetX - startX) * progress
      const arc = Math.sin(progress * Math.PI) * rect.height * 0.25
      const y = startY + (targetY - startY) * progress - arc
      const size = 18 - progress * 8

      setBallPos({ x, y })

      if (t < totalFrames) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setBallVisible(false)
        onShot(direction, power)
        setThrowing(false)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
  }

  // Disposition coupes: triangle 3-2-1
  const enemyRows = [[0,1,2],[3,4],[5]]
  const myRows    = [[5],[3,4],[0,1,2]]

  const containerW = 320
  const containerH = 580

  return (
    <div
      ref={containerRef}
      style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden",
        background:"linear-gradient(180deg,#0a0510 0%,#0d0718 35%,#120a20 60%,#1a0e2a 100%)",
        userSelect:"none", touchAction:"none" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambiance lumière */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% -10%,#f59e0b10 0%,transparent 50%)", pointerEvents:"none" }}/>

      {/* Table */}
      <div style={{ position:"absolute", bottom:0, left:"-30%", right:"-30%", height:"60%",
        background:"linear-gradient(175deg,#3d2200 0%,#2a1800 30%,#1e1000 70%,#140c00 100%)",
        borderTop:"2px solid rgba(245,158,11,0.2)",
        borderRadius:"50% 50% 0 0 / 15px 15px 0 0",
        boxShadow:"0 -8px 60px rgba(245,158,11,0.05), inset 0 2px 40px rgba(0,0,0,0.5)" }} />

      {/* Ligne centre table */}
      <div style={{ position:"absolute", bottom:0, left:"50%", width:1, height:"55%",
        background:"linear-gradient(to bottom,rgba(245,158,11,0.15),transparent)", transform:"translateX(-50%)", pointerEvents:"none" }}/>

      {/* HUD */}
      <div style={{ position:"absolute", top:0, left:0, right:0, padding:"14px 14px 10px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"linear-gradient(to bottom,rgba(5,5,8,0.95) 70%,transparent)", zIndex:10 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:3,
          background:"linear-gradient(135deg,#fbbf24,#f97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          🍺 PONG
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ background:"rgba(13,13,20,0.9)", border:"1px solid #1e1e2e", borderRadius:10, padding:"4px 10px", textAlign:"center" as const }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#ef4444" }}>
              {enemyCups.filter(Boolean).length}
            </div>
            <div style={{ fontSize:7, color:"#4b5563", fontWeight:700, letterSpacing:1 }}>EUX</div>
          </div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:12, color:"#374151" }}>VS</div>
          <div style={{ background:"rgba(13,13,20,0.9)", border:"1px solid #1e1e2e", borderRadius:10, padding:"4px 10px", textAlign:"center" as const }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#4ade80" }}>
              {myCups.filter(Boolean).length}
            </div>
            <div style={{ fontSize:7, color:"#4b5563", fontWeight:700, letterSpacing:1 }}>TOI</div>
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{ position:"absolute", top:52, left:"50%", transform:"translateX(-50%)",
        background: isMyTurn ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.1)",
        border: `1px solid ${isMyTurn ? "#f59e0b44" : "#ef444433"}`,
        borderRadius:8, padding:"3px 12px",
        fontFamily:"'Bebas Neue',cursive", fontSize:10, letterSpacing:2,
        color: isMyTurn ? "#fbbf24aa" : "#f8717177",
        whiteSpace:"nowrap" as const, zIndex:10 }}>
        {isMyTurn ? "🎯 TON TOUR — SWIPE VERS LE HAUT" : `⏳ TOUR DE ${enemyName.toUpperCase()}...`}
      </div>

      {/* Label adversaire */}
      <div style={{ position:"absolute", top:"10%", left:"50%", transform:"translateX(-50%)",
        fontFamily:"'Bebas Neue',cursive", fontSize:8, letterSpacing:2, color:"#374151", zIndex:5 }}>
        {enemyName.toUpperCase()}
      </div>

      {/* COUPES ADVERSAIRE */}
      {enemyRows.map((row, ri) => {
        const rowW = row.length * 34
        return (
          <div key={ri} style={{ position:"absolute", top:`${14 + ri*6.5}%`, left:"50%",
            transform:"translateX(-50%)", display:"flex", gap:6, zIndex:5 }}>
            {row.map(ci => (
              <div key={ci} style={{ position:"relative" }}>
                <Glass
                  full={enemyCups[ci]}
                  size="sm"
                  splashing={splashingCup === ci}
                />
              </div>
            ))}
          </div>
        )
      })}

      {/* BALLE */}
      {ballVisible && <Ball x={ballPos.x} y={ballPos.y} size={12} />}

      {/* MISS animation */}
      {missAnim && (
        <div style={{ position:"absolute", top:"35%", left:"50%", transform:"translateX(-50%)",
          fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#f87171", letterSpacing:3,
          animation:"fadeOut 1s forwards", zIndex:30 }}>
          RATÉ !
        </div>
      )}

      {/* Label joueur */}
      <div style={{ position:"absolute", bottom:"19%", left:"50%", transform:"translateX(-50%)",
        fontFamily:"'Bebas Neue',cursive", fontSize:8, letterSpacing:2, color:"#374151", zIndex:5 }}>
        {myName.toUpperCase()}
      </div>

      {/* COUPES JOUEUR */}
      {myRows.map((row, ri) => (
        <div key={ri} style={{ position:"absolute", bottom:`${20 + ri*8}%`, left:"50%",
          transform:"translateX(-50%)", display:"flex", gap:8, zIndex:5 }}>
          {row.map(ci => (
            <div key={ci}>
              <Glass full={myCups[ci]} size="lg" />
            </div>
          ))}
        </div>
      ))}

      {/* JAUGE DIRECTION */}
      {isMyTurn && turnPhase === "aim" && (
        <div style={{ position:"absolute", left:16, right:16, bottom:130 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:9, letterSpacing:2, color:"#4b5563", marginBottom:4 }}>
            ← DIRECTION →
          </div>
          <div style={{ height:6, background:"#13131f", borderRadius:3, border:"1px solid #1e1e2e", position:"relative", overflow:"hidden" }}>
            {/* Zones colorées */}
            <div style={{ position:"absolute", inset:0, display:"flex" }}>
              <div style={{ flex:2, background:"rgba(239,68,68,0.25)" }}/>
              <div style={{ flex:2, background:"rgba(251,191,36,0.2)" }}/>
              <div style={{ flex:1, background:"rgba(74,222,128,0.3)" }}/>
              <div style={{ flex:2, background:"rgba(251,191,36,0.2)" }}/>
              <div style={{ flex:2, background:"rgba(239,68,68,0.25)" }}/>
            </div>
            {/* Curseur */}
            <div style={{ position:"absolute", top:-2, left:`${gaugePos}%`, transform:"translateX(-50%)",
              width:10, height:10, borderRadius:"50%", background:"white",
              boxShadow:"0 0 8px rgba(255,255,255,0.9)", transition:"left 0.01s linear" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
            {["RATÉ","OK","🎯","OK","RATÉ"].map((l,i) => (
              <span key={i} style={{ fontFamily:"'Bebas Neue',cursive", fontSize:8, letterSpacing:1,
                color:l==="RATÉ"?"rgba(239,68,68,0.5)":l==="🎯"?"rgba(74,222,128,0.8)":"rgba(251,191,36,0.5)" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ZONE SWIPE */}
      {isMyTurn && (
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:120,
          display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"flex-end",
          padding:"0 0 14px",
          background:"linear-gradient(to top,rgba(10,10,20,0.95),transparent)" }}>
          {turnPhase === "aim" && (
            <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4,
              animation:"hint-pulse 2s ease-in-out infinite" }}>
              <div style={{ fontSize:18, color:"rgba(251,191,36,0.8)", animation:"bounce-up 1s ease-in-out infinite" }}>↑</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:10, letterSpacing:2, color:"rgba(251,191,36,0.5)" }}>
                SWIPE POUR TIRER
              </div>
            </div>
          )}
          {turnPhase === "throwing" && (
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color:"#fbbf24", letterSpacing:2 }}>
              LÂCHE !
            </div>
          )}
        </div>
      )}

      {/* En attente */}
      {!isMyTurn && (
        <div style={{ position:"absolute", bottom:20, left:20, right:20 }}>
          <div style={{ background:"rgba(13,13,20,0.92)", border:"1px solid #1e1e2e", borderRadius:14,
            padding:"14px 20px", textAlign:"center" as const }}>
            <div style={{ fontSize:22, marginBottom:6 }}>⏳</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2, color:"#9ca3af" }}>
              EN ATTENTE DE {enemyName.toUpperCase()}...
            </div>
            <div style={{ fontSize:11, color:"#4b5563", marginTop:4 }}>Regarde si il/elle vise bien 👀</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hint-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes bounce-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeOut { 0%{opacity:1;transform:translateX(-50%) scale(1)} 100%{opacity:0;transform:translateX(-50%) scale(1.5)} }
      `}</style>
    </div>
  )
}

// ── COMPOSANT PRINCIPAL ────────────────────────────────────────────────────
export default function BeerPong({ members, myUserId, groupId, onAwardDistance, onClose }: Props) {
  const supabase = createClient()

  const [phase, setPhase] = useState<GamePhase>("menu")
  const [isHost, setIsHost] = useState(false)
  const [sessionCode, setSessionCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [opponentId, setOpponentId] = useState("")
  const [myCups, setMyCups] = useState<boolean[]>(Array(TOTAL_CUPS).fill(true))
  const [enemyCups, setEnemyCups] = useState<boolean[]>(Array(TOTAL_CUPS).fill(true))
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [splashingCup, setSplashingCup] = useState<number | null>(null)
  const [missAnim, setMissAnim] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([])
  const [resultMsg, setResultMsg] = useState("")

  const wasPlaying = useRef(false)
  const channelRef = useRef<any>(null)

  const me = members.find(m => m.user_id === myUserId)
  const opponent = members.find(m => m.user_id === opponentId)

  // Stop ambiance
  useEffect(() => {
    wasPlaying.current = isAmbiancePlaying()
    if (wasPlaying.current) stopAmbiance()
    return () => {
      if (wasPlaying.current) {
        const vol = getSavedVolume(); const muted = getSavedMuted()
        if (!muted) startAmbiance(vol)
      }
    }
  }, [])

  // ── CRÉER SESSION ──
  const createSession = async () => {
    const code = generateCode()
    const { data, error } = await supabase.from("beerpong_sessions").insert({
      code, group_id: groupId,
      host_id: myUserId, guest_id: null,
      host_cups: Array(TOTAL_CUPS).fill(true),
      guest_cups: Array(TOTAL_CUPS).fill(true),
      current_turn: myUserId,
      status: "waiting",
      last_shot: null,
    }).select().single()
    if (error || !data) return
    setSessionCode(code)
    setSessionId(data.id)
    setIsHost(true)
    setIsMyTurn(true)
    setLobbyPlayers([myUserId])
    setPhase("lobby")
    subscribeToSession(data.id, true)
  }

  // ── REJOINDRE SESSION ──
  const joinSession = async () => {
    setJoinError("")
    const { data, error } = await supabase.from("beerpong_sessions")
      .select("*").eq("code", joinCode.trim()).eq("group_id", groupId).eq("status", "waiting").single()
    if (error || !data) { setJoinError("Code invalide ou partie déjà commencée"); return }

    const { error: err2 } = await supabase.from("beerpong_sessions")
      .update({ guest_id: myUserId, status: "playing" }).eq("id", data.id)
    if (err2) return

    setSessionId(data.id)
    setOpponentId(data.host_id)
    setIsHost(false)
    setIsMyTurn(false) // Host commence
    setMyCups(Array(TOTAL_CUPS).fill(true))
    setEnemyCups(Array(TOTAL_CUPS).fill(true))
    setPhase("playing")
    subscribeToSession(data.id, false)
  }

  // ── REALTIME ──
  const subscribeToSession = (sid: string, host: boolean) => {
    channelRef.current = supabase.channel(`beerpong:${sid}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"beerpong_sessions", filter:`id=eq.${sid}` },
        (payload) => handleUpdate(payload.new as any, host))
      .subscribe()
  }

  const handleUpdate = (data: any, host: boolean) => {
    if (!data) return

    // Guest rejoint → host peut commencer
    if (data.status === "playing" && data.guest_id && phase === "lobby") {
      setOpponentId(host ? data.guest_id : data.host_id)
      setMyCups(Array(TOTAL_CUPS).fill(true))
      setEnemyCups(Array(TOTAL_CUPS).fill(true))
      setPhase("playing")
    }

    if (data.status === "playing" || data.status === "gameover") {
      // Mes coupes = host_cups si je suis host, guest_cups sinon
      const mine = host ? data.host_cups : data.guest_cups
      const enemy = host ? data.guest_cups : data.host_cups
      setMyCups(mine)
      setEnemyCups(enemy)
      setIsMyTurn(data.current_turn === myUserId)

      // Traiter le dernier tir
      if (data.last_shot) {
        const shot = data.last_shot
        if (shot.shooter !== myUserId) {
          // L'adversaire a tiré sur moi
          if (shot.hit) {
            setSplashingCup(shot.cup_index)
            playPlouf()
            setTimeout(() => setSplashingCup(null), 800)
          } else {
            setMissAnim(true)
            setTimeout(() => setMissAnim(false), 1000)
          }
        }
      }
    }

    if (data.status === "gameover") {
      const iWon = data.winner_id === myUserId
      setResultMsg(iWon ? "🏆 T'AS GAGNÉ !" : "😢 T'AS PERDU...")
      setPhase("finished")
      if (!iWon && data.winner_id) {
        // Le perdant boit ses coupes restantes
        const mine = host ? data.host_cups : data.guest_cups
        const sipsLeft = mine.filter(Boolean).length
        onAwardDistance(myUserId, -(sipsLeft * 10))
      }
    }
  }

  // ── TIRER ──
  const handleShot = async (direction: number, power: number) => {
    const { data } = await supabase.from("beerpong_sessions").select("*").eq("id", sessionId).single()
    if (!data) return

    const enemyCupsNow = isHost ? data.guest_cups : data.host_cups
    const activeCups = enemyCupsNow.map((full: boolean, i: number) => full ? i : -1).filter((i: number) => i >= 0)
    if (!activeCups.length) return

    // Calcul hit basé sur la direction (centre = 50) et un peu d'aléatoire
    const accuracy = 1 - Math.abs(direction - 50) / 50 // 0-1
    const hitChance = accuracy * 0.7 + Math.random() * 0.3
    const hit = hitChance > 0.45

    let newEnemyCups = [...enemyCupsNow]
    let hitCupIdx = -1
    if (hit) {
      hitCupIdx = activeCups[Math.floor(Math.random() * activeCups.length)]
      newEnemyCups[hitCupIdx] = false
      setSplashingCup(hitCupIdx)
      playPlouf()
      setTimeout(() => setSplashingCup(null), 800)
    } else {
      playMiss()
      setMissAnim(true)
      setTimeout(() => setMissAnim(false), 1000)
    }

    const hostCups = isHost ? data.host_cups : newEnemyCups
    const guestCups = isHost ? newEnemyCups : data.guest_cups
    const gameOver = newEnemyCups.every(c => !c)
    const nextTurn = hit ? myUserId : (isHost ? data.guest_id : data.host_id)

    await supabase.from("beerpong_sessions").update({
      host_cups: hostCups,
      guest_cups: guestCups,
      current_turn: gameOver ? null : nextTurn,
      status: gameOver ? "gameover" : "playing",
      winner_id: gameOver ? myUserId : null,
      last_shot: { shooter: myUserId, hit, cup_index: hitCupIdx },
    }).eq("id", sessionId)

    if (gameOver) {
      setResultMsg("🏆 T'AS GAGNÉ !")
      setPhase("finished")
    }
  }

  const BG: any = { position:"fixed", inset:0, background:"var(--bg)", zIndex:400,
    display:"flex", flexDirection:"column" as const, alignItems:"center", overflowY:"auto", padding:"28px 20px 40px" }
  const W = { width:"100%", maxWidth:360 }
  const me_pseudo = me?.pseudo || "Moi"
  const opp_pseudo = opponent?.pseudo || "Adversaire"

  // ── MENU ──
  if (phase === "menu") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3,
            background:"linear-gradient(135deg,#fbbf24,#f97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            🍺 BEER PONG
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column" as const, gap:12 }}>
          <button onClick={createSession}
            style={{ padding:"20px", borderRadius:16, border:"2px solid var(--border)", cursor:"pointer",
              background:"linear-gradient(135deg,#1a0a00,#0d0600)", display:"flex", flexDirection:"column" as const,
              alignItems:"flex-start", gap:6 }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, color:"#fbbf24" }}>🎯 CRÉER UNE PARTIE</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Génère un code et invite un ami</div>
          </button>

          <button onClick={() => setPhase("join")}
            style={{ padding:"20px", borderRadius:16, border:"2px solid var(--border)", cursor:"pointer",
              background:"var(--bg-card)", display:"flex", flexDirection:"column" as const,
              alignItems:"flex-start", gap:6 }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, color:"#e2e8f0" }}>🔢 REJOINDRE UNE PARTIE</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Entre le code à 4 chiffres</div>
          </button>
        </div>

        <div style={{ marginTop:16, padding:14, borderRadius:12, background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:12, color:"#4b5563", lineHeight:1.8 }}>
          🍺 Coule toutes les coupes de l'adversaire pour gagner<br/>
          🎯 La jauge contrôle la direction<br/>
          ↑ Swipe vers le haut pour lancer<br/>
          🏆 Le perdant boit ses coupes restantes
        </div>
      </div>
    </div>
  )

  // ── JOIN ──
  if (phase === "join") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <button onClick={() => setPhase("menu")} style={{ background:"none", border:"none", color:"#6b7280", fontSize:20, cursor:"pointer" }}>← Retour</button>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:3, color:"#fbbf24", marginBottom:20 }}>🔢 CODE DE LA PARTIE</div>

        <input type="number" placeholder="1234" value={joinCode}
          onChange={e => setJoinCode(e.target.value.slice(0,4))}
          style={{ width:"100%", padding:"20px", borderRadius:16, border:`2px solid ${joinError?"#7f1d1d":"var(--border)"}`,
            background:"var(--bg-card)", color:"#e2e8f0", fontSize:36, textAlign:"center" as const,
            fontFamily:"'Bebas Neue',cursive", letterSpacing:12, marginBottom:12 }}
        />
        {joinError && <div style={{ color:"#f87171", fontSize:12, marginBottom:12, textAlign:"center" as const }}>{joinError}</div>}

        <button onClick={joinSession} disabled={joinCode.length !== 4}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none",
            cursor:joinCode.length===4?"pointer":"not-allowed",
            background:joinCode.length===4?"linear-gradient(135deg,#fbbf24,#f97316)":"#2a2a3e",
            color:joinCode.length===4?"#0a0a14":"#4b5563", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
          REJOINDRE →
        </button>
      </div>
    </div>
  )

  // ── LOBBY ──
  if (phase === "lobby") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3,
            background:"linear-gradient(135deg,#fbbf24,#f97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            🍺 BEER PONG
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ background:"var(--bg-card)", borderRadius:16, border:"1px solid var(--border)", padding:20, marginBottom:16, textAlign:"center" as const }}>
          <div style={{ fontSize:11, color:"#4b5563", fontWeight:700, letterSpacing:2, marginBottom:8 }}>CODE DE LA PARTIE</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:52, color:"#fbbf24", letterSpacing:12 }}>{sessionCode}</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>Dis ce code à ton adversaire</div>
        </div>

        <div style={{ background:"var(--bg-card)", borderRadius:14, border:"1px solid var(--border)", padding:14, marginBottom:16 }}>
          <div style={{ fontSize:10, color:"#4b5563", fontWeight:700, letterSpacing:1, marginBottom:10 }}>EN ATTENTE D'UN ADVERSAIRE...</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80" }}/>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{me_pseudo}</span>
            <span style={{ fontSize:10, color:"#fbbf24", fontWeight:700 }}>HOST</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, opacity:0.4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#374151", animation:"pulse 1s infinite" }}/>
            <span style={{ fontSize:13, color:"#6b7280" }}>En attente...</span>
          </div>
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    </div>
  )

  // ── PLAYING ──
  if (phase === "playing") return (
    <div style={{ position:"fixed", inset:0, zIndex:400 }}>
      <GameView
        myCups={myCups}
        enemyCups={enemyCups}
        isMyTurn={isMyTurn}
        enemyName={opp_pseudo}
        myName={me_pseudo}
        onShot={handleShot}
        splashingCup={splashingCup}
        missAnim={missAnim}
      />
    </div>
  )

  // ── FINISHED ──
  if (phase === "finished") return (
    <div style={BG}>
      <div style={W}>
        <div style={{ textAlign:"center" as const, padding:"24px 20px", borderRadius:18,
          background: resultMsg.includes("GAGNÉ") ? "#052e16" : "#1c0505",
          border: `1px solid ${resultMsg.includes("GAGNÉ") ? "#166534" : "#7f1d1d"}`,
          marginBottom:16 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{resultMsg.includes("GAGNÉ") ? "🏆" : "😢"}</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:3,
            color: resultMsg.includes("GAGNÉ") ? "#4ade80" : "#f87171" }}>
            {resultMsg}
          </div>
          {!resultMsg.includes("GAGNÉ") && (
            <div style={{ fontSize:13, color:"#fca5a5", marginTop:8 }}>
              Bois tes coupes restantes 🍺
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => { setPhase("menu"); setMyCups(Array(TOTAL_CUPS).fill(true)); setEnemyCups(Array(TOTAL_CUPS).fill(true)); setOpponentId(""); setSessionId(""); setSessionCode(""); }}
            style={{ flex:1, padding:"14px", borderRadius:14, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg,#fbbf24,#f97316)", color:"#0a0a14",
              fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
            🔄 REJOUER
          </button>
          <button onClick={onClose}
            style={{ flex:1, padding:"14px", borderRadius:14, border:"1px solid var(--border)", cursor:"pointer",
              background:"transparent", color:"#6b7280", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
            FERMER
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
