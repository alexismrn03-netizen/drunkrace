"use client"
import { useState, useRef } from "react"

interface Props {
  members: any[]
  myUserId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

const SUITS = ["♠", "♥", "♦", "♣"]

const VALUES = [
  { label:"2",  value:2,  emoji:"🍼", name:"Le Rookie",  color:"#60a5fa", stripe:"linear-gradient(to bottom,#3b82f6,#1d4ed8)", border:"#1e3a8a", bg:"linear-gradient(160deg,#060e1e,#040a16)", glow:"#3b82f6" },
  { label:"3",  value:3,  emoji:"😬", name:"",            color:"#818cf8", stripe:"linear-gradient(to bottom,#6366f1,#4338ca)", border:"#312e81", bg:"linear-gradient(160deg,#08081e,#05050f)", glow:"#6366f1" },
  { label:"4",  value:4,  emoji:"🤢", name:"",            color:"#34d399", stripe:"linear-gradient(to bottom,#10b981,#059669)", border:"#065f46", bg:"linear-gradient(160deg,#060f0a,#040a07)", glow:"#10b981" },
  { label:"5",  value:5,  emoji:"😅", name:"",            color:"#9ca3af", stripe:"linear-gradient(to bottom,#6b7280,#374151)", border:"#374151", bg:"linear-gradient(160deg,#0e0e18,#0a0a14)", glow:"#6b7280" },
  { label:"6",  value:6,  emoji:"🍺", name:"",            color:"#fbbf24", stripe:"linear-gradient(to bottom,#f59e0b,#d97706)", border:"#78350f", bg:"linear-gradient(160deg,#120a00,#0a0600)", glow:"#f59e0b" },
  { label:"7",  value:7,  emoji:"🍀", name:"La Chance",   color:"#4ade80", stripe:"linear-gradient(to bottom,#22c55e,#16a34a)", border:"#166534", bg:"linear-gradient(160deg,#061006,#040d04)", glow:"#22c55e" },
  { label:"8",  value:8,  emoji:"😤", name:"",            color:"#a78bfa", stripe:"linear-gradient(to bottom,#8b5cf6,#6d28d9)", border:"#4c1d95", bg:"linear-gradient(160deg,#0a0618,#070412)", glow:"#8b5cf6" },
  { label:"9",  value:9,  emoji:"🔥", name:"Le Feu",      color:"#fb923c", stripe:"linear-gradient(to bottom,#f97316,#ea580c)", border:"#7c2d12", bg:"linear-gradient(160deg,#140800,#0d0500)", glow:"#f97316" },
  { label:"10", value:10, emoji:"🕺", name:"La Fiesta",   color:"#f472b6", stripe:"linear-gradient(to bottom,#ec4899,#be185d)", border:"#831843", bg:"linear-gradient(160deg,#160510,#0d030a)", glow:"#ec4899" },
  { label:"J",  value:11, emoji:"🤡", name:"Le Valet",    color:"#22d3ee", stripe:"linear-gradient(to bottom,#06b6d4,#0891b2)", border:"#0e7490", bg:"linear-gradient(160deg,#050e14,#030a10)", glow:"#06b6d4" },
  { label:"Q",  value:12, emoji:"💅", name:"La Reine",    color:"#f472b6", stripe:"linear-gradient(to bottom,#ec4899,#be185d)", border:"#831843", bg:"linear-gradient(160deg,#160510,#0d030a)", glow:"#ec4899" },
  { label:"K",  value:13, emoji:"👑", name:"Le Roi",      color:"#c084fc", stripe:"linear-gradient(to bottom,#a855f7,#7c3aed)", border:"#3b1f6a", bg:"linear-gradient(160deg,#120820,#0d0518)", glow:"#a855f7" },
  { label:"A",  value:14, emoji:"💀", name:"L'As",        color:"#f87171", stripe:"linear-gradient(to bottom,#ef4444,#b91c1c)", border:"#7f1d1d", bg:"linear-gradient(160deg,#1a0404,#0d0202)", glow:"#ef4444" },
]

const JOKER = { label:"★", value:0, emoji:"🎭", name:"Le Joker", color:"#fbbf24", stripe:"linear-gradient(to bottom,#f59e0b,#d97706)", border:"#78350f", bg:"linear-gradient(160deg,#120800,#0a0500)", glow:"#f59e0b", isJoker:true }

type CardType = typeof VALUES[0] & { suit: string; isJoker?: boolean }

function buildDeck(): CardType[] {
  const deck: CardType[] = []
  for (const suit of SUITS) {
    for (const v of VALUES) {
      deck.push({ ...v, suit })
    }
  }
  deck.push({ ...JOKER, suit:"🃏" } as CardType)
  deck.push({ ...JOKER, suit:"🃏" } as CardType)
  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

type Phase = "playing" | "result" | "joker" | "tie" | "finished"

function Card({ card, revealed, size = "lg" }: { card: CardType; revealed: boolean; size?: "lg" | "sm" }) {
  const w = size === "lg" ? 160 : 90
  const h = size === "lg" ? 225 : 126
  const fontSize = size === "lg" ? 20 : 14
  const emojiSize = size === "lg" ? 60 : 36
  const watermarkSize = size === "lg" ? 56 : 34
  const borderR = size === "lg" ? 18 : 12

  if (!revealed) return (
    <div style={{
      width:w, height:h, borderRadius:borderR,
      background:"linear-gradient(160deg,#0f0f1e,#0a0a14)",
      border:"1.5px solid #1e1e2e",
      position:"relative", overflow:"hidden",
      boxShadow:"0 12px 40px #00000088",
      display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0,
    }}>
      {/* Filigrane lignes F1 */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(-60deg,transparent,transparent 14px,rgba(255,255,255,0.02) 14px,rgba(255,255,255,0.02) 15px)" }}/>
      {/* Bande violette */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:5, borderRadius:`${borderR}px 0 0 ${borderR}px`, background:"linear-gradient(to bottom,#c084fc,#ec4899)", boxShadow:"2px 0 12px #a855f755" }}/>
      <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:size==="lg"?14:10, letterSpacing:2, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:2, zIndex:2 }}>
        <span style={{ fontSize:size==="lg"?24:16 }}>🏁</span>
        DRUNK<br/>RACE
      </div>
    </div>
  )

