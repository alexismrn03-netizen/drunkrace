"use client"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase"

export default function PhotoTab({ groupId, userId }: { groupId: string, userId: string }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadPhotos() }, [])

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("group_photos")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
    setPhotos(data || [])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  const uploadPhoto = async () => {
    if (!preview) return
    setUploading(true); setError("")
    try {
      const res = await fetch(preview)
      const blob = await res.blob()
      const filename = `${groupId}/${Date.now()}_${userId}.jpg`

      // Upload to storage
      const { error: upErr } = await supabase.storage
        .from("party-photos")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: false })
      if (upErr) throw new Error("Storage: " + upErr.message)

      // Get public URL
      const { data: urlData } = supabase.storage.from("party-photos").getPublicUrl(filename)

      // Insert in DB
      const { error: dbErr } = await supabase.from("group_photos").insert({
        group_id: groupId,
        user_id: userId,
        url: urlData.publicUrl,
        filename
      })
      if (dbErr) throw new Error("DB: " + dbErr.message)

      setPreview(null)
      loadPhotos()
    } catch (e: any) {
      setError(e.message)
    }
    setUploading(false)
  }

  const downloadPhoto = (url: string) => {
    window.open(url, "_blank")
  }

  if (preview) return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,color:"#c084fc",margin:"0 0 16px" }}>Aperçu 📸</h2>
      <img src={preview} style={{ width:"100%",borderRadius:16,marginBottom:16,border:"1px solid #2a2a3e",display:"block" }} alt="preview"/>
      {error && <div style={{ color:"#ef4444",fontSize:12,marginBottom:12,padding:"8px 12px",background:"#1c0505",borderRadius:8 }}>{error}</div>}
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={()=>{setPreview(null);setError("")}} style={{ flex:1,padding:"13px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:14,fontWeight:700 }}>
          🗑 Reprendre
        </button>
        <button onClick={uploadPhoto} disabled={uploading} style={{ flex:2,padding:"13px",borderRadius:13,border:"none",cursor:uploading?"not-allowed":"pointer",background:uploading?"#2a2a3e":"linear-gradient(135deg,#a855f7,#ec4899)",color:uploading?"#6b7280":"#fff",fontSize:14,fontWeight:700 }}>
          {uploading?"⏳ Upload…":"✅ Partager à la soirée"}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,color:"#c084fc",margin:0 }}>Photos 📸</h2>
        <span style={{ color:"#6b7280",fontSize:12 }}>{photos.length} photo{photos.length!==1?"s":""}</span>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileChange}/>

      {/* Action buttons */}
      <div style={{ display:"flex",gap:10,marginBottom:20 }}>
        <button onClick={()=>{ if(fileRef.current){ fileRef.current.accept="image/*"; fileRef.current.removeAttribute("capture"); fileRef.current.click() }}}
          style={{ flex:1,padding:"14px",borderRadius:14,border:"1px solid #2a2a3e",cursor:"pointer",background:"#13131f",color:"#9ca3af",fontSize:14,fontWeight:700 }}>
          🖼 Galerie
        </button>
        <button onClick={()=>{ if(fileRef.current){ fileRef.current.accept="image/*"; fileRef.current.setAttribute("capture","environment"); fileRef.current.click() }}}
          style={{ flex:1,padding:"14px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700 }}>
          📷 Caméra
        </button>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign:"center",padding:"40px 0",color:"#4b5563" }}>
          <div style={{ fontSize:48,marginBottom:12 }}>📷</div>
          <div style={{ fontSize:13 }}>Aucune photo pour l'instant</div>
          <div style={{ fontSize:11,marginTop:4 }}>Sois le premier à immortaliser la soirée !</div>
        </div>
      ) : (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          {photos.map((p:any)=>(
            <div key={p.id} style={{ position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #2a2a3e",aspectRatio:"1" }}>
              <img src={p.url} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} alt="photo soirée"/>
              <button onClick={()=>downloadPhoto(p.url)}
                style={{ position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.75)",border:"none",borderRadius:8,color:"#fff",fontSize:16,padding:"4px 8px",cursor:"pointer" }}>
                ⬇️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
