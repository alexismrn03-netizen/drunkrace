"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"

interface BeDrunkEvent {
  id: string
  group_id: string
  triggered_at: string
  expires_at: string
  status: string
}

interface BeDrunkPhoto {
  id: string
  event_id: string
  user_id: string
  photo_url: string
  taken_at: string
  late: boolean
  pseudo?: string
}

interface Props {
  groupId: string
  myUserId: string
  myPseudo: string
  members: any[]
  isCreator: boolean
}

// ── CAMERA COMPONENT ─────────────────────────────────────────────────────
function Camera({ onCapture, onCancel, secondsLeft }: {
  onCapture: (blob: Blob) => void
  onCancel: () => void
  secondsLeft: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user"|"environment">("user")
  const [preview, setPreview] = useState<string|null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob|null>(null)
  const [ready, setReady] = useState(false)
  const urgent = secondsLeft < 30

  const startCamera = useCallback(async (mode: "user"|"environment") => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setReady(true)
      }
    } catch(e) { console.error("Camera error", e) }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [facingMode])

  const capture = () => {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas) return
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext("2d")!
    const ox = (video.videoWidth - size) / 2, oy = (video.videoHeight - size) / 2
    if (facingMode === "user") {
      ctx.save(); ctx.translate(size, 0); ctx.scale(-1, 1)
      ctx.drawImage(video, ox, oy, size, size, 0, 0, size, size)
      ctx.restore()
    } else {
      ctx.drawImage(video, ox, oy, size, size, 0, 0, size, size)
    }
    canvas.toBlob(blob => {
      if (!blob) return
      setPreviewBlob(blob)
      setPreview(URL.createObjectURL(blob))
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, "image/jpeg", 0.85)
  }

  const redo = () => {
    setPreview(null); setPreviewBlob(null); startCamera(facingMode)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timerStr = `${mins}:${secs.toString().padStart(2,"0")}`

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:600,
      display:"flex", flexDirection:"column" as const }}>
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      {/* Top bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"12px 16px", background:"rgba(0,0,0,0.5)" }}>
        <button onClick={onCancel}
          style={{ background:"none", border:"none", color:"white", fontSize:14, cursor:"pointer" }}>
          Annuler
        </button>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:3,
          color: urgent ? "#ef4444" : "#fbbf24",
          textShadow: urgent ? "0 0 20px #ef4444" : "0 0 10px #fbbf24",
          animation: urgent ? "pulse 0.5s infinite" : "none" }}>
          {timerStr}
        </div>
        <button onClick={() => setFacingMode(f => f==="user"?"environment":"user")}
          style={{ background:"none", border:"none", color:"white", fontSize:24, cursor:"pointer" }}>
          🔄
        </button>
      </div>

      {/* Camera / Preview */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"0 16px" }}>
        {preview ? (
          <img src={preview} style={{ width:"100%", maxWidth:400, aspectRatio:"1",
            borderRadius:20, objectFit:"cover" }} alt="preview"/>
        ) : (
          <video ref={videoRef} playsInline muted
            style={{ width:"100%", maxWidth:400, aspectRatio:"1", borderRadius:20,
              objectFit:"cover",
              transform: facingMode==="user" ? "scaleX(-1)" : "none" }}/>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{ padding:"20px 32px 40px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        {preview ? <>
          <button onClick={redo}
            style={{ background:"#1e1e2e", border:"1px solid #2a2a3e", color:"white",
              padding:"12px 20px", borderRadius:12, fontSize:14, cursor:"pointer", fontWeight:700 }}>
            ↩ Refaire
          </button>
          <button onClick={() => previewBlob && onCapture(previewBlob)}
            style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none",
              color:"white", padding:"14px 28px", borderRadius:12, fontSize:15,
              cursor:"pointer", fontWeight:700 }}>
            Poster 🍺
          </button>
        </> : <>
          <div style={{ width:52 }}/>
          <button onClick={capture} disabled={!ready}
            style={{ width:72, height:72, borderRadius:"50%",
              background: urgent
                ? "radial-gradient(circle,#ef4444,#b91c1c)"
                : "radial-gradient(circle,#fff,#ddd)",
              border: `4px solid ${urgent?"#ef4444":"#fff"}`,
              boxShadow: urgent
                ? "0 0 0 6px rgba(239,68,68,0.3), 0 0 30px #ef4444"
                : "0 0 0 6px rgba(255,255,255,0.2)",
              cursor:"pointer", transition:"all .2s" }}/>
          <div style={{ width:52 }}/>
        </>}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}

