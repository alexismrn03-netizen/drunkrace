"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { THEMES, getSavedTheme, saveTheme, getSavedVolume, saveVolume, getSavedMuted, saveMuted, type ThemeId } from "@/lib/theme"
import { startAmbiance, stopAmbiance, setAmbianceVolume, isAmbiancePlaying } from "@/lib/ambiance"

interface Props {
  onThemeChange: (id: ThemeId) => void
}

export default function SettingsTab({ onThemeChange }: Props) {
  const [theme, setTheme] = useState<ThemeId>(() => getSavedTheme())
  const [volume, setVolume] = useState(() => getSavedVolume())
  const [muted, setMuted] = useState(() => getSavedMuted())
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const T = THEMES[theme]

  // Démarrer l'ambiance au montage
  useEffect(() => {
    if (!muted) startAmbiance(volume)
    return () => {}
  }, [])

  // Sync volume/mute avec l'audio
  useEffect(() => {
    setAmbianceVolume(volume, muted)
    saveVolume(volume)
    saveMuted(muted)
  }, [volume, muted])

  const getVolFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!trackRef.current) return volume
    const rect = trackRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return Math.round((x / rect.width) * 100)
  }, [volume])

  const onTrackDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true)
    const v = getVolFromEvent(e)
    setVolume(v)
    if (v > 0) setMuted(false)
    // Démarrer l'ambiance si pas encore démarrée
    if (!isAmbiancePlaying() && !muted) startAmbiance(v)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent | TouchEvent) => {
      const v = getVolFromEvent(e)
      setVolume(v)
      if (v > 0) setMuted(false)
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, getVolFromEvent])

  const handleTheme = (id: ThemeId) => {
    setTheme(id)
    saveTheme(id)
    onThemeChange(id)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (!next && !isAmbiancePlaying()) startAmbiance(volume)
    if (next) setAmbianceVolume(0, true)
  }

  const pct = muted ? 0 : volume

  // Voiture F1 SVG — sans texte
  const F1Car = ({ color, color2 }: { color: string; color2: string }) => (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="22" cy="22" rx="16" ry="7" fill={color}/>
      <path d="M38 22 L44 21 L44 23 Z" fill={color2}/>
      <rect x="4" y="18" width="4" height="8" rx="1" fill={color} opacity="0.7"/>
      <rect x="2" y="17" width="4" height="2" rx="1" fill={color} opacity="0.5"/>
      <rect x="2" y="25" width="4" height="2" rx="1" fill={color} opacity="0.5"/>
      <ellipse cx="26" cy="20" rx="5" ry="3" fill="#0a0a14"/>
      <circle cx="26" cy="19" r="3" fill={color2}/>
      <circle cx="26" cy="18.5" r="2" fill={color2} opacity="0.7"/>
      <ellipse cx="36" cy="16" rx="3" ry="4" fill="#1f2937"/>
      <ellipse cx="36" cy="28" rx="3" ry="4" fill="#1f2937"/>
      <ellipse cx="36" cy="16" rx="1.5" ry="2.5" fill="#374151"/>
      <ellipse cx="36" cy="28" rx="1.5" ry="2.5" fill="#374151"/>
      <ellipse cx="12" cy="15" rx="3.5" ry="5" fill="#1f2937"/>
      <ellipse cx="12" cy="29" rx="3.5" ry="5" fill="#1f2937"/>
      <ellipse cx="12" cy="15" rx="2" ry="3" fill="#374151"/>
      <ellipse cx="12" cy="29" rx="2" ry="3" fill="#374151"/>
      <path d="M6 21 C2 20, 0 22, 2 23 C0 23, 1 25, 4 24 C2 25, 3 27, 6 26 Z" fill="#f97316" opacity="0.9"/>
      <path d="M6 21 C3 21, 1 22, 3 23 Z" fill="#fbbf24" opacity="0.8"/>
    </svg>
  )

  const BG: any = { padding:"24px 16px 100px", display:"flex", flexDirection:"column" as const, gap:20 }

  return (
    <div style={BG}>
      {/* Titre */}
      <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:T.accentGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
        ⚙️ RÉGLAGES
      </div>

      {/* ── SON ── */}
      <div style={{ background:T.bgCard, borderRadius:18, padding:18, border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" as const, gap:16 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, letterSpacing:3, color:T.textMuted }}>— SON —</div>

        {/* Volume header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2, color:"#e2e8f0" }}>🎵 VOLUME AMBIANCE</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:T.accent }}>{muted ? '🔇' : `${volume}%`}</div>
        </div>

        {/* Barre F1 */}
        <div
          ref={trackRef}
          onMouseDown={onTrackDown}
          onTouchStart={onTrackDown}
          style={{ position:"relative", height:50, display:"flex", alignItems:"center", cursor:"pointer", userSelect:"none" as const, touchAction:"none" as const }}
        >
          {/* Route */}
          <div style={{ position:"absolute", left:0, right:0, height:18, top:"50%", transform:"translateY(-50%)", background:"#1a2230", borderRadius:9, overflow:"hidden" }}>
            {/* Kerbs haut */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 8px,#fff 8px,#fff 16px)", opacity:0.7 }}/>
            {/* Kerbs bas */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"repeating-linear-gradient(90deg,#fff 0px,#fff 8px,#ef4444 8px,#ef4444 16px)", opacity:0.7 }}/>
            {/* Ligne centrale */}
            <div style={{ position:"absolute", top:"50%", left:12, right:12, height:2, transform:"translateY(-50%)", background:"repeating-linear-gradient(90deg,#fbbf24 0px,#fbbf24 10px,transparent 10px,transparent 20px)", opacity:0.3 }}/>
            {/* Fill */}
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, borderRadius:9, background:T.accentGrad, opacity:0.4, transition:"width 0.05s" }}/>
          </div>

          {/* Traînée derrière voiture */}
          {pct > 5 && (
            <div style={{ position:"absolute", right:`${100-pct}%`, top:"50%", transform:"translateY(-50%)", width:Math.min(pct*0.6, 60), height:6, borderRadius:3, background:`linear-gradient(90deg,transparent,${T.accent}44)`, pointerEvents:"none" as const }}/>
          )}

          {/* Voiture F1 */}
          <div style={{ position:"absolute", left:`${pct}%`, top:"50%", transform:"translateY(-50%) translateX(-50%)", zIndex:10, filter:`drop-shadow(0 0 8px ${T.glowColor}99)`, transition:"left 0.05s", pointerEvents:"none" as const }}>
            <F1Car color={T.accent} color2={T.accent2}/>
          </div>
        </div>

        {/* Labels */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:-8 }}>
          {['0','25','50','75','100'].map(l => (
            <span key={l} style={{ fontFamily:"'Bebas Neue',cursive", fontSize:10, letterSpacing:1, color:"#374151" }}>{l}</span>
          ))}
        </div>

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 14px", cursor:"pointer", width:"100%" }}
        >
          <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{muted ? '🔇 Son coupé' : '🔊 Son activé'}</span>
          <div style={{ width:44, height:24, borderRadius:12, background:muted?"#374151":T.accent, position:"relative", transition:"background 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", left:muted?3:23, boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}/>
          </div>
        </button>
      </div>

      {/* ── THÈME ── */}
      <div style={{ background:T.bgCard, borderRadius:18, padding:18, border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" as const, gap:14 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:11, letterSpacing:3, color:T.textMuted }}>— THÈME —</div>
        <div style={{ display:"flex", gap:10 }}>
          {(Object.values(THEMES)).map(th => {
            const active = theme === th.id
            return (
              <button
                key={th.id}
                onClick={() => handleTheme(th.id)}
                style={{ flex:1, padding:"12px 8px", borderRadius:14, border:`2px solid ${active ? T.accent : 'transparent'}`, cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:6, background:active ? `${T.accent}18` : T.bg, transition:"all 0.2s" }}
              >
                <div style={{ display:"flex", gap:4 }}>
                  {th.dots.map((d, i) => (
                    <div key={i} style={{ width:12, height:12, borderRadius:"50%", background:d, border:i===2?`1px solid ${T.border}`:"none" }}/>
                  ))}
                </div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:10, letterSpacing:1, color:active?T.accent:T.textMuted }}>{th.name}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div style={{ fontSize:11, color:T.textMuted, textAlign:"center" as const, lineHeight:1.6 }}>
        Le thème s'applique immédiatement à toute l'app 🎨
      </div>
    </div>
  )
}
