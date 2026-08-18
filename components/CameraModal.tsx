'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react'

interface CameraModalProps {
  onCapture: (imageDataUrl: string) => void
  onClose: () => void
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use a callback ref so we know exactly when the <video> DOM node mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    if (node && streamRef.current) {
      node.srcObject = streamRef.current
      node.play().catch(() => {})
    }
  }, [])

  // Request camera on mount
  useEffect(() => {
    let cancelled = false

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera API is not available in this browser or context.')
          return
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })

        if (cancelled) {
          mediaStream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = mediaStream
        setCameraReady(true)

        // If video element is already mounted, bind immediately
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(() => {})
        }
      } catch {
        if (!cancelled) {
          setCameraError('Camera access was denied. Please allow camera permissions and try again.')
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current

    // Ensure video has actual dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera feed is not ready yet. Please wait a moment.')
      return
    }

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(dataUrl)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setCameraError(null)
    // Re-bind video after clearing captured image
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }, 50)
  }

  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage)
      onClose()
    }
  }

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onCapture(event.target.result as string)
          onClose()
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md md-card p-5 shadow-2xl space-y-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f1f1f]">
            <Camera className="w-4 h-4 text-[#1a73e8]" />
            <span>Camera Capture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Captured Preview */}
        <div className="relative rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-[#e8eaed]" style={{ aspectRatio: '4/3' }}>
          {!capturedImage ? (
            <>
              {/* Live Camera Feed */}
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: cameraError ? 'none' : 'block' }}
              />

              {/* Loading state before camera is ready */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 bg-[#1f1f1f] flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-xs text-white/60">Starting camera...</p>
                </div>
              )}

              {/* Error state */}
              {cameraError && (
                <div className="absolute inset-0 bg-[#f8fafb] p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-[#d93025]" />
                  <p className="text-xs text-[#5f6368] max-w-[240px]">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 md-btn-tonal text-xs"
                  >
                    Select Photo from Files Instead
                  </button>
                </div>
              )}
            </>
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileFallback}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {!capturedImage ? (
            <>
              <button
                onClick={takePhoto}
                disabled={!!cameraError || !cameraReady}
                className="px-6 py-2.5 md-btn-filled text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                Snap Photo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 md-btn-tonal text-xs flex items-center gap-1.5"
              >
                Upload File
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2 md-btn-tonal text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="px-5 py-2 md-btn-filled text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
