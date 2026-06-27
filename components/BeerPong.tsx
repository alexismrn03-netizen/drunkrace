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

// ── SONS ──────────────────────────────────────────────────────────────────
function playPlouf() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/ctx.sampleRate*18)
    const src = ctx.createBufferSource(); src.buffer = buf
    const lpf = ctx.createBiquadFilter(); lpf.type='lowpass'
    lpf.frequency.setValueAtTime(900, ctx.currentTime)
    lpf.frequency.exponentialRampToValueAtTime(200, ctx.currentTime+0.35)
    const osc = ctx.createOscillator(); osc.type='sine'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime+0.18)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.6, ctx.currentTime)
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.2)
    const mg = ctx.createGain(); mg.gain.value = 0.75
    src.connect(lpf); lpf.connect(mg); osc.connect(og); og.connect(mg); mg.connect(ctx.destination)
    src.start(); src.stop(ctx.currentTime+0.4)
    osc.start(); osc.stop(ctx.currentTime+0.22)
    setTimeout(()=>ctx.close(), 1000)
  } catch {}
}

function playBounce() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator(); osc.type='sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime+0.1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.12)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime+0.12)
    setTimeout(()=>ctx.close(), 500)
  } catch {}
}

// ── CONSTANTES ─────────────────────────────────────────────────────────────
const TOTAL_CUPS = 6
function generateCode() { return Math.floor(1000+Math.random()*9000).toString() }

// Positions des coupes (coordonnées normalisées 0-1)
// Triangle adversaire (vue de face, en haut)
const ENEMY_CUP_POSITIONS = [
  // Rangée 3 (arrière)
  {x:0.35,y:0.15}, {x:0.50,y:0.15}, {x:0.65,y:0.15},
  // Rangée 2
  {x:0.425,y:0.22}, {x:0.575,y:0.22},
  // Rangée 1 (devant)
  {x:0.50,y:0.29},
]

// Triangle joueur (bas, proche)
const MY_CUP_POSITIONS = [
  // Rangée 1 (loin)
  {x:0.50,y:0.62},
  // Rangée 2
  {x:0.425,y:0.70}, {x:0.575,y:0.70},
  // Rangée 3 (proche)
  {x:0.35,y:0.79}, {x:0.50,y:0.79}, {x:0.65,y:0.79},
]

// ── COMPOSANTS VISUELS ────────────────────────────────────────────────────

