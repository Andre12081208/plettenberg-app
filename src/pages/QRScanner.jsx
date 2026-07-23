import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export default function QRScanner({ onScan, onBack }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let animationFrame
    let stopped = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        tick()
      } catch (err) {
        setError('Kamera-Zugriff wurde nicht erlaubt oder ist nicht verfügbar.')
      }
    }

    function tick() {
      if (stopped) return
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationFrame = requestAnimationFrame(tick)
        return
      }

      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        stopped = true
        streamRef.current?.getTracks().forEach((t) => t.stop())
        onScan(code.data)
        return
      }

      animationFrame = requestAnimationFrame(tick)
    }

    startCamera()

    return () => {
      stopped = true
      cancelAnimationFrame(animationFrame)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line
  }, [])

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mark">Plettenberg</div>
        <h1>QR-Code scannen</h1>
      </div>
      <main>
        <button className="link-text" onClick={onBack} style={{ marginBottom: 16 }}>← Zurück</button>

        {error && <div className="error-box">{error}</div>}

        <video ref={videoRef} style={{ width: '100%', borderRadius: 10 }} muted playsInline />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <p className="hint" style={{ marginTop: 12 }}>Halte den QR-Code vor die Kamera.</p>
      </main>
    </div>
  )
}