  return (
    <div style={{
      width:w, height:h, borderRadius:borderR,
      background: card.bg,
      border:`1.5px solid ${card.border}88`,
      position:"relative", overflow:"hidden",
      boxShadow:`0 0 0 0.5px ${card.glow}11, 0 12px 40px #00000088, ${card.isJoker ? `0 0 30px ${card.glow}15` : ""}`,
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"space-between",
      padding:`${size==="lg"?10:6}px ${size==="lg"?9:6}px`,
      flexShrink:0,
      transition:"all 0.3s ease",
    }}>
      {/* Filigrane lignes F1 */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(-60deg,transparent,transparent 14px,rgba(255,255,255,0.025) 14px,rgba(255,255,255,0.025) 15px)", pointerEvents:"none" }}/>
      {/* Bande latérale F1 */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:5, borderRadius:`${borderR}px 0 0 ${borderR}px`, background:card.stripe, boxShadow:`2px 0 14px ${card.glow}55` }}/>
      {/* Ligne séparatrice centrale */}
      <div style={{ position:"absolute", top:"50%", left:12, right:12, height:1, background:card.color, opacity:0.12 }}/>
      {/* Glow bas */}
      <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", width:60, height:28, borderRadius:"50%", background:card.glow, filter:"blur(14px)", opacity:card.isJoker?0.45:0.3 }}/>
      {/* Watermark valeur */}
      <div style={{ position:"absolute", bottom:size==="lg"?26:16, right:size==="lg"?10:6, fontFamily:"'Bebas Neue',cursive", fontSize:watermarkSize, opacity:0.04, lineHeight:1, color:"white", zIndex:1 }}>{card.label}</div>
      {/* Coin haut gauche */}
      <div style={{ alignSelf:"flex-start", paddingLeft:5, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:1, zIndex:2 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize, color:card.color, lineHeight:1, textShadow:`0 0 12px ${card.color}` }}>{card.label}</div>
        <div style={{ fontSize:size==="lg"?11:8, color:card.color+"aa", lineHeight:1 }}>{card.suit}</div>
      </div>
      {/* Emoji central */}
      <div style={{
        fontSize:emojiSize, lineHeight:1, zIndex:2,
        filter: card.isJoker
          ? `drop-shadow(0 0 12px ${card.glow}aa)`
          : card.value === 14
          ? `drop-shadow(0 0 14px ${card.glow}cc)`
          : card.value === 9
          ? `drop-shadow(0 0 10px ${card.glow}88)`
          : `drop-shadow(0 0 8px ${card.glow}66)`,
      }}>
        {card.emoji}
      </div>
      {/* Coin bas droite (retourné) */}
      <div style={{ alignSelf:"flex-end", paddingLeft:5, transform:"rotate(180deg)", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:1, zIndex:2 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize, color:card.color, lineHeight:1 }}>{card.label}</div>
        <div style={{ fontSize:size==="lg"?11:8, color:card.color+"aa", lineHeight:1 }}>{card.suit}</div>
      </div>
    </div>
  )
}

