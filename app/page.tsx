"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import AuthPage from "@/components/AuthPage"
import Dashboard from "@/components/Dashboard"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:16 }}>
      <div style={{ fontSize:48 }}>🏁</div>
      <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:4,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DRUNKRACE</div>
    </div>
  )

  if (!user) return <AuthPage />
  return <Dashboard user={user} />
}
