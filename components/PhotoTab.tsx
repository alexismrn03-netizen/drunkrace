"use client"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase"

export default function PhotoTab({ groupId, userId }: { groupId: string, userId: string }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setCapturing(true)
    } catch {
      // Fallback to file picker
      fileRef.current?.click()
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCapturing(false)
    setPreview(null)
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext("2d")!.drawImage(v, 0, 0)
    setPreview(c.toDataURL("image/jpeg", 0.8))
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const uploadPhoto = async (dataUrl: string) => {
    setUploading(true)
    try {
      // Convert base64 to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const filename = `${groupId}/${Date.now()}_${userId}.jpg`
      const { error: upErr } = await supabase.storage.from("party-photos").upload(filename, blob, { contentType: "image/jpeg", upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from("party-photos").getPublicUrl(filename)
      await supabase.from("group_photos").insert({ group_id: groupId, user_id: userId, url: urlData.publicUrl, filename })
      setPreview(null); setCapturing(false); loadPhotos()
    } catch (e: any) {
      alert("Erreur upload : " + e.message)
    }
    setUploading(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const downloadPhoto = (url: string, name: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click()
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  // Preview mode
  if (preview) return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,color:"#c084fc",margin:"0 0 16px" }}>Aperçu 📸</h2>
      <img src={preview} style={{ width:"100%",borderRadius:16,marginBottom:16,border:"1px solid #2a2a3e" }} alt="preview"/>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={() => { setPreview(null); setCapturing(false) }} style={{ flex:1,padding:"13px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:14,fontWeight:700 }}>
          🗑 Reprendre
        </button>
        <button onClick={() => uploadPhoto(preview)} disabled={uploading} style={{ flex:2,padding:"13px",borderRadius:13,border:"none",cursor:uploading?"not-allowed":"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700 }}>
          {uploading ? "⏳ Upload…" : "✅ Partager à la soirée"}
        </button>
      </div>
    </div>
  )

  // Camera mode
  if (capturing) return (
    <div style={{ padding:"16px 16px 100px" }}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,color:"#c084fc",margin:"0 0 16px" }}>Appareil photo 📷</h2>
      <div style={{ position:"relative",borderRadius:16,overflow:"hidden",marginBottom:16,background:"#000" }}>
        <video ref={videoRef} playsInline muted style={{ width:"100%",display:"block",borderRadius:16 }}/>
        <canvas ref={canvasRef} style={{ display:"none" }}/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={stopCamera} style={{ flex:1,padding:"13px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:14,fontWeight:700 }}>Annuler</button>
        <button onClick={takePhoto} style={{ flex:2,padding:"13px",borderRadius:13,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:22 }}>📸</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding:"16px 16px 100px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,color:"#c084fc",margin:0 }}>Photos 📸</h2>
        <span style={{ color:"#6b7280",fontSize:12 }}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleFileChange}/>

      <div style={{ display:"flex",gap:10,marginBottom:20 }}>
        <button onClick={startCamera} style={{ flex:1,padding:"14px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700 }}>
          📷 Prendre une photo
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ flex:1,padding:"14px",borderRadius:14,border:"1px solid #2a2a3e",cursor:"pointer",background:"#13131f",color:"#9ca3af",fontSize:14,fontWeight:700 }}>
          🖼 Galerie
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
          {photos.map((p: any) => (
            <div key={p.id} style={{ position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #2a2a3e" }}>
              <img src={p.url} style={{ width:"100%",aspectRatio:"1",objectFit:"cover",display:"block" }} alt="photo soirée"/>
              <button onClick={() => downloadPhoto(p.url, `drunkrace_${p.id}.jpg`)}
                style={{ position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.7)",border:"none",borderRadius:8,color:"#fff",fontSize:16,padding:"4px 8px",cursor:"pointer" }}>
                ⬇️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
