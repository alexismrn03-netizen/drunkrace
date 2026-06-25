"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import DrunkAvatar, { type AvatarConfig, DEFAULT_AVATAR } from "@/components/DrunkAvatar"
import AvatarEditor from "@/components/AvatarEditor"

const S = {
  wrap: { minHeight:"100vh",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:24 },
  input: { width:"100%",padding:"12px 14px",borderRadius:12,background:"var(--border)",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:14,fontFamily:"'Space Grotesk',sans-serif",outline:"none",boxSizing:"border-box" as const,marginBottom:12 },
  label: { display:"block",fontSize:11,color:"#9ca3af",marginBottom:6,fontWeight:700 as const,letterSpacing:1,textTransform:"uppercase" as const },
  btn: { width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" },
}

export default function ProfileSetup({ user, onDone }: { user: any, onDone: () => void }) {
  const [pseudo, setPseudo] = useState("")
  const [weight, setWeight] = useState("70")
  const [sex, setSex] = useState("M")
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [editAvatar, setEditAvatar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const save = async () => {
    if (!pseudo.trim()) { setError("Entre un pseudo !"); return }
    setLoading(true)
    const { error: e } = await supabase.from("profiles").upsert({
      id: user.id, email: user.email, pseudo: pseudo.trim(),
      weight_kg: parseInt(weight) || 70, sex, avatar_config: avatarCfg,
      updated_at: new Date().toISOString()
    })
    if (e) { setError(e.message); setLoading(false); return }
    onDone()
  }

  return (
    <div style={S.wrap}>
      <div style={{ textAlign:"center",marginBottom:28 }}>
        <DrunkAvatar config={avatarCfg} bac={0} size={90} animate={false}/>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>
          Créer mon profil
        </h1>
        <p style={{ color:"#4b5563",fontSize:12,marginTop:4 }}>Pour calculer ton alcoolémie précisément</p>
      </div>

      <div style={{ width:"100%",maxWidth:360 }}>
        {/* Avatar */}
        {editAvatar && <AvatarEditor initial={avatarCfg} onSave={setAvatarCfg} onClose={()=>setEditAvatar(false)}/>}
        <div style={{ background:"var(--bg-card)",border:"1px solid #2a2a3e",borderRadius:16,padding:14,marginBottom:12,textAlign:"center" as const }}>
          <label style={S.label}>Avatar</label>
          <DrunkAvatar config={avatarCfg} bac={0} size={80} animate={false}/>
          <br/>
          <button onClick={()=>setEditAvatar(true)} style={{ background:"var(--border)",border:"1px solid #3b1f6a",borderRadius:12,padding:"8px 20px",color:"var(--accent)",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:8 }}>
            🎨 Personnaliser
          </button>
        </div>

        <div style={{ background:"var(--bg-card)",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:12 }}>
          <label style={S.label}>Pseudo</label>
          <input style={S.input} value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="Ton surnom de soirée" maxLength={20} />

          <label style={S.label}>Poids (kg)</label>
          <input style={S.input} type="number" value={weight} onChange={e=>setWeight(e.target.value)} min={40} max={200} />

          <label style={S.label}>Sexe biologique</label>
          <div style={{ display:"flex",gap:8 }}>
            {[{v:"M",l:"👨 Homme"},{v:"F",l:"👩 Femme"}].map(s=>(
              <button key={s.v} onClick={()=>setSex(s.v)} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:sex===s.v?"linear-gradient(135deg,#a855f720,#ec489920)":"var(--border)",outline:sex===s.v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:13,fontFamily:"'Space Grotesk',sans-serif",fontWeight:sex===s.v?700:400 }}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ color:"#ef4444",fontSize:12,textAlign:"center",marginBottom:8 }}>{error}</div>}
        <button style={S.btn} onClick={save} disabled={loading}>
          {loading ? "Sauvegarde…" : "C'est parti ! 🚀"}
        </button>
        <p style={{ color:"#374151",fontSize:11,textAlign:"center",marginTop:10 }}>Ces infos servent uniquement au calcul d'alcoolémie</p>
      </div>
    </div>
  )
}
