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
    // Get all groups the user is a member of
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)

    if (!memberships || memberships.length === 0) return

    const groupIds = memberships.map((m: any) => m.group_id)

    // Find active group among those
    const { data: groups } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)

    if (groups && groups.length > 0) setActiveGroup(groups[0])
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
