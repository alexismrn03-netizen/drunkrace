"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"

const S = {
  wrap: { minHeight:"100vh",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:24 },
  card: { background:"#13131f",border:"1px solid #2a2a3e",borderRadius:20,padding:28,width:"100%",maxWidth:360 },
  input: { width:"100%",padding:"12px 14px",borderRadius:12,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:14,fontFamily:"'Space Grotesk',sans-serif",outline:"none",boxSizing:"border-box" as const,marginBottom:12 },
  btn: { width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",marginTop:4 },
  label: { display:"block",fontSize:11,color:"#9ca3af",marginBottom:6,fontWeight:600,letterSpacing:1,textTransform:"uppercase" as const },
  err: { color:"#ef4444",fontSize:12,marginTop:8,textAlign:"center" as const },
  switch: { color:"#a855f7",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"'Space Grotesk',sans-serif",textDecoration:"underline",marginTop:16,display:"block",width:"100%",textAlign:"center" as const },
}

export default function AuthPage({ redirectCode }: { redirectCode?: string }) {
  const [mode, setMode] = useState<"login"|"register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = createClient()

  const handle = async () => {
    setLoading(true); setError(""); setSuccess("")
    if (mode === "register") {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) setError(e.message)
      else setSuccess("Vérifie ton email pour confirmer ton compte !")
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) setError("Email ou mot de passe incorrect")
    }
    setLoading(false)
  }

  return (
    <div style={S.wrap}>
      <div style={{ textAlign:"center",marginBottom:32 }}>
        <div style={{ fontSize:56,marginBottom:12 }}>🏁</div>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:4,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>DRUNKRACE</h1>
        <p style={{ color:"#4b5563",fontSize:13,marginTop:6 }}>La course de soirée entre amis 🍺</p>
      </div>
      <div style={S.card}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#c084fc",marginBottom:20 }}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h2>
        <label style={S.label}>Email</label>
        <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" />
        <label style={S.label}>Mot de passe</label>
        <input style={S.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} />
        {error && <div style={S.err}>{error}</div>}
        {success && <div style={{ ...S.err, color:"#4ade80" }}>{success}</div>}
        <button style={S.btn} onClick={handle} disabled={loading}>
          {loading ? "…" : mode==="login" ? "Se connecter" : "Créer mon compte"}
        </button>
        <button style={S.switch} onClick={()=>{setMode(m=>m==="login"?"register":"login");setError("")}}>
          {mode==="login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  )
}
