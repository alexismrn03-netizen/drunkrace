"use client"
import { useState, useEffect, useRef } from "react"

interface Props {
  members: any[]
  myUserId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

// Deck complet 52 cartes + 2 jokers
const SUITS = ["♠", "♥", "♦", "♣"]
const VALUES = [
  { label: "A",  value: 1,  emoji: "💀", name: "L'As",     color: "#ef4444", border: "#7f1d1d", bg: "linear-gradient(145deg,#1c0505,#0d0202)" },
  { label: "2",  value: 2,  emoji: "🍼", name: "Le Rookie", color: "#60a5fa", border: "#1e3a8a", bg: "linear-gradient(145deg,#071020,#030810)" },
  { label: "3",  value: 3,  emoji: "😬", name: "",          color: "#a3a3a3", border: "#374151", bg: "linear-gradient(145deg,#111827,#0a0f1a)" },
  { label: "4",  value: 4,  emoji: "🤢", name: "",          color: "#4ade80", border: "#166534", bg: "linear-gradient(145deg,#0a1a0a,#050d05)" },
  { label: "5",  value: 5,  emoji: "😅", name: "",          color: "#a3a3a3", border: "#374151", bg: "linear-gradient(145deg,#111827,#0a0f1a)" },
  { label: "6",  value: 6,  emoji: "🍺", name: "",          color: "#fbbf24", border: "#78350f", bg: "linear-gradient(145deg,#1a0a00,#0d0500)" },
  { label: "7",  value: 7,  emoji: "🍀", name: "La Chance", color: "#4ade80", border: "#166534", bg: "linear-gradient(145deg,#0a1a0a,#050d05)" },
  { label: "8",  value: 8,  emoji: "😤", name: "",          color: "#a3a3a3", border: "#374151", bg: "linear-gradient(145deg,#111827,#0a0f1a)" },
  { label: "9",  value: 9,  emoji: "🔥", name: "",          color: "#f97316", border: "#7c2d12", bg: "linear-gradient(145deg,#1c0a00,#0d0500)" },
  { label: "10", value: 10, emoji: "🕺", name: "La Fiesta", color: "#ec4899", border: "#831843", bg: "linear-gradient(145deg,#1a0516,#0d0310)" },
  { label: "J",  value: 11, emoji: "🤡", name: "Le Valet",  color: "#60a5fa", border: "#1e3a8a", bg: "linear-gradient(145deg,#0c1a3a,#071020)" },
  { label: "Q",  value: 12, emoji: "💅", name: "La Reine",  color: "#f47098", border: "#831843", bg: "linear-gradient(145deg,#2d0a1a,#1a0510)" },
  { label: "K",  value: 13, emoji: "👑", name: "Le Roi",    color: "#c084fc", border: "#3b1f6a", bg: "linear-gradient(145deg,#1a1030,#130d22)" },
]

type CardType = { label: string; value: number; suit: string; emoji: string; name: string; color: string; border: string; bg: string; isJoker?: boolean }

function buildDeck(): CardType[] {
  const deck: CardType[] = []
  for (const suit of SUITS) {
    for (const v of VALUES) {
      deck.push({ ...v, suit })
    }
  }
  // 2 jokers
  deck.push({ label: "★", value: 0, suit: "🃏", emoji: "🎭", name: "Le Joker", color: "#f59e0b", border: "#78350f", bg: "linear-gradient(145deg,#1a0a00,#0d0600)", isJoker: true })
  deck.push({ label: "★", value: 0, suit: "🃏", emoji: "🎭", name: "Le Joker", color: "#f59e0b", border: "#78350f", bg: "linear-gradient(145deg,#1a0a00,#0d0600)", isJoker: true })
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

type Phase = "playing" | "result" | "joker" | "tie" | "finished"

export default function HigherLower({ members, myUserId, onAwardDistance, onClose }: Props) {
  const [deck, setDeck] = useState<CardType[]>(() => buildDeck())
  const [deckIndex, setDeckIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [phase, setPhase] = useState<Phase>("playing")
  const [lastGuess, setLastGuess] = useState<"higher" | "lower" | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [history, setHistory] = useState<{label:string; correct:boolean}[]>([])
  const [flipping, setFlipping] = useState(false)
  const [nextCard, setNextCard] = useState<CardType | null>(null)
  const [jokerEffect, setJokerEffect] = useState<"drink" | "distribute" | null>(null)

  const currentCard = deck[deckIndex]
  const remaining = deck.length - deckIndex - 1

  const guess = (dir: "higher" | "lower") => {
    if (flipping || phase !== "playing") return
    const next = deck[deckIndex + 1]
    if (!next) { setPhase("finished"); return }

    setLastGuess(dir)
    setFlipping(true)
    setNextCard(next)

    setTimeout(() => {
      // Joker = effet aléatoire
      if (next.isJoker) {
        const effect = Math.random() > 0.5 ? "drink" : "distribute"
        setJokerEffect(effect)
        setPhase("joker")
        setFlipping(false)
        return
      }

      // As special: vaut 1 ET 14
      // Si la carte actuelle est As → elle est à la fois la plus haute et la plus basse
      // → tie, on repioche
      const currVal = currentCard.isJoker ? 7 : currentCard.value
      const nextVal = next.value

      // As après K = tie (A=1 ET A=14, les deux sont vrais)
      const isTie = (currVal === 13 && nextVal === 1) || (currVal === 1 && nextVal === 13) || (currVal === nextVal)

      if (isTie) {
        setIsCorrect(null)
        setPhase("tie")
        setFlipping(false)
        return
      }

      const correct =
        (dir === "higher" && (nextVal > currVal || (nextVal === 1 && currVal < 13))) ||
        (dir === "lower"  && (nextVal < currVal || (nextVal === 1 && currVal > 1)))

      setIsCorrect(correct)
      setHistory(h => [...h, { label: next.label, correct }])

      if (correct) {
        setStreak(s => s + 1)
      } else {
        setStreak(0)
      }
      setPhase("result")
      setFlipping(false)
    }, 600)
  }

  const next = () => {
    setDeckIndex(i => i + 1)
    setPhase("playing")
    setLastGuess(null)
    setIsCorrect(null)
    setNextCard(null)
    if (deck[deckIndex + 2] === undefined) setPhase("finished")
  }

  const restart = () => {
    setDeck(buildDeck())
    setDeckIndex(0)
    setStreak(0)
    setPhase("playing")
    setLastGuess(null)
    setIsCorrect(null)
    setNextCard(null)
    setHistory([])
  }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"28px 20px 32px", overflowY:"auto" }

  const displayCard = (phase === "result" || phase === "joker" || phase === "tie") && nextCard ? nextCard : currentCard

  // Card component
  const CardDisplay = ({ card, revealed }: { card: CardType; revealed: boolean }) => (
    <div style={{
      width: 170, height: 240,
      borderRadius: 20,
      background: revealed ? card.bg : "linear-gradient(145deg,#13131f,#0d0d1a)",
      border: `2px solid ${revealed ? card.border : "#2a2a3e"}`,
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "space-between",
      padding: "12px 10px",
      position: "relative",
      boxShadow: revealed ? `0 0 30px ${card.color}22, 0 8px 32px #00000060` : "0 8px 32px #00000060",
      transition: "all 0.3s ease",
      overflow: "hidden",
    }}>
      {revealed && (
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 50% 30%, ${card.color}12, transparent 65%)` }}/>
      )}
      {/* Top corner */}
      <div style={{ alignSelf:"flex-start", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:1, zIndex:1 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color: revealed ? card.color : "#2a2a3e", lineHeight:1 }}>{revealed ? card.label : "?"}</div>
        <div style={{ fontSize:12, color: revealed ? card.color+"aa" : "#2a2a3e" }}>{revealed ? card.suit : ""}</div>
      </div>
      {/* Center */}
      <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:6, zIndex:1 }}>
        <div style={{ fontSize: revealed ? 64 : 48, filter: revealed ? `drop-shadow(0 0 12px ${card.color}66)` : "none", transition:"all 0.3s" }}>
          {revealed ? card.emoji : "🂠"}
        </div>
        {revealed && card.name && (
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:10, letterSpacing:2, color:`${card.color}88` }}>{card.name.toUpperCase()}</div>
        )}
      </div>
      {/* Bottom corner */}
      <div style={{ alignSelf:"flex-end", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:1, transform:"rotate(180deg)", zIndex:1 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color: revealed ? card.color : "#2a2a3e", lineHeight:1 }}>{revealed ? card.label : "?"}</div>
        <div style={{ fontSize:12, color: revealed ? card.color+"aa" : "#2a2a3e" }}>{revealed ? card.suit : ""}</div>
      </div>
    </div>
  )

  return (
    <div style={BG}>
      {/* Header */}
      <div style={{ width:"100%", maxWidth:360, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          🃏 PLUS OU MOINS
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      {/* Streak + remaining */}
      <div style={{ width:"100%", maxWidth:360, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ background:"#13131f", borderRadius:12, padding:"6px 14px", border:"1px solid #2a2a3e", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color:"#f59e0b", letterSpacing:2 }}>🔥 STREAK</span>
          <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#f59e0b" }}>×{streak}</span>
        </div>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:12, color:"#4b5563", letterSpacing:1 }}>
          {remaining} cartes restantes
        </div>
      </div>

      {/* Deck visual — paquet de cartes empilé */}
      <div style={{ position:"relative", width:170, height:240, marginBottom:28 }}>
        {/* Cartes derrière (effet paquet) */}
        {remaining >= 3 && <div style={{ position:"absolute", top:6, left:6, width:170, height:240, borderRadius:20, background:"#13131f", border:"1px solid #2a2a3e", transform:"rotate(4deg)" }}/>}
        {remaining >= 2 && <div style={{ position:"absolute", top:3, left:3, width:170, height:240, borderRadius:20, background:"#13131f", border:"1px solid #2a2a3e", transform:"rotate(2deg)" }}/>}
        {remaining >= 1 && <div style={{ position:"absolute", top:1, left:1, width:170, height:240, borderRadius:20, background:"#13131f", border:"1px solid #252535" }}/>}
        {/* Carte active */}
        <div style={{ position:"absolute", top:0, left:0, transition:"transform 0.6s", transform: flipping ? "rotateY(90deg)" : "rotateY(0deg)" }}>
          <CardDisplay card={displayCard} revealed={phase !== "playing" || !flipping} />
        </div>
      </div>

      {/* Phase: PLAYING */}
      {phase === "playing" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:12, alignItems:"center" }}>
          <div style={{ fontSize:12, color:"#4b5563", fontWeight:600, letterSpacing:1 }}>La prochaine carte est…</div>
          <div style={{ display:"flex", gap:12, width:"100%" }}>
            <button onClick={() => guess("lower")}
              style={{ flex:1, padding:"18px 12px", borderRadius:18, border:"2px solid #1e3a8a66", cursor:"pointer", background:"linear-gradient(135deg,#1e3a8a,#0c1a3a)", color:"#60a5fa", fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4, boxShadow:"0 4px 20px #3b82f622" }}
              onTouchStart={e => (e.currentTarget.style.transform="scale(0.96)")}
              onTouchEnd={e => (e.currentTarget.style.transform="scale(1)")}>
              ⬇️ PLUS BAS
              <span style={{ fontSize:10, color:"#3b82f688", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, letterSpacing:0 }}>je bois si raté</span>
            </button>
            <button onClick={() => guess("higher")}
              style={{ flex:1, padding:"18px 12px", borderRadius:18, border:"2px solid #7f1d1d66", cursor:"pointer", background:"linear-gradient(135deg,#7f1d1d,#3d0a0a)", color:"#f87171", fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:2, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4, boxShadow:"0 4px 20px #ef444422" }}
              onTouchStart={e => (e.currentTarget.style.transform="scale(0.96)")}
              onTouchEnd={e => (e.currentTarget.style.transform="scale(1)")}>
              ⬆️ PLUS HAUT
              <span style={{ fontSize:10, color:"#ef444488", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, letterSpacing:0 }}>je bois si raté</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase: RESULT */}
      {phase === "result" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"14px 24px", borderRadius:16, background: isCorrect ? "#052e16" : "#1c0505", border:`1px solid ${isCorrect ? "#166534" : "#7f1d1d"}` }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color: isCorrect ? "#4ade80" : "#f87171", letterSpacing:3 }}>
              {isCorrect ? "✅ BONNE RÉPONSE !" : "❌ RATÉ !"}
            </div>
            <div style={{ fontSize:13, color: isCorrect ? "#86efac" : "#fca5a5", marginTop:4 }}>
              {isCorrect
                ? streak > 1 ? `🔥 Distribue ${streak} gorgées !` : "Distribue 1 gorgée !"
                : "Tu bois 1 gorgée 🥃"}
            </div>
          </div>
          <button onClick={next}
            style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
            CARTE SUIVANTE ➜
          </button>
        </div>
      )}

      {/* Phase: TIE (égalité / As ambigu) */}
      {phase === "tie" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"14px 24px", borderRadius:16, background:"#1a1030", border:"1px solid #3b1f6a" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#c084fc", letterSpacing:3 }}>🤝 ÉGALITÉ !</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>L'As vaut 1 et 14 — on repioche, personne ne boit</div>
          </div>
          <button onClick={next}
            style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6d28d9,#4c1d95)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
            REPIOCHE ➜
          </button>
        </div>
      )}

      {/* Phase: JOKER */}
      {phase === "joker" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"14px 24px", borderRadius:16, background:"#1a0a00", border:"1px solid #f59e0b44" }}>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#f59e0b", letterSpacing:3 }}>🎭 JOKER !</div>
            <div style={{ fontSize:14, fontWeight:700, color: jokerEffect === "drink" ? "#f87171" : "#4ade80", marginTop:8 }}>
              {jokerEffect === "drink" ? "💀 Tu bois 3 gorgées !" : "🎉 Tu distribues 3 gorgées !"}
            </div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Le destin a choisi pour toi</div>
          </div>
          <button onClick={() => { setDeckIndex(i => i + 1); setPhase("playing"); setNextCard(null) }}
            style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#0a0a14", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
            CARTE SUIVANTE ➜
          </button>
        </div>
      )}

      {/* Phase: FINISHED */}
      {phase === "finished" && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14, alignItems:"center" }}>
          <div style={{ textAlign:"center" as const, padding:"20px 24px", borderRadius:16, background:"#13131f", border:"1px solid #2a2a3e" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🃏</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#c084fc", letterSpacing:3 }}>PAQUET TERMINÉ !</div>
            <div style={{ fontSize:13, color:"#6b7280", marginTop:6 }}>
              Meilleur streak : <span style={{ color:"#f59e0b", fontWeight:700 }}>×{streak}</span>
            </div>
          </div>
          <button onClick={restart}
            style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontFamily:"'Bebas Neue',cursive", fontSize:17, letterSpacing:2 }}>
            🔄 NOUVEAU PAQUET
          </button>
          <button onClick={onClose}
            style={{ width:"100%", padding:"13px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"transparent", color:"#6b7280", fontFamily:"'Bebas Neue',cursive", fontSize:15, letterSpacing:2 }}>
            FERMER
          </button>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && phase !== "finished" && (
        <div style={{ width:"100%", maxWidth:360, marginTop:20, display:"flex", flexWrap:"wrap" as const, gap:6, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#4b5563", fontWeight:700, letterSpacing:1, textTransform:"uppercase" as const }}>Historique</span>
          {history.slice(-8).map((h, i) => (
            <div key={i} style={{ width:30, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:12, letterSpacing:1, background: h.correct ? "#052e16" : "#1c0505", border:`1px solid ${h.correct ? "#166534" : "#7f1d1d"}`, color: h.correct ? "#4ade80" : "#f87171" }}>
              {h.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