// Verre SVG 3D
function Cup({ full, size, splashing }: { full: boolean; size: 'sm'|'lg'; splashing?: boolean }) {
  const W = size==='lg' ? 54 : 32
  const H = size==='lg' ? 72 : 44
  const vw = 72, vh = 96 // viewBox fixe
  const ptop = 10, pbot = 62 // polygon top/bottom width ratio %
  
  const beerColor = splashing ? 'rgba(96,165,250,0.88)' : 'rgba(245,158,11,0.88)'
  const foamColor = splashing ? 'rgba(147,197,253,0.9)' : '#fffbeb'
  const borderColor = splashing ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.32)'
  const glowColor = splashing ? '#3b82f6' : undefined

  return (
    <svg width={W} height={H} viewBox={`0 0 ${vw} ${vh}`}
      style={{ overflow:'visible', filter: splashing ? 'drop-shadow(0 0 10px #60a5fa88)' : full ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
      <defs>
        <linearGradient id={`beer-${W}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={splashing?'#60a5fa':'#fbbf24'} stopOpacity="0.95"/>
          <stop offset="60%" stopColor={splashing?'#3b82f6':'#f59e0b'} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={splashing?'#1d4ed8':'#78350f'} stopOpacity="0.98"/>
        </linearGradient>
        <clipPath id={`clip-${W}`}><polygon points={`${ptop},0 ${vw-ptop},0 ${vw},${vh} 0,${vh}`}/></clipPath>
      </defs>

      {/* Fond sombre */}
      <polygon points={`${ptop},0 ${vw-ptop},0 ${vw},${vh} 0,${vh}`}
        fill="rgba(0,0,0,0.3)" clipPath={`url(#clip-${W})`}/>

      {/* Bière / eau */}
      {(full||splashing) && (
        <polygon points={`${ptop+2},${vh*0.18} ${vw-ptop-2},${vh*0.18} ${vw},${vh} 0,${vh}`}
          fill={`url(#beer-${W})`} clipPath={`url(#clip-${W})`}/>
      )}

      {/* Bulles (bière seulement) */}
      {full && !splashing && (
        <>
          <circle cx={vw*0.35} cy={vh*0.55} r={1.5} fill="rgba(255,220,80,0.5)"/>
          <circle cx={vw*0.55} cy={vh*0.42} r={1} fill="rgba(255,220,80,0.4)"/>
          <circle cx={vw*0.45} cy={vh*0.7} r={1.5} fill="rgba(255,220,80,0.45)"/>
        </>
      )}

      {/* Éclaboussures */}
      {splashing && (
        <>
          <line x1={vw*0.3} y1={vh*0.12} x2={vw*0.25} y2={0} stroke="rgba(96,165,250,0.7)" strokeWidth="2" strokeLinecap="round"/>
          <line x1={vw*0.5} y1={vh*0.1}  x2={vw*0.5}  y2={-8} stroke="rgba(96,165,250,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1={vw*0.7} y1={vh*0.12} x2={vw*0.76} y2={0}  stroke="rgba(96,165,250,0.7)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx={vw*0.25} cy={-2} r={3} fill="rgba(147,197,253,0.9)"/>
          <circle cx={vw*0.5}  cy={-10} r={3.5} fill="rgba(147,197,253,0.9)"/>
          <circle cx={vw*0.76} cy={-2} r={3} fill="rgba(147,197,253,0.9)"/>
        </>
      )}

      {/* Mousse / surface */}
      {(full||splashing) && (
        <>
          <ellipse cx={vw/2} cy={vh*0.18} rx={vw*0.36} ry={vh*0.09} fill={foamColor}/>
          {!splashing && <>
            <ellipse cx={vw*0.37} cy={vh*0.15} rx={vw*0.1} ry={vh*0.045} fill="rgba(255,255,255,0.7)"/>
            <ellipse cx={vw*0.63} cy={vh*0.15} rx={vw*0.08} ry={vh*0.04} fill="rgba(255,255,255,0.55)"/>
          </>}
        </>
      )}

      {/* Paroi */}
      <polygon points={`${ptop},0 ${vw-ptop},0 ${vw},${vh} 0,${vh}`}
        fill="rgba(255,255,255,0.04)" stroke={borderColor} strokeWidth={size==='lg'?2:1.5}
        clipPath={`url(#clip-${W})`}/>

      {/* Reflet gauche */}
      <polygon points={`${ptop+2},2 ${ptop+10},2 ${ptop+14},${vh} ${ptop+4},${vh}`}
        fill="rgba(255,255,255,0.1)" clipPath={`url(#clip-${W})`}/>

      {/* Ellipse vue dessus */}
      <ellipse cx={vw/2} cy={0} rx={vw/2-ptop} ry={vh*0.07}
        fill="rgba(255,255,255,0.07)" stroke={borderColor} strokeWidth="1"/>

      {/* Bord supérieur */}
      <line x1={ptop} y1={0} x2={vw-ptop} y2={0}
        stroke={splashing?'rgba(147,197,253,0.7)':'rgba(255,255,255,0.55)'} strokeWidth={size==='lg'?2.5:1.8}/>

      {/* Cerclage */}
      <polygon points={`${ptop},0 ${vw-ptop},0 ${vw-ptop+2},${vh*0.09} ${ptop-2},${vh*0.09}`}
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
    </svg>
  )
}

// Balle de ping pong SVG
function PingPongBall({ size=22, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ overflow:'visible', filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.6))', ...style }}>
      {/* Corps */}
      <defs>
        <radialGradient id="ball-grad" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="25%" stopColor="#f8fafc"/>
          <stop offset="60%" stopColor="#e2e8f0"/>
          <stop offset="85%" stopColor="#cbd5e1"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#ball-grad)"/>
      {/* Lignes de couture */}
      <path d="M 4 20 Q 10 8 20 6 Q 30 4 36 20" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.2"/>
      <path d="M 4 20 Q 10 32 20 34 Q 30 36 36 20" fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.2"/>
      {/* Reflet principal */}
      <ellipse cx="14" cy="13" rx="7" ry="5" fill="rgba(255,255,255,0.75)" style={{filter:'blur(1px)'}}/>
      {/* Reflet secondaire */}
      <circle cx="27" cy="28" r="3" fill="rgba(255,255,255,0.25)" style={{filter:'blur(1.5px)'}}/>
    </svg>
  )
}

// ── VUE JEU ──────────────────────────────────────────────────────────────
function GameView({
  myCups, enemyCups, isMyTurn, enemyName, myName,
  onShot, splashCup, onClose,
}: {
  myCups: boolean[]
  enemyCups: boolean[]
  isMyTurn: boolean
  enemyName: string
  myName: string
  onShot: (targetCupIdx: number, hit: boolean) => void
  splashCup: number | null
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // État drag
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({x:0,y:0})
  const [dragCurrent, setDragCurrent] = useState({x:0,y:0})
  const [ballPos, setBallPos] = useState<{x:number,y:number}|null>(null)
  const [throwing, setThrowing] = useState(false)
  const [showResult, setShowResult] = useState<'hit'|'miss'|null>(null)

  const animRef = useRef<number>()

  const W = () => containerRef.current?.offsetWidth || 360
  const H = () => containerRef.current?.offsetHeight || 580

  // Position de la balle au repos (main du joueur)
  const restBall = () => ({ x: W()*0.5, y: H()*0.86 })

  const getTouchPos = (e: React.TouchEvent | TouchEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const t = 'touches' in e ? e.touches[0] : (e as any).changedTouches[0]
    return { x: t.clientX - rect.left, y: t.clientY - rect.top }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMyTurn || throwing) return
    const pos = getTouchPos(e)
    // Vérifier que le touch est près de la balle (zone bas de l'écran)
    const rb = restBall()
    const dist = Math.hypot(pos.x - rb.x, pos.y - rb.y)
    if (dist > 80) return
    setDragging(true)
    setDragStart(pos)
    setDragCurrent(pos)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    e.preventDefault()
    setDragCurrent(getTouchPos(e))
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging || throwing) return
    setDragging(false)
    const pos = getTouchPos(e)
    const rb = restBall()
    const dx = pos.x - rb.x
    const dy = pos.y - rb.y
    // Swipe vers le haut seulement
    if (dy > -30) return // pas assez de swipe vers le haut
    launchBall(dx, -dy)
  }

  const launchBall = (dx: number, swipeDist: number) => {
    setThrowing(true)
    const w = W(), h = H()
    
    // Vélocité normalisée
    const maxSwipe = 200
    const power = Math.min(swipeDist / maxSwipe, 1)
    const dirX = dx / w // -0.5 à 0.5

    // Chercher la coupe cible la plus proche de la trajectoire
    let targetCupIdx = -1
    let minDist = Infinity
    const targetX = w * (0.5 + dirX * 0.8) // projection
    const targetY = h * 0.2

    enemyCups.forEach((full, i) => {
      if (!full) return
      const cp = ENEMY_CUP_POSITIONS[i]
      const cx = w * cp.x, cy = h * cp.y
      const dist = Math.hypot(cx - targetX, cy - targetY)
      if (dist < minDist) { minDist = dist; targetCupIdx = i }
    })

    // Précision: si la trajectoire est trop loin d'une coupe → miss
    const HIT_THRESHOLD = w * 0.12 // 12% de la largeur
    const hit = minDist < HIT_THRESHOLD && power > 0.25 && targetCupIdx >= 0

    // Animation physique
    const startX = w * 0.5
    const startY = h * 0.85
    const endX = hit ? w * ENEMY_CUP_POSITIONS[targetCupIdx].x : w * (0.5 + dirX * 1.2)
    const endY = hit ? h * ENEMY_CUP_POSITIONS[targetCupIdx].y : h * 0.1
    const totalFrames = 28
    let frame = 0

    const animate = () => {
      const t = frame / totalFrames
      // Arc parabolique
      const x = startX + (endX - startX) * t
      const arc = Math.sin(t * Math.PI) * h * 0.35
      const y = startY + (endY - startY) * t - arc
      const sz = 22 - t * 8 // rétrécit avec la distance

      setBallPos({ x, y })

      frame++
      if (frame <= totalFrames) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        // Fin de l'animation
        setBallPos(null)
        setThrowing(false)
        if (hit) playPlouf()
        else playBounce()
        setShowResult(hit ? 'hit' : 'miss')
        setTimeout(() => {
          setShowResult(null)
          onShot(targetCupIdx, hit)
        }, 1200)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  // Vecteur visée
  const aimAngle = dragging ? {
    dx: dragCurrent.x - dragStart.x,
    dy: dragCurrent.y - dragStart.y,
  } : null

  const rb = restBall()

  return (
    <div ref={containerRef}
      style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden',
        background:'linear-gradient(180deg,#0a0510 0%,#0d0718 40%,#1a0e2a 100%)',
        touchAction:'none', userSelect:'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambiance */}
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% -5%,rgba(245,158,11,0.1),transparent 50%)',pointerEvents:'none'}}/>

      {/* Table */}
      <div style={{position:'absolute',bottom:0,left:'-30%',right:'-30%',height:'60%',
        background:'linear-gradient(175deg,#3d2200,#2a1800,#1e1000)',
        borderTop:'2px solid rgba(245,158,11,0.18)',
        borderRadius:'50% 50% 0 0 / 15px 15px 0 0',
        boxShadow:'inset 0 2px 40px rgba(0,0,0,0.5)'}}/>
      {/* Ligne centre */}
      <div style={{position:'absolute',bottom:0,left:'50%',width:1,height:'55%',
        background:'linear-gradient(to bottom,rgba(245,158,11,0.12),transparent)',
        transform:'translateX(-50%)',pointerEvents:'none'}}/>

      {/* HUD */}
      <div style={{position:'absolute',top:0,left:0,right:0,padding:'14px 14px 10px',
        display:'flex',justifyContent:'space-between',alignItems:'center',
        background:'linear-gradient(to bottom,rgba(5,5,8,0.95) 70%,transparent)',zIndex:10}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,
          background:'linear-gradient(135deg,#fbbf24,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          🍺 PONG
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{background:'rgba(13,13,20,0.9)',border:'1px solid #1e1e2e',borderRadius:10,padding:'4px 10px',textAlign:'center' as const}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:'#ef4444'}}>{enemyCups.filter(Boolean).length}</div>
            <div style={{fontSize:7,color:'#4b5563',fontWeight:700,letterSpacing:1}}>EUX</div>
          </div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,color:'#374151'}}>VS</div>
          <div style={{background:'rgba(13,13,20,0.9)',border:'1px solid #1e1e2e',borderRadius:10,padding:'4px 10px',textAlign:'center' as const}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:'#4ade80'}}>{myCups.filter(Boolean).length}</div>
            <div style={{fontSize:7,color:'#4b5563',fontWeight:700,letterSpacing:1}}>MOI</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#4b5563',fontSize:18,cursor:'pointer',marginLeft:4}}>✕</button>
        </div>
      </div>

      {/* Turn tag */}
      <div style={{position:'absolute',top:52,left:'50%',transform:'translateX(-50%)',
        background:isMyTurn?'rgba(251,191,36,0.1)':'rgba(239,68,68,0.1)',
        border:`1px solid ${isMyTurn?'rgba(245,158,11,0.35)':'rgba(239,68,68,0.25)'}`,
        borderRadius:8,padding:'3px 12px',
        fontFamily:"'Bebas Neue',cursive",fontSize:10,letterSpacing:2,
        color:isMyTurn?'rgba(251,191,36,0.9)':'rgba(248,113,113,0.8)',
        whiteSpace:'nowrap' as const,zIndex:10}}>
        {isMyTurn ? (throwing?'🎯 EN VOL...':'🎯 TON TOUR — GLISSE LA BALLE') : `⏳ TOUR DE ${enemyName.toUpperCase()}...`}
      </div>

      {/* Label adversaire */}
      <div style={{position:'absolute',top:'9%',left:'50%',transform:'translateX(-50%)',
        fontFamily:"'Bebas Neue',cursive",fontSize:8,letterSpacing:2,color:'#374151',zIndex:5}}>
        {enemyName.toUpperCase()}
      </div>

      {/* COUPES ADVERSAIRE */}
      {ENEMY_CUP_POSITIONS.map((pos, i) => (
        <div key={i} style={{
          position:'absolute',
          left:`calc(${pos.x*100}% - ${enemyCups[i]?16:12}px)`,
          top:`calc(${pos.y*100}% - ${enemyCups[i]?22:16}px)`,
          zIndex:5,
          transition:'opacity 0.4s',
          opacity: enemyCups[i] || splashCup===i ? 1 : 0,
        }}>
          <Cup full={enemyCups[i]} size="sm" splashing={splashCup===i}/>
        </div>
      ))}

      {/* COUPES JOUEUR */}
      <div style={{position:'absolute',bottom:'19%',left:'50%',transform:'translateX(-50%)',
        fontFamily:"'Bebas Neue',cursive",fontSize:8,letterSpacing:2,color:'#374151',zIndex:5}}>
        {myName.toUpperCase()}
      </div>

      {MY_CUP_POSITIONS.map((pos, i) => (
        <div key={i} style={{
          position:'absolute',
          left:`calc(${pos.x*100}% - ${i>=3?27:18}px)`,
          top:`calc(${pos.y*100}% - ${i>=3?36:28}px)`,
          zIndex:5,
          opacity: myCups[i] ? 1 : 0,
          transition:'opacity 0.4s',
        }}>
          <Cup full={myCups[i]} size={i>=3?'lg':'sm'}/>
        </div>
      ))}

      {/* BALLE EN VOL */}
      {ballPos && (
        <div style={{position:'absolute',left:ballPos.x,top:ballPos.y,
          transform:'translateX(-50%) translateY(-50%)',zIndex:30,pointerEvents:'none'}}>
          <PingPongBall size={20}/>
        </div>
      )}

      {/* VISÉE (ligne pointillée) */}
      {dragging && aimAngle && !throwing && (
        <svg style={{position:'absolute',inset:0,zIndex:20,pointerEvents:'none'}}
          width="100%" height="100%">
          {/* Ligne de visée */}
          <line
            x1={rb.x} y1={rb.y}
            x2={rb.x - aimAngle.dx * 1.5}
            y2={rb.y - aimAngle.dy * 1.5}
            stroke="rgba(251,191,36,0.6)"
            strokeWidth="2"
            strokeDasharray="8,6"
            strokeLinecap="round"
          />
          {/* Point de visée */}
          <circle
            cx={rb.x - aimAngle.dx * 1.5}
            cy={rb.y - aimAngle.dy * 1.5}
            r="5"
            fill="rgba(251,191,36,0.8)"
          />
          <circle
            cx={rb.x - aimAngle.dx * 1.5}
            cy={rb.y - aimAngle.dy * 1.5}
            r="10"
            fill="none"
            stroke="rgba(251,191,36,0.4)"
            strokeWidth="1.5"
          />
        </svg>
      )}

      {/* BALLE AU REPOS */}
      {!ballPos && !throwing && isMyTurn && (
        <div style={{position:'absolute',left:rb.x,top:rb.y,
          transform:'translateX(-50%) translateY(-50%)',zIndex:25,
          animation:dragging?'none':'float 2s ease-in-out infinite'}}>
          <PingPongBall size={26}/>
        </div>
      )}

      {/* RÉSULTAT */}
      {showResult && (
        <div style={{position:'absolute',top:'40%',left:'50%',
          transform:'translateX(-50%)',zIndex:40,
          fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,
          color:showResult==='hit'?'#4ade80':'#f87171',
          textShadow:showResult==='hit'?'0 0 20px #22c55e':'0 0 20px #ef4444',
          animation:'pop-result 0.3s ease-out'}}>
          {showResult==='hit'?'🎯 DEDANS !':'💨 RATÉ !'}
        </div>
      )}

      {/* Zone attente adversaire */}
      {!isMyTurn && (
        <div style={{position:'absolute',bottom:20,left:20,right:20,zIndex:20}}>
          <div style={{background:'rgba(13,13,20,0.92)',border:'1px solid #1e1e2e',
            borderRadius:14,padding:'14px 20px',textAlign:'center' as const}}>
            <div style={{fontSize:22,marginBottom:6}}>⏳</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,color:'#9ca3af'}}>
              TOUR DE {enemyName.toUpperCase()}...
            </div>
            <div style={{fontSize:11,color:'#4b5563',marginTop:4}}>Regarde si il/elle vise bien 👀</div>
          </div>
        </div>
      )}

      {/* Hint swipe */}
      {isMyTurn && !dragging && !throwing && !ballPos && (
        <div style={{position:'absolute',bottom:40,left:'50%',transform:'translateX(-50%)',
          display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4,
          animation:'hint-fade 2s ease-in-out infinite',zIndex:15}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:9,letterSpacing:2,
            color:'rgba(251,191,36,0.5)'}}>MAINTIENS ET GLISSE LA BALLE</div>
        </div>
      )}

      <style>{`
        @keyframes float { 0%,100%{transform:translateX(-50%) translateY(-50%)} 50%{transform:translateX(-50%) translateY(calc(-50% - 6px))} }
        @keyframes hint-fade { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes pop-result { 0%{transform:translateX(-50%) scale(0.5)} 60%{transform:translateX(-50%) scale(1.15)} 100%{transform:translateX(-50%) scale(1)} }
      `}</style>
    </div>
  )
}