// ── BEDRUNK ALERT ────────────────────────────────────────────────────────
function BeDrunkAlert({ secondsLeft, onOpenCamera }: {
  secondsLeft: number
  onOpenCamera: () => void
}) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)",
      zIndex:550, display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ fontSize:80, marginBottom:8 }}>📸</div>
      <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:52, letterSpacing:4,
        background:"linear-gradient(135deg,#ef4444,#f59e0b)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        marginBottom:8 }}>BEDRUNK !</div>
      <div style={{ fontSize:14, color:"#9ca3af", marginBottom:32, textAlign:"center" as const }}>
        Prends ta photo maintenant !
      </div>
      <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:56, letterSpacing:4,
        color:"#fbbf24", textShadow:"0 0 20px #fbbf24", marginBottom:32 }}>
        {mins}:{secs.toString().padStart(2,"0")}
      </div>
      <button onClick={onOpenCamera}
        style={{ background:"linear-gradient(135deg,#ef4444,#b91c1c)", border:"none",
          color:"#fff", padding:"16px 32px", borderRadius:16, fontSize:18,
          fontWeight:700, cursor:"pointer", width:"100%", maxWidth:300 }}>
        📷 Ouvrir l'appareil photo
      </button>
      <div style={{ marginTop:16, fontSize:11, color:"#4b5563", textAlign:"center" as const, maxWidth:260 }}>
        Les photos des autres sont floues jusqu'à ce que tu postes la tienne
      </div>
    </div>
  )
}