export default function HigherLower({ members, myUserId, onAwardDistance, onClose }: Props) {
  const [deck, setDeck] = useState<CardType[]>(() => buildDeck())
  const [deckIndex, setDeckIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [phase, setPhase] = useState<Phase>("playing")
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [history, setHistory] = useState<{label:string; correct:boolean; color:string}[]>([])
  const [flipping, setFlipping] = useState(false)
  const [revealedCard, setRevealedCard] = useState<CardType | null>(null)
  const [jokerEffect, setJokerEffect] = useState<"drink"|"distribute"|null>(null)

  const currentCard = deck[deckIndex]
  const remaining = deck.length - deckIndex - 1

  const guess = (dir: "higher" | "lower") => {
    if (flipping || phase !== "playing") return
    const next = deck[deckIndex + 1]
    if (!next) { setPhase("finished"); return }

    setFlipping(true)

    setTimeout(() => {
      setRevealedCard(next)

      if (next.isJoker) {
        const effect = Math.random() > 0.5 ? "drink" : "distribute"
        setJokerEffect(effect)
        setPhase("joker")
        setFlipping(false)
        return
      }

      const currVal = currentCard.isJoker ? 7 : currentCard.value
      const nextVal = next.value
      const isTie = currVal === nextVal

      if (isTie) {
        setIsCorrect(null)
        setPhase("tie")
        setFlipping(false)
        return
      }

      const correct = (dir === "higher" && nextVal > currVal) || (dir === "lower" && nextVal < currVal)
      setIsCorrect(correct)
      setHistory(h => [...h, { label:next.label, correct, color:next.color }])
      setStreak(s => correct ? s + 1 : 0)
      setPhase("result")
      setFlipping(false)
    }, 500)
  }

  const advance = () => {
    setDeckIndex(i => i + 1)
    setPhase("playing")
    setIsCorrect(null)
    setRevealedCard(null)
  }

  const restart = () => {
    setDeck(buildDeck())
    setDeckIndex(0)
    setStreak(0)
    setPhase("playing")
    setIsCorrect(null)
    setRevealedCard(null)
    setHistory([])
  }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"28px 20px 32px", overflowY:"auto" }

  const displayCard = revealedCard && phase !== "playing" ? revealedCard : currentCard

  return (
    <div style={BG}>
      {/* Header */}
      <div style={{ width:"100%", maxWidth:360, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          🃏 PLUS OU MOINS
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      {/* Streak + remaining */}
      <div style={{ width:"100%", maxWidth:360, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div style={{ background:"#13131f", borderRadius:12, padding:"6px 14px", border:"1px solid #2a2a3e", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:13, color:"#f59e0b", letterSpacing:2 }}>🔥 STREAK</span>
          <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#f59e0b" }}>×{streak}</span>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, color:"#4b5563", letterSpacing:1 }}>
          {remaining} cartes restantes
        </div>
      </div>

      {/* Paquet de cartes empilé */}
      <div style={{ position:"relative", width:160, height:225, marginBottom:26, flexShrink:0 }}>
        {/* Cartes derrière = effet paquet */}
        {remaining >= 4 && <div style={{ position:"absolute", top:8, left:7, width:160, height:225, borderRadius:18, background:"#0c0c1a", border:"1.5px solid #181828", transform:"rotate(5deg)" }}/>}
        {remaining >= 3 && <div style={{ position:"absolute", top:5, left:5, width:160, height:225, borderRadius:18, background:"#0d0d1c", border:"1.5px solid #1a1a2c", transform:"rotate(3deg)" }}/>}
        {remaining >= 2 && <div style={{ position:"absolute", top:3, left:3, width:160, height:225, borderRadius:18, background:"#0e0e1e", border:"1.5px solid #1c1c30", transform:"rotate(1.5deg)" }}/>}
        {remaining >= 1 && <div style={{ position:"absolute", top:1, left:1, width:160, height:225, borderRadius:18, background:"#0f0f1f", border:"1.5px solid #1e1e30" }}/>}
        {/* Carte active */}
        <div style={{ position:"absolute", top:0, left:0, transition:"opacity 0.3s", opacity: flipping ? 0 : 1 }}>
          <Card card={displayCard} revealed={phase !== "playing"} />
        </div>
        {flipping && (
          <div style={{ position:"absolute", top:0, left:0 }}>
            <Card card={currentCard} revealed={false} />
          </div>
        )}
      </div>

      {/* Phase: PLAYING */}
      {phase === "playing" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:10, alignItems:"center" }}>
          <div style={{ fontSize:11, color:"#4b5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase" as const }}>La prochaine est…</div>
          <div style={{ display:"flex", gap:10, width:"100%" }}>
            <button onClick={() => guess("lower")}
              style={{ flex:1, padding:"16px 10px", borderRadius:16, border:"2px solid #1e3a8a66", cursor:"pointer", background:"linear-gradient(135deg,#1e3a8a,#0c1a3a)", color:"#60a5fa", fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3, boxShadow:"0 4px 20px #3b82f618" }}
              onTouchStart={e=>(e.currentTarget.style.transform="scale(0.95)")}
              onTouchEnd={e=>(e.currentTarget.style.transform="scale(1)")}>
              ⬇️ PLUS BAS
              <span style={{ fontSize:9, color:"#3b82f677", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, letterSpacing:0 }}>je bois si raté</span>
            </button>
            <button onClick={() => guess("higher")}
              style={{ flex:1, padding:"16px 10px", borderRadius:16, border:"2px solid #7f1d1d66", cursor:"pointer", background:"linear-gradient(135deg,#7f1d1d,#3d0a0a)", color:"#f87171", fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3, boxShadow:"0 4px 20px #ef444418" }}
              onTouchStart={e=>(e.currentTarget.style.transform="scale(0.95)")}
              onTouchEnd={e=>(e.currentTarget.style.transform="scale(1)")}>
              ⬆️ PLUS HAUT
              <span style={{ fontSize:9, color:"#ef444477", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, letterSpacing:0 }}>je bois si raté</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase: RESULT */}
      {phase === "result" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"12px 20px", borderRadius:14, background:isCorrect?"#052e16":"#1c0505", border:`1px solid ${isCorrect?"#166534":"#7f1d1d"}`, width:"100%" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:isCorrect?"#4ade80":"#f87171", letterSpacing:3 }}>
              {isCorrect ? "✅ BONNE RÉPONSE !" : "❌ RATÉ !"}
            </div>
            <div style={{ fontSize:13, color:isCorrect?"#86efac":"#fca5a5", marginTop:4 }}>
              {isCorrect
                ? streak > 1 ? `🔥 Distribue ${streak} gorgées !` : "Distribue 1 gorgée !"
                : "Tu bois 1 gorgée 🥃"}
            </div>
          </div>
          <button onClick={advance}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2 }}>
            CARTE SUIVANTE ➜
          </button>
        </div>
      )}

      {/* Phase: TIE */}
      {phase === "tie" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"12px 20px", borderRadius:14, background:"#1a1030", border:"1px solid #3b1f6a", width:"100%" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#c084fc", letterSpacing:3 }}>🤝 ÉGALITÉ !</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Même valeur — on repioche, personne ne boit</div>
          </div>
          <button onClick={advance}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6d28d9,#4c1d95)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2 }}>
            REPIOCHE ➜
          </button>
        </div>
      )}

      {/* Phase: JOKER */}
      {phase === "joker" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"12px 20px", borderRadius:14, background:"#120800", border:"1px solid #f59e0b44", width:"100%" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#f59e0b", letterSpacing:3 }}>🎭 JOKER !</div>
            <div style={{ fontSize:14, fontWeight:700, color:jokerEffect==="drink"?"#f87171":"#4ade80", marginTop:8 }}>
              {jokerEffect==="drink" ? "💀 Tu bois 3 gorgées !" : "🎉 Tu distribues 3 gorgées !"}
            </div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Le destin a choisi pour toi</div>
          </div>
          <button onClick={() => { setDeckIndex(i => i + 1); setPhase("playing"); setRevealedCard(null) }}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#0a0a14", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2 }}>
            CARTE SUIVANTE ➜
          </button>
        </div>
      )}

      {/* Phase: FINISHED */}
      {phase === "finished" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"20px", borderRadius:16, background:"#13131f", border:"1px solid #2a2a3e", width:"100%" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🃏</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#c084fc", letterSpacing:3 }}>PAQUET TERMINÉ !</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>
              Meilleur streak : <span style={{ color:"#f59e0b", fontWeight:700 }}>×{streak}</span>
            </div>
          </div>
          <button onClick={restart}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2 }}>
            🔄 NOUVEAU PAQUET
          </button>
          <button onClick={onClose}
            style={{ width:"100%", padding:"12px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"transparent", color:"#6b7280", fontFamily:"'Bebas Neue',cursive", fontSize:14, letterSpacing:2 }}>
            FERMER
          </button>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && phase !== "finished" && (
        <div style={{ width:"100%", maxWidth:360, marginTop:18, display:"flex", flexWrap:"wrap" as const, gap:5, alignItems:"center" }}>
          <span style={{ fontSize:9, color:"#4b5563", fontWeight:700, letterSpacing:1, textTransform:"uppercase" as const }}>Historique</span>
          {history.slice(-10).map((h, i) => (
            <div key={i} style={{ width:28, height:28, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:11, letterSpacing:1, background:h.correct?"#052e16":"#1c0505", border:`1px solid ${h.correct?"#166534":"#7f1d1d"}`, color:h.correct?"#4ade80":"#f87171" }}>
              {h.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