// ── COMPOSANT PRINCIPAL ────────────────────────────────────────────────────
export default function BeerPong({ members, myUserId, groupId, onAwardDistance, onClose }: Props) {
  const supabase = createClient()

  const [phase, setPhase] = useState<'menu'|'join'|'lobby'|'playing'|'finished'>('menu')
  const [isHost, setIsHost] = useState(false)
  const [sessionCode, setSessionCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [myCups, setMyCups] = useState<boolean[]>(Array(TOTAL_CUPS).fill(true))
  const [enemyCups, setEnemyCups] = useState<boolean[]>(Array(TOTAL_CUPS).fill(true))
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [splashCup, setSplashCup] = useState<number|null>(null)
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([])
  const [opponentId, setOpponentId] = useState('')
  const [joinError, setJoinError] = useState('')
  const [resultMsg, setResultMsg] = useState('')

  const wasPlaying = useRef(false)
  const lobbyPollRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const channelRef = useRef<any>(null)
  const isHostRef = useRef(false)

  const me = members.find(m=>m.user_id===myUserId)
  const opponent = members.find(m=>m.user_id===opponentId)

  useEffect(()=>{
    wasPlaying.current = isAmbiancePlaying()
    if (wasPlaying.current) stopAmbiance()
    return ()=>{
      if (lobbyPollRef.current) clearInterval(lobbyPollRef.current)
      if (channelRef.current) channelRef.current.unsubscribe?.()
      if (wasPlaying.current) {
        const vol=getSavedVolume(), muted=getSavedMuted()
        if (!muted) startAmbiance(vol)
      }
    }
  },[])

  // ── CRÉER ──
  const createSession = async () => {
    const code = generateCode()
    const { data, error } = await supabase.from('beerpong_sessions').insert({
      code, group_id:groupId, host_id:myUserId,
      players:[{user_id:myUserId,pseudo:me?.pseudo||'?'}],
      host_cups:Array(TOTAL_CUPS).fill(true),
      guest_cups:Array(TOTAL_CUPS).fill(true),
      current_turn:myUserId, status:'waiting', last_shot:null,
    }).select().single()
    if (error||!data) return
    setSessionCode(code); setSessionId(data.id)
    setIsHost(true); isHostRef.current=true
    setIsMyTurn(true)
    setLobbyPlayers([{user_id:myUserId,pseudo:me?.pseudo||'?'}])
    setPhase('lobby')
    startLobbyPoll(data.id)
  }

  // ── POLLING LOBBY ──
  const startLobbyPoll = (sid: string) => {
    if (lobbyPollRef.current) clearInterval(lobbyPollRef.current)
    lobbyPollRef.current = setInterval(async () => {
      const {data} = await supabase.from('beerpong_sessions').select('*').eq('id',sid).single()
      if (!data) return
      if (data.players) setLobbyPlayers(data.players)
      if (data.status==='playing') {
        clearInterval(lobbyPollRef.current!)
        const host = isHostRef.current
        const myIdx = data.players.findIndex((p:any)=>p.user_id===myUserId)
        const opp = data.players.find((p:any)=>p.user_id!==myUserId)
        if (opp) setOpponentId(opp.user_id)
        setIsMyTurn(data.current_turn===myUserId)
        setMyCups(Array(TOTAL_CUPS).fill(true))
        setEnemyCups(Array(TOTAL_CUPS).fill(true))
        setPhase('playing')
        subscribeSession(sid, host)
      }
    }, 1500)
    setTimeout(()=>{if(lobbyPollRef.current)clearInterval(lobbyPollRef.current)}, 10*60*1000)
  }

  // ── LANCER (host) ──
  const launchGame = async () => {
    if (lobbyPlayers.length < 2) return
    const opp = lobbyPlayers.find(p=>p.user_id!==myUserId)
    await supabase.from('beerpong_sessions').update({
      status:'playing', guest_id:opp?.user_id, current_turn:myUserId,
    }).eq('id',sessionId)
    clearInterval(lobbyPollRef.current!)
    if (opp) setOpponentId(opp.user_id)
    setIsMyTurn(true)
    setMyCups(Array(TOTAL_CUPS).fill(true))
    setEnemyCups(Array(TOTAL_CUPS).fill(true))
    setPhase('playing')
    subscribeSession(sessionId, true)
  }

  // ── REJOINDRE ──
  const joinSession = async () => {
    setJoinError('')
    const {data,error} = await supabase.from('beerpong_sessions')
      .select('*').eq('code',joinCode.trim()).eq('group_id',groupId).eq('status','waiting').single()
    if (error||!data) {setJoinError('Code invalide ou partie déjà commencée'); return}
    const current = data.players||[]
    if (!current.find((p:any)=>p.user_id===myUserId)) {
      await supabase.from('beerpong_sessions').update({
        players:[...current,{user_id:myUserId,pseudo:me?.pseudo||'?'}]
      }).eq('id',data.id)
    }
    setSessionId(data.id); setIsHost(false); isHostRef.current=false
    setLobbyPlayers([...current,{user_id:myUserId,pseudo:me?.pseudo||'?'}])
    setPhase('lobby')
    startLobbyPoll(data.id)
  }

  // ── REALTIME EN JEU ──
  const subscribeSession = (sid:string, host:boolean) => {
    channelRef.current = supabase.channel(`bp:${sid}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'beerpong_sessions',filter:`id=eq.${sid}`},
        payload => handleUpdate(payload.new as any, host))
      .subscribe()
  }

  const handleUpdate = (data:any, host:boolean) => {
    if (!data) return
    const mine  = host ? data.host_cups : data.guest_cups
    const enemy = host ? data.guest_cups : data.host_cups
    setMyCups(mine)
    setEnemyCups(enemy)
    setIsMyTurn(data.current_turn===myUserId)

    // Traiter le dernier tir adverse
    if (data.last_shot && data.last_shot.shooter!==myUserId) {
      const shot = data.last_shot
      if (shot.hit && shot.cup_index>=0) {
        setSplashCup(shot.cup_index)
        playPlouf()
        setTimeout(()=>setSplashCup(null),900)
      }
    }

    if (data.status==='gameover') {
      const won = data.winner_id===myUserId
      setResultMsg(won?'🏆 T\'AS GAGNÉ !':'😢 T\'AS PERDU...')
      setPhase('finished')
    }
  }

  // ── TIRER ──
  const handleShot = async (targetIdx:number, hit:boolean) => {
    const {data} = await supabase.from('beerpong_sessions').select('*').eq('id',sessionId).single()
    if (!data) return

    const host = isHostRef.current
    let newEnemyCups = host ? [...data.guest_cups] : [...data.host_cups]

    if (hit && targetIdx>=0 && newEnemyCups[targetIdx]) {
      newEnemyCups[targetIdx] = false
      setEnemyCups(newEnemyCups)
    }

    const allGone = newEnemyCups.every(c=>!c)
    // Si marque → rejoue, sinon change de tour
    const nextTurn = hit ? myUserId : (host ? data.guest_id : data.host_id)

    const updateData: any = {
      host_cups: host ? data.host_cups : newEnemyCups,
      guest_cups: host ? newEnemyCups : data.guest_cups,
      current_turn: allGone ? null : nextTurn,
      status: allGone ? 'gameover' : 'playing',
      last_shot: { shooter:myUserId, hit, cup_index:targetIdx },
    }
    if (allGone) updateData.winner_id = myUserId

    await supabase.from('beerpong_sessions').update(updateData).eq('id',sessionId)

    if (allGone) {
      setResultMsg('🏆 T\'AS GAGNÉ !')
      setPhase('finished')
    } else {
      setIsMyTurn(hit) // si marque → rejoue
    }
  }

  const BG: any = {position:'fixed',inset:0,background:'var(--bg)',zIndex:400,
    display:'flex',flexDirection:'column',alignItems:'center',overflowY:'auto',padding:'28px 20px 40px'}
  const W = {width:'100%',maxWidth:360}

  // MENU
  if (phase==='menu') return (
    <div style={BG}><div style={W}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3,
          background:'linear-gradient(135deg,#fbbf24,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          🍺 BEER PONG
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6b7280',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
        <button onClick={createSession}
          style={{padding:'20px',borderRadius:16,border:'2px solid var(--border)',cursor:'pointer',
            background:'linear-gradient(135deg,#1a0a00,#0d0600)',display:'flex',
            flexDirection:'column' as const,alignItems:'flex-start',gap:6}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,color:'#fbbf24'}}>🎯 CRÉER UNE PARTIE</div>
          <div style={{fontSize:12,color:'#6b7280'}}>Génère un code et invite un ami</div>
        </button>
        <button onClick={()=>setPhase('join')}
          style={{padding:'20px',borderRadius:16,border:'2px solid var(--border)',cursor:'pointer',
            background:'var(--bg-card)',display:'flex',flexDirection:'column' as const,
            alignItems:'flex-start',gap:6}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,color:'#e2e8f0'}}>🔢 REJOINDRE</div>
          <div style={{fontSize:12,color:'#6b7280'}}>Entre le code à 4 chiffres</div>
        </button>
      </div>
      <div style={{marginTop:16,padding:14,borderRadius:12,background:'var(--bg-card)',
        border:'1px solid var(--border)',fontSize:12,color:'#4b5563',lineHeight:1.8}}>
        🍺 Coule les coupes de l'adversaire pour gagner<br/>
        🏓 Maintiens la balle et glisse vers la cible<br/>
        🎯 Tu rejoues si tu marques !<br/>
        🏆 Le perdant boit ses coupes restantes
      </div>
    </div></div>
  )

  // JOIN
  if (phase==='join') return (
    <div style={BG}><div style={W}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <button onClick={()=>setPhase('menu')} style={{background:'none',border:'none',color:'#6b7280',fontSize:20,cursor:'pointer'}}>← Retour</button>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6b7280',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:'#fbbf24',marginBottom:20}}>🔢 CODE DE LA PARTIE</div>
      <input type="number" placeholder="1234" value={joinCode}
        onChange={e=>setJoinCode(e.target.value.slice(0,4))}
        style={{width:'100%',padding:'20px',borderRadius:16,
          border:`2px solid ${joinError?'#7f1d1d':'var(--border)'}`,
          background:'var(--bg-card)',color:'#e2e8f0',fontSize:36,textAlign:'center' as const,
          fontFamily:"'Bebas Neue',cursive",letterSpacing:12,marginBottom:12}}/>
      {joinError && <div style={{color:'#f87171',fontSize:12,marginBottom:12,textAlign:'center' as const}}>{joinError}</div>}
      <button onClick={joinSession} disabled={joinCode.length!==4}
        style={{width:'100%',padding:'16px',borderRadius:14,border:'none',
          cursor:joinCode.length===4?'pointer':'not-allowed',
          background:joinCode.length===4?'linear-gradient(135deg,#fbbf24,#f97316)':'#2a2a3e',
          color:joinCode.length===4?'#0a0a14':'#4b5563',
          fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:2}}>
        REJOINDRE →
      </button>
    </div></div>
  )

  // LOBBY
  if (phase==='lobby') return (
    <div style={BG}><div style={W}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,
          background:'linear-gradient(135deg,#fbbf24,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          🍺 BEER PONG
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#6b7280',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>

      {isHost && (
        <div style={{background:'var(--bg-card)',borderRadius:16,border:'1px solid var(--border)',
          padding:20,marginBottom:16,textAlign:'center' as const}}>
          <div style={{fontSize:11,color:'#4b5563',fontWeight:700,letterSpacing:2,marginBottom:8}}>CODE</div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:52,color:'#fbbf24',letterSpacing:12}}>{sessionCode}</div>
          <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>Partage ce code à ton adversaire</div>
        </div>
      )}

      <div style={{background:'var(--bg-card)',borderRadius:14,border:'1px solid var(--border)',padding:14,marginBottom:16}}>
        <div style={{fontSize:10,color:'#4b5563',fontWeight:700,letterSpacing:1,marginBottom:10}}>
          JOUEURS ({lobbyPlayers.length})
        </div>
        {lobbyPlayers.map((p:any,i:number)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,
            padding:'8px 0',borderBottom:i<lobbyPlayers.length-1?'1px solid var(--border)':'none'}}>
            <div style={{width:8,height:8,borderRadius:'50%',
              background:p.user_id===myUserId?'#4ade80':'#fbbf24'}}/>
            <span style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{p.pseudo}</span>
            {p.user_id===myUserId && <span style={{fontSize:10,color:'#4ade80',fontWeight:700}}>MOI</span>}
            {isHost&&p.user_id===myUserId && <span style={{fontSize:10,color:'#fbbf24',fontWeight:700}}>HOST</span>}
          </div>
        ))}
        {lobbyPlayers.length<2 && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8,opacity:0.4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#374151',animation:'pulse 1s infinite'}}/>
            <span style={{fontSize:13,color:'#6b7280'}}>En attente d'un adversaire...</span>
          </div>
        )}
      </div>

      {isHost && (
        <button onClick={launchGame} disabled={lobbyPlayers.length<2}
          style={{width:'100%',padding:'16px',borderRadius:14,border:'none',
            cursor:lobbyPlayers.length>=2?'pointer':'not-allowed',
            background:lobbyPlayers.length>=2?'linear-gradient(135deg,#fbbf24,#f97316)':'#2a2a3e',
            color:lobbyPlayers.length>=2?'#0a0a14':'#4b5563',
            fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:2}}>
          {lobbyPlayers.length>=2?'🚀 LANCER LA PARTIE':'EN ATTENTE D\'UN ADVERSAIRE...'}
        </button>
      )}
      {!isHost && (
        <div style={{textAlign:'center' as const,padding:16,color:'#4b5563',fontSize:13}}>
          En attente que le host lance la partie...
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div></div>
  )

  // PLAYING
  if (phase==='playing') return (
    <div style={{position:'fixed',inset:0,zIndex:400}}>
      <GameView
        myCups={myCups}
        enemyCups={enemyCups}
        isMyTurn={isMyTurn}
        enemyName={opponent?.pseudo||'Adversaire'}
        myName={me?.pseudo||'Moi'}
        onShot={handleShot}
        splashCup={splashCup}
        onClose={onClose}
      />
    </div>
  )

  // FINISHED
  if (phase==='finished') return (
    <div style={BG}><div style={W}>
      <div style={{textAlign:'center' as const,padding:'24px 20px',borderRadius:18,
        background:resultMsg.includes('GAGNÉ')?'#052e16':'#1c0505',
        border:`1px solid ${resultMsg.includes('GAGNÉ')?'#166534':'#7f1d1d'}`,
        marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>{resultMsg.includes('GAGNÉ')?'🏆':'😢'}</div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,
          color:resultMsg.includes('GAGNÉ')?'#4ade80':'#f87171'}}>
          {resultMsg}
        </div>
        {!resultMsg.includes('GAGNÉ') && (
          <div style={{fontSize:13,color:'#fca5a5',marginTop:8}}>Bois tes coupes restantes 🍺</div>
        )}
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>{
          setPhase('menu')
          setMyCups(Array(TOTAL_CUPS).fill(true))
          setEnemyCups(Array(TOTAL_CUPS).fill(true))
          setOpponentId(''); setSessionId(''); setSessionCode('')
          setLobbyPlayers([])
        }}
          style={{flex:1,padding:'14px',borderRadius:14,border:'none',cursor:'pointer',
            background:'linear-gradient(135deg,#fbbf24,#f97316)',color:'#0a0a14',
            fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2}}>
          🔄 REJOUER
        </button>
        <button onClick={onClose}
          style={{flex:1,padding:'14px',borderRadius:14,border:'1px solid var(--border)',cursor:'pointer',
            background:'transparent',color:'#6b7280',fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:2}}>
          FERMER
        </button>
      </div>
    </div></div>
  )

  return null
}
