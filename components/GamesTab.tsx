"use client"
import { useState } from "react"
import DuelGame from "./DuelGame"
import MarbleRace from "./MarbleRace"
import RPSGame from "./RPSGame"
import DiceGame from "./DiceGame"
import WheelGame from "./WheelGame"

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  onAwardDistance: (userId: string, delta: number) => void
  onAwardDrink: (userId: string, delta: number, drink?: any) => void
}

const GAMES = [
  {
    id: "duel",
    emoji: "🏎️",
    name: "Duel de Shots",
    desc: "Qui boit le plus vite ?",
    color: "#c084fc",
    border: "#3b1f6a",
    bg: "#1a1030",
  },
  {
    id: "rps",
    emoji: "🤜",
    name: "Pierre Feuille Ciseaux",
    desc: "1 manche, le perdant boit",
    color: "#60a5fa",
    border: "#1e3a8a",
    bg: "#0c1a3a",
  },
  {
    id: "dice",
    emoji: "🎲",
    name: "Jeu du Dé",
    desc: "Le plus petit score boit",
    color: "#fbbf24",
    border: "#78350f",
    bg: "#1a0a00",
  },
  {
    id: "wheel",
    emoji: "🎰",
    name: "Roue des Défis",
    desc: "Tourne et accepte ton destin",
    color: "#ec4899",
    border: "#831843",
    bg: "#1a0516",
  },
  {
    id: "marble",
    emoji: "🔮",
    name: "Course de Billes",
    desc: "Le gagnant distribue 10 gorgées",
    color: "#f59e0b",
    border: "#78350f",
    bg: "#1a0c00",
  },
]

export default function GamesTab({ members, myUserId, groupId, onAwardDistance, onAwardDrink }: Props) {
  const [activeGame, setActiveGame] = useState<string | null>(null)

  if (activeGame === "duel") return (
    <DuelGame
      members={members}
      onAwardDistance={onAwardDrink}
      onClose={() => setActiveGame(null)}
    />
  )
  if (activeGame === "rps") return (
    <RPSGame
      members={members}
      myUserId={myUserId}
      groupId={groupId}
      onAwardDistance={onAwardDistance}
      onClose={() => setActiveGame(null)}
    />
  )
  if (activeGame === "dice") return (
    <DiceGame
      members={members}
      myUserId={myUserId}
      groupId={groupId}
      onAwardDistance={onAwardDistance}
      onClose={() => setActiveGame(null)}
    />
  )
  if (activeGame === "marble") return (
    <MarbleRace
      members={members}
      onClose={() => setActiveGame(null)}
    />
  )

  if (activeGame === "wheel") return (
    <WheelGame
      members={members}
      myUserId={myUserId}
      onAwardDistance={onAwardDistance}
      onClose={() => setActiveGame(null)}
    />
  )

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:"0 0 6px" }}>
        Mini-Jeux
      </h2>
      <p style={{ color:"#4b5563", fontSize:11, margin:"0 0 20px" }}>
        Choisis un jeu et pimente la soirée 🎮
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            style={{
              padding:"20px 14px",
              borderRadius:18,
              border:`1px solid ${g.border}`,
              cursor:"pointer",
              background:`linear-gradient(135deg,${g.bg},${g.bg}cc)`,
              display:"flex",
              flexDirection:"column" as const,
              alignItems:"flex-start",
              gap:8,
              textAlign:"left" as const,
              transition:"all .15s",
            }}
            onTouchStart={e => (e.currentTarget.style.transform = "scale(0.96)")}
            onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ fontSize:36 }}>{g.emoji}</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:g.color, letterSpacing:1.5, marginBottom:3 }}>
                {g.name}
              </div>
              <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.4 }}>
                {g.desc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Rules reminder */}
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginTop:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>
          Rappel des règles
        </div>
        {[
          { emoji:"🏎️", rule:"Duel : timer auto au GO, le plus rapide gagne +distance boisson +10m" },
          { emoji:"🤜", rule:"PFC : 1 manche, gagnant +8m, perdant −3m et boit un shot" },
          { emoji:"🎲", rule:"Dé : tour par tour, le plus petit score boit et perd −5m" },
          { emoji:"🎰", rule:"Roue : défi aléatoire, case ☠️ rare = −50m !" },
        ].map((r, i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:i < 3 ? 8 : 0 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{r.emoji}</span>
            <span style={{ fontSize:11, color:"#9ca3af", lineHeight:1.5 }}>{r.rule}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
