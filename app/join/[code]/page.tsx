"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import AuthPage from "@/components/AuthPage"

export default function JoinPage() {
  const { code } = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [joined, setJoined] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!code) return
    supabase.from("groups").select("*").eq("join_code", code).single()
      .then(({ data }) => setGroup(data))
  }, [code])

  const joinGroup = async () => {
    if (!user || !group) return
    setJoining(true)
    // Check profile exists
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!profile?.pseudo) {
      router.push(`/?join=${code}`)
      return
    }
    // Check already member
    const { data: existing } = await supabase.from("group_members").select("id").eq("group_id", group.id).eq("user_id", user.id).single()
    if (existing) { router.push("/"); return }
    // Join
    const { error: e } = await supabase.from("group_members").insert({
      group_id: group.id, user_id: user.id,
      color: ["#a855f7","#ec4899","#38bdf8","#4ade80","#fb923c","#818cf8"][Math.floor(Math.random()*6)]
    })
    if (e) { setError(e.message); setJoining(false); return }
    setJoined(true)
    setTimeout(() => router.push("/"), 1500)
  }

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#c084fc",fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3 }}>DRUNKRACE...</div>
  if (!user) return <AuthPage redirectCode={code as string} />

  const S = { container: { minHeight:"100vh",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",padding:24 } }

  if (!group) return <div style={S.container}><div style={{ color:"#6b7280",fontFamily:"'Space Grotesk',sans-serif" }}>Groupe introuvable 😕</div></div>
  if (joined) return <div style={S.container}><div style={{ fontSize:48,marginBottom:16 }}>🎉</div><div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#4ade80",letterSpacing:2 }}>Tu as rejoint la course !</div></div>

  return (
    <div style={S.container}>
      <div style={{ textAlign:"center",maxWidth:360,width:"100%" }}>
        <div style={{ fontSize:56,marginBottom:16 }}>🏁</div>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8 }}>DRUNKRACE</h1>
        <p style={{ color:"#6b7280",fontSize:13,marginBottom:24 }}>Tu as été invité à rejoindre</p>
        <div style={{ background:"linear-gradient(135deg,#1a1030,#130d22)",border:"2px solid #a855f7",borderRadius:20,padding:"24px",marginBottom:24 }}>
          <div style={{ fontSize:32,marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:22,fontWeight:700,color:"#e2e8f0",fontFamily:"'Bebas Neue',cursive",letterSpacing:2,marginBottom:4 }}>{group.name}</div>
          <div style={{ fontSize:12,color:"#6b7280" }}>Créé par {group.creator_pseudo}</div>
        </div>
        {error && <div style={{ color:"#ef4444",fontSize:12,marginBottom:12 }}>{error}</div>}
        <button onClick={joinGroup} disabled={joining} style={{ width:"100%",padding:"16px",borderRadius:16,border:"none",cursor:joining?"not-allowed":"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:16,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
          {joining ? "Connexion…" : "🚀 Rejoindre la course !"}
        </button>
      </div>
    </div>
  )
}
