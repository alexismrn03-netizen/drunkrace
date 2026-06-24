"use client"
import { useState } from "react"
import DrunkAvatar, { AvatarConfig, DEFAULT_AVATAR, F1_TEAMS, HELMET_COLORS, VISOR_COLORS } from "./DrunkAvatar"

interface Props {
  initial: AvatarConfig
  onSave: (cfg: AvatarConfig) => void
  onClose: () => void
}

export default function AvatarEditor({ initial, onSave, onClose }: Props) {
  const [cfg, setCfg] = useState<AvatarConfig>(initial || DEFAULT_AVATAR)
  const set = (k: keyof AvatarConfig, v: number) => setCfg(c => ({ ...c, [k]: v }))

  return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a14", zIndex:500, overflowY:"auto", padding:"20px 16px 60px" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, color:"#e10600", margin:0 }}>
          🏎️ MON AVATAR F1
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      {/* Preview */}
      <div style={{ background:"#13131f", borderRadius:20, padding:"24px 0 8px", marginBottom:20, display:"flex", flexDirection:"column" as const, alignItems:"center", border:"1px solid #2a2a3e" }}>
        <DrunkAvatar config={cfg} size={120} animate={false}/>
        <div style={{ marginTop:8, fontSize:12, color:"#c084fc", fontWeight:700, letterSpacing:1 }}>
          {F1_TEAMS[cfg.teamIndex % F1_TEAMS.length].name}
        </div>
      </div>

      {/* ECURIE */}
      <Section title="🏁 Écurie">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {F1_TEAMS.map((t, i) => (
            <button key={i} onClick={() => set("teamIndex", i)}
              style={{
                padding:"10px 12px", borderRadius:12, border:"none", cursor:"pointer",
                background: cfg.teamIndex === i ? `${t.primary}33` : "#1e1e2e",
                outline: cfg.teamIndex === i ? `2px solid ${t.primary}` : "2px solid transparent",
                display:"flex", alignItems:"center", gap:8, textAlign:"left" as const,
              }}>
              <div style={{ width:18, height:18, borderRadius:4, background:`linear-gradient(135deg,${t.primary},${t.secondary})`, flexShrink:0 }}/>
              <span style={{ fontSize:12, fontWeight:cfg.teamIndex===i?700:400, color:cfg.teamIndex===i?t.primary:"#9ca3af" }}>
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* CASQUE */}
      <Section title="🪖 Couleur casque">
        <div style={{ display:"flex", flexWrap:"wrap" as const, gap:10 }}>
          {HELMET_COLORS.map((h, i) => (
            <button key={i} onClick={() => set("helmetColor", i)}
              style={{
                width:36, height:36, borderRadius:10, border:"none", cursor:"pointer",
                background: h.color,
                outline: cfg.helmetColor === i ? `3px solid white` : `3px solid transparent`,
                boxShadow: cfg.helmetColor === i ? `0 0 12px ${h.color}` : "none",
              }}
              title={h.name}
            />
          ))}
        </div>
        <div style={{ fontSize:11, color:"#6b7280", marginTop:8 }}>
          Casque sélectionné : <span style={{ color:HELMET_COLORS[cfg.helmetColor].color, fontWeight:700 }}>{HELMET_COLORS[cfg.helmetColor].name}</span>
        </div>
      </Section>

      {/* VISIÈRE */}
      <Section title="👓 Couleur visière">
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" as const }}>
          {VISOR_COLORS.map((v, i) => (
            <button key={i} onClick={() => set("visorColor", i)}
              style={{
                padding:"6px 14px", borderRadius:10, border:"none", cursor:"pointer",
                background: cfg.visorColor === i ? v.color + "33" : "#1e1e2e",
                outline: cfg.visorColor === i ? `2px solid ${v.color === '#0a0a0a' ? '#fff' : v.color}` : "2px solid transparent",
                color: cfg.visorColor === i ? (v.color === '#0a0a0a' ? '#fff' : v.color) : "#6b7280",
                fontSize:11, fontWeight:cfg.visorColor===i?700:400,
              }}>
              {v.name}
            </button>
          ))}
        </div>
      </Section>

      {/* Save */}
      <button onClick={() => onSave(cfg)}
        style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#e10600,#b30000)", color:"#fff", fontSize:16, fontWeight:700, marginTop:8 }}>
        🏁 Sauvegarder mon pilote !
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
