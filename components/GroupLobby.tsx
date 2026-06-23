"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import QRCode from "react-qr-code"
import FinishedRace from "./FinishedRace"

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase() }

export default function GroupLobby({ user, profile, onJoinGroup, onProfileUpdate }: any) {
  const [groups, setGroups] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [newGroup, setNewGroup] = useState<any>(null)
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedRace, setSelectedRace] = useState<any>(null)
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://drunkrace.vercel.app"

  useEffect(() => { loadGroups() }, [])

  const loadGroups = async () => {
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id)
    if (!memberships?.length) return
    const ids = memberships.map((m: any) => m.group_id)
    const { data } = await supabase.from("groups").select("*").in("id", ids).order("created_at", { ascending: false })
    setGroups(data || [])
  }

  const createGroup = async () => {
    if (!groupName.trim()) return
    setLoading(true); setError("")
    const code = generateCode()
    const { data, error: e } = await supabase.from("groups").insert({
      name: groupName.trim(), join_code: code,
      creator_id: user.id, creator_pseudo: profile.pseudo, status: "waiting"
    }).select().single()
    if (e) { setError(e.message); setLoading(false); return }
    await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, color: "#a855f7", is_creator: true })
    setNewGroup(data); setLoading(false)
  }

  const startRace = async () => {
    if (!newGroup) return
    await supabase.from("groups").update({ status: "active" }).eq("id", newGroup.id)
    onJoinGroup({ ...newGroup, status: "active" })
  }

  const joinByCode = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError("")
    const { data: grp } = await supabase.from("groups").select("*").eq("join_code", joinCode.toUpperCase()).single()
    if (!grp) { setError("Code invalide 😕"); setLoading(false); return }
    const { data: existing } = await supabase.from("group_members").select("id").eq("group_id", grp.id).eq("user_id", user.id).single()
    if (!existing) {
      const colors = ["#ec4899","#38bdf8","#4ade80","#fb923c","#818cf8","#34d399","#fbbf24","#f43f5e"]
      await supabase.from("group_members").insert({ group_id: grp.id, user_id: user.id, color: colors[Math.floor(Math.random()*colors.length)] })
    }
    if (grp.status === "active" || grp.status === "waiting") { onJoinGroup(grp); return }
    setError("Cette soirée est terminée 😔"); setLoading(false)
  }

  const logout = async () => { await supabase.auth.signOut() }

  const S: any = {
    card: { background:"#13131f",border:"1px solid #2a2a3e",borderRadius:16,padding:16,marginBottom:12 },
    input: { width:"100%",padding:"12px 14px",borderRadius:12,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10 },
    btn: (bg?: string, extra?: any) => ({ width:"100%",padding:"13px",borderRadius:13,border:"none",cursor:"pointer",background:bg||"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700, ...extra }),
  }

  if (selectedRace) return <FinishedRace race={selectedRace} onBack={() => setSelectedRace(null)}/>

  if (newGroup) {
    const joinUrl = `${appUrl}/join/${newGroup.join_code}`
    return (
      <div style={{ padding:"24px 16px",maxWidth:480,margin:"0 auto" }}>
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>DRUNKRACE</h1>
        </div>
        <div style={{ ...S.card,textAlign:"center" }}>
          <div style={{ fontSize:28,marginBottom:6 }}>🎉</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#e2e8f0",letterSpacing:2,marginBottom:4 }}>{newGroup.name}</div>
          <div style={{ fontSize:12,color:"#6b7280",marginBottom:18 }}>Partage le QR code à tes amis !</div>
          <div style={{ background:"#fff",borderRadius:16,padding:16,display:"inline-block",marginBottom:14 }}>
            <QRCode value={joinUrl} size={180}/>
          </div>
          <div style={{ background:"#1e1e2e",borderRadius:12,padding:"10px 16px",marginBottom:14 }}>
            <div style={{ fontSize:11,color:"#6b7280",marginBottom:2 }}>Code d'invitation</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#c084fc",letterSpacing:4 }}>{newGroup.join_code}</div>
          </div>
          <div style={{ fontSize:10,color:"#4b5563",marginBottom:18,wordBreak:"break-all" as const }}>{joinUrl}</div>
          <button onClick={startRace} style={S.btn()}>🏁 Lancer la course !</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:"24px 16px 40px",maxWidth:480,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>DRUNKRACE</h1>
          <p style={{ color:"#6b7280",fontSize:12,margin:0 }}>Salut {profile.avatar} {profile.pseudo} !</p>
        </div>
        <button onClick={logout} style={{ background:"#1e1e2e",border:"1px solid #2a2a3e",borderRadius:10,color:"#6b7280",fontSize:12,padding:"8px 12px",cursor:"pointer" }}>Déco</button>
      </div>

      {creating ? (
        <div style={S.card}>
          <div style={{ fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>Nom de la soirée</div>
          <input style={S.input} value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Ex: Soirée IUT 🎉" maxLength={40} onKeyDown={(e:any)=>e.key==="Enter"&&createGroup()}/>
          {error && <div style={{ color:"#ef4444",fontSize:12,marginBottom:8 }}>{error}</div>}
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setCreating(false)} style={{ ...S.btn("#1e1e2e",{border:"1px solid #2a2a3e",color:"#6b7280",flex:1}) }}>Annuler</button>
            <button onClick={createGroup} disabled={loading} style={{ ...S.btn(),flex:2 }}>{loading?"Création…":"Créer 🎉"}</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setCreating(true)} style={{ ...S.btn(),marginBottom:12 }}>🎉 Créer une soirée</button>
      )}

      <div style={S.card}>
        <div style={{ fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:8 }}>Rejoindre avec un code</div>
        <input style={S.input} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}/>
        {error && !creating && <div style={{ color:"#ef4444",fontSize:12,marginBottom:8 }}>{error}</div>}
        <button onClick={joinByCode} disabled={loading} style={S.btn("#1f2937")}>🚀 Rejoindre la course</button>
      </div>

      {groups.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>Mes soirées</div>
          {groups.map((g:any)=>(
            <div key={g.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #1e1e2e" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{g.name}</div>
                <div style={{ fontSize:10,color:g.status==="active"?"#4ade80":g.status==="waiting"?"#fbbf24":"#6b7280" }}>
                  {g.status==="active"?"🟢 En cours":g.status==="waiting"?"⏳ En attente":"⚫ Terminé"}
                </div>
              </div>
              {(g.status==="active"||g.status==="waiting") ? (
                <button onClick={()=>onJoinGroup(g)} style={{ background:"#166534",border:"none",borderRadius:8,color:"#4ade80",fontSize:11,padding:"6px 12px",cursor:"pointer",fontWeight:600 }}>
                  {g.status==="active"?"Rejoindre":"Attente"}
                </button>
              ) : (
                <button onClick={()=>setSelectedRace(g)} style={{ background:"#1e1e2e",border:"1px solid #2a2a3e",borderRadius:8,color:"#9ca3af",fontSize:11,padding:"6px 12px",cursor:"pointer" }}>
                  Voir 📊
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