// ── PHOTOS GRID ───────────────────────────────────────────────────────────
export function BeDrunkGallery({ groupId, myUserId }: { groupId:string; myUserId:string }) {
  const [events, setEvents] = useState<BeDrunkEvent[]>([])
  const [photos, setPhotos] = useState<Record<string, BeDrunkPhoto[]>>({})
  const [myPosted, setMyPosted] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: evts } = await supabase
        .from("bedrunk_events").select("*")
        .eq("group_id", groupId).order("triggered_at", { ascending: false })
      if (!evts) return
      setEvents(evts)

      for (const ev of evts) {
        const { data: phs } = await supabase
          .from("bedrunk_photos").select("*, profiles(pseudo)")
          .eq("event_id", ev.id)
        if (!phs) continue
        const mapped = phs.map((p:any) => ({ ...p, pseudo: p.profiles?.pseudo }))
        setPhotos(prev => ({ ...prev, [ev.id]: mapped }))
        setMyPosted(prev => ({ ...prev, [ev.id]: phs.some((p:any) => p.user_id === myUserId) }))
      }
    }
    load()
  }, [groupId, myUserId])

  if (events.length === 0) return (
    <div style={{ textAlign:"center" as const, padding:40, color:"#4b5563" }}>
      <div style={{ fontSize:40, marginBottom:8 }}>📸</div>
      <div style={{ fontSize:14 }}>Aucun BeDrunk pour l'instant</div>
      <div style={{ fontSize:12, marginTop:4 }}>Le créateur peut en déclencher un depuis la piste</div>
    </div>
  )

  return (
    <div style={{ padding:"0 0 80px" }}>
      {events.map(ev => {
        const phs = photos[ev.id] || []
        const iPosted = myPosted[ev.id]
        const date = new Date(ev.triggered_at)
        const timeStr = `${date.getHours()}h${date.getMinutes().toString().padStart(2,"0")}`

        return (
          <div key={ev.id} style={{ background:"#13131f", borderRadius:16,
            border:"1px solid #2a2a3e", margin:"12px 16px", overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"12px 16px", display:"flex",
              justifyContent:"space-between", alignItems:"center",
              borderBottom:"1px solid #1e1e2e" }}>
              <div>
                <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>
                  📸 BeDrunk · {timeStr}
                </span>
              </div>
              <span style={{ fontSize:11, color:"#6b7280" }}>
                {phs.length} photo{phs.length>1?"s":""}
              </span>
            </div>

            {/* Grid */}
            {!iPosted && phs.length > 0 && (
              <div style={{ padding:"10px 16px 4px", fontSize:12, color:"#fbbf24",
                display:"flex", alignItems:"center", gap:6 }}>
                🔒 Poste ta photo pour voir celles des autres
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:3, padding:3 }}>
              {phs.map(ph => (
                <div key={ph.id} style={{ position:"relative", aspectRatio:"1",
                  overflow:"hidden", borderRadius:8 }}>
                  <img src={ph.photo_url}
                    style={{ width:"100%", height:"100%", objectFit:"cover",
                      filter: iPosted ? "none" : "blur(20px)",
                      transition:"filter 0.5s" }}
                    alt="bedrunk"/>
                  {!iPosted && (
                    <div style={{ position:"absolute", inset:0, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      background:"rgba(0,0,0,0.3)" }}>
                      <span style={{ fontSize:28 }}>🔒</span>
                    </div>
                  )}
                  {ph.late && (
                    <div style={{ position:"absolute", top:4, right:4,
                      background:"#ef4444", borderRadius:6, padding:"2px 6px",
                      fontSize:9, color:"white", fontWeight:700 }}>
                      ⏰ En retard
                    </div>
                  )}
                  {iPosted && (
                    <div style={{ position:"absolute", bottom:4, left:4,
                      background:"rgba(0,0,0,0.6)", borderRadius:6, padding:"2px 6px",
                      fontSize:10, color:"white" }}>
                      {ph.pseudo}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {phs.length === 0 && (
              <div style={{ padding:20, textAlign:"center" as const, color:"#4b5563", fontSize:12 }}>
                Aucune photo postée
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN BEDRUNK CONTROLLER ───────────────────────────────────────────────
export default function BeDrunkController({ groupId, myUserId, myPseudo, members, isCreator }: Props) {
  const [activeEvent, setActiveEvent] = useState<BeDrunkEvent|null>(null)
  const [secondsLeft, setSecondsLeft] = useState(180)
  const [showAlert, setShowAlert] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [posted, setPosted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout|null>(null)
  const supabase = createClient()

  // Listen for new BeDrunk events
  useEffect(() => {
    const sub = supabase.channel(`bedrunk:${groupId}`)
      .on("postgres_changes", {
        event:"INSERT", schema:"public", table:"bedrunk_events",
        filter:`group_id=eq.${groupId}`
      }, payload => {
        const ev = payload.new as BeDrunkEvent
        setActiveEvent(ev)
        setPosted(false)
        const exp = new Date(ev.expires_at).getTime()
        const secs = Math.max(0, Math.floor((exp - Date.now()) / 1000))
        setSecondsLeft(secs)
        setShowAlert(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [groupId])

  // Countdown timer
  useEffect(() => {
    if (!activeEvent || !showAlert) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current!); setShowAlert(false); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [activeEvent, showAlert])

  const trigger = async () => {
    if (showAlert || showCamera || activeEvent) return // prevent double trigger
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()
    // Show alert immediately for creator
    const fakeEvent = { id: "pending", group_id: groupId, triggered_at: new Date().toISOString(), expires_at: expiresAt, status: "active" }
    setActiveEvent(fakeEvent as any)
    setPosted(false)
    setSecondsLeft(180)
    setShowAlert(true)
    // Insert in DB for other members
    const { data } = await supabase.from("bedrunk_events").insert({
      group_id: groupId, expires_at: expiresAt, status:"active"
    }).select().single()
    if (data) setActiveEvent(data)
  }

  const uploadPhoto = async (blob: Blob) => {
    if (!activeEvent) return
    const path = `${groupId}/${activeEvent.id}/${myUserId}.jpg`
    const { data, error } = await supabase.storage
      .from("bedrunk-photos").upload(path, blob, { upsert: true, contentType:"image/jpeg" })
    if (error) { console.error(error); return }
    const { data: { publicUrl } } = supabase.storage.from("bedrunk-photos").getPublicUrl(path)
    const isLate = secondsLeft <= 0
    await supabase.from("bedrunk_photos").upsert({
      event_id: activeEvent.id, group_id: groupId,
      user_id: myUserId, photo_url: publicUrl, late: isLate
    })
    setPosted(true)
    setShowCamera(false)
    setShowAlert(false)
  }

  return (
    <>
      {/* Trigger button for creator */}
      {isCreator && (
        <button onClick={trigger}
          disabled={!!activeEvent}
        style={{ position:"fixed", bottom:90, right:16, zIndex:100,
            background: activeEvent ? "#2a2a3e" : "linear-gradient(135deg,#ec4899,#be185d)",
            border:"none", borderRadius:14, padding:"10px 16px",
            color:"white", fontSize:13, fontWeight:700,
            cursor: activeEvent ? "not-allowed" : "pointer",
            opacity: activeEvent ? 0.5 : 1,
            boxShadow: activeEvent ? "none" : "0 4px 20px rgba(236,72,153,0.4)" }}>
          📸 BeDrunk
        </button>
      )}

      {/* Alert overlay */}
      {showAlert && !posted && (
        <BeDrunkAlert
          secondsLeft={secondsLeft}
          onOpenCamera={() => { setShowAlert(false); setShowCamera(true) }}
        />
      )}

      {/* Camera */}
      {showCamera && (
        <Camera
          secondsLeft={secondsLeft}
          onCapture={uploadPhoto}
          onCancel={() => { setShowCamera(false); setShowAlert(true) }}
        />
      )}
    </>
  )
}
