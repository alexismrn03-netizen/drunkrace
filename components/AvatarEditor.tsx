"use client"
import { useState } from "react"
import DrunkAvatar, { type AvatarConfig, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, DEFAULT_AVATAR } from "./DrunkAvatar"

const HAIR_STYLE_LABELS = ["Court","Long","Afro","Mohawk","Queue","Chignon","Chauve ✨"]
const OUTFIT_LABELS     = ["Casual","Smoking 🎩","Maillot 🏖️","Cap. Morgan 🍺","Pyjama 😴","Sportif ⚡","F1 🏎️"]
const ACCESSORY_LABELS  = ["Aucun","Lunettes soleil","Lunettes rondes","Chapeau 🎉","Couronne 👑","Chapeau pirate ☠️","Casque F1 🏎️","Palmes 🤿"]

interface Props {
  initial: AvatarConfig
  onSave: (cfg: AvatarConfig) => void
  onClose: () => void
}

export default function AvatarEditor({ initial, onSave, onClose }: Props) {
  const [cfg, setCfg] = useState<AvatarConfig>({ ...DEFAULT_AVATAR, ...initial })
  const set = (k: keyof AvatarConfig, v: any) => setCfg(prev => ({ ...prev, [k]: v }))

  const Section = ({ label, children }: any) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:1.5,textTransform:"uppercase" as const,marginBottom:8 }}>{label}</div>
      {children}
    </div>
  )

  const ColorRow = ({ colors, selected, onSelect }: { colors:string[], selected:number, onSelect:(i:number)=>void }) => (
    <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
      {colors.map((c,i) => (
        <button key={i} onClick={()=>onSelect(i)} style={{ width:32,height:32,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:selected===i?"3px solid #c084fc":"2px solid transparent",outlineOffset:2,transition:"all .15s" }}/>
      ))}
    </div>
  )

  const ChipRow = ({ options, selected, onSelect }: { options:string[], selected:number, onSelect:(i:number)=>void }) => (
    <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
      {options.map((o,i) => (
        <button key={i} onClick={()=>onSelect(i)} style={{ padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",background:selected===i?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e",color:selected===i?"#fff":"#6b7280",fontSize:11,fontWeight:selected===i?700:400,whiteSpace:"nowrap" as const,transition:"all .15s" }}>
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:400,overflowY:"auto",padding:"20px 16px 40px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>
          Personnaliser
        </h2>
        <button onClick={onClose} style={{ background:"none",border:"none",color:"#6b7280",fontSize:22,cursor:"pointer",padding:4 }}>✕</button>
      </div>

      {/* Preview */}
      <div style={{ display:"flex",justifyContent:"center",marginBottom:24,padding:"20px 0",background:"#13131f",borderRadius:20,border:"1px solid #2a2a3e" }}>
        <DrunkAvatar config={cfg} bac={0} size={110} animate={false}/>
      </div>

      <div style={{ background:"#13131f",borderRadius:16,padding:16,border:"1px solid #2a2a3e",marginBottom:12 }}>
        <Section label="Sexe">
          <div style={{ display:"flex",gap:10 }}>
            {(["M","F"] as const).map(s=>(
              <button key={s} onClick={()=>set("sex",s)} style={{ flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:cfg.sex===s?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:cfg.sex===s?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:13,fontWeight:cfg.sex===s?700:400 }}>
                {s==="M"?"👨 Homme":"👩 Femme"}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Couleur de peau">
          <ColorRow colors={SKIN_TONES} selected={cfg.skinTone} onSelect={i=>set("skinTone",i)}/>
        </Section>

        <Section label="Couleur de cheveux">
          <ColorRow colors={HAIR_COLORS} selected={cfg.hairColor} onSelect={i=>set("hairColor",i)}/>
        </Section>

        <Section label="Coupe de cheveux">
          <ChipRow options={HAIR_STYLE_LABELS} selected={cfg.hairStyle} onSelect={i=>set("hairStyle",i)}/>
        </Section>

        <Section label="Tenue">
          <ChipRow options={OUTFIT_LABELS} selected={cfg.outfit} onSelect={i=>set("outfit",i)}/>
        </Section>

        <Section label="Couleur tenue">
          <ColorRow colors={OUTFIT_COLORS} selected={cfg.outfitColor} onSelect={i=>set("outfitColor",i)}/>
        </Section>

        <Section label="Accessoire">
          <ChipRow options={ACCESSORY_LABELS} selected={cfg.accessory} onSelect={i=>set("accessory",i)}/>
        </Section>
      </div>

      <button onClick={()=>{ onSave(cfg); onClose() }} style={{ width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
        ✅ Sauvegarder mon avatar
      </button>
    </div>
  )
}
