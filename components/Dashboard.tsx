"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import ProfileSetup from "./ProfileSetup"
import GroupLobby from "./GroupLobby"
import RaceApp from "./RaceApp"

export default function Dashboard({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null)
  const [activeGroup, setActiveGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    setProfile(data)
  }

  const loadActiveGroup = async () => {
    // Find group where user is member and group is active
    const { data } = await supabase
      .from("group_members")
      .select("group_id, groups(*)")
      .eq("user_id", user.id)
      .eq("groups.status", "active")
      .not("groups", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (data?.groups) setActiveGroup(data.groups)
  }

  useEffect(() => {
    Promise.all([loadProfile(), loadActiveGroup()]).then(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh" }}>
      <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,color:"#c084fc" }}>CHARGEMENT…</div>
    </div>
  )

  if (!profile?.pseudo) return <ProfileSetup user={user} onDone={loadProfile} />
  if (activeGroup) return <RaceApp user={user} profile={profile} group={activeGroup} onLeave={()=>setActiveGroup(null)} onProfileUpdate={loadProfile} />
  return <GroupLobby user={user} profile={profile} onJoinGroup={setActiveGroup} onProfileUpdate={loadProfile} />
}
