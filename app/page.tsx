"use client"

import { useState, useRef, Suspense, useEffect } from "react"
import { useConversation } from "@elevenlabs/react"
import { Mic, RotateCcw, X } from "lucide-react"
import { Canvas } from "@react-three/fiber"
import Blob from "@/components/Blob"

export default function Home() {
  const [isRequesting, setIsRequesting] = useState(false)
  const [agentResponse, setAgentResponse] = useState<string>("")
  const [displayedText, setDisplayedText] = useState<string>("")

  const [testMode, setTestMode] = useState(false)
  const [audioIntensity, setAudioIntensity] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const AGENT_ID = process.env.NEXT_PUBLIC_AGENT_ID ?? ""

  useEffect(() => {
    if (!agentResponse) {
      setDisplayedText("")
      return
    }

    let index = 0
    setDisplayedText("")

    const typeInterval = setInterval(() => {
      if (index < agentResponse.length) {
        setDisplayedText((prev) => prev + agentResponse[index])
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 30) // Type at 30ms per character

    return () => clearInterval(typeInterval)
  }, [agentResponse])

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to agent")
    },
    onDisconnect: () => {
      console.log("Disconnected from agent")
    },
    onError: (error) => {
      console.error("Error:", error)
    },
    onMessage: (message) => {
      if (message.source === "ai" && message.message) {
        setAgentResponse((prev) => {
          const newResponse = prev ? prev + message.message : message.message
          return newResponse
        })
      }
    },
  })

  const analyzeAudio = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const average = sum / dataArray.length

    const normalized = Math.min(average / 50, 2.0)

    const intensity = Math.min(normalized, 1.0)

    setAudioIntensity(intensity)

    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }

  const startAudioCapture = async () => {
    try {
      console.log("Starting audio capture for test mode")
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      micStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      analyzeAudio()
      console.log("Audio analysis started")
    } catch (error) {
      console.error("Failed to access microphone:", error)
      alert("Failed to access microphone. Please allow microphone access and try again.")
    }
  }

  const stopAudioCapture = () => {
    console.log("Stopping audio capture")

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setAudioIntensity(0)
  }

  const handleTestMode = async () => {
    console.log("TEST MODE TOGGLE - Current:", testMode)

    if (!testMode) {
      setTestMode(true)
      await startAudioCapture()
    } else {
      setTestMode(false)
      stopAudioCapture()
    }
  }

  const handleStartConversation = async () => {
    if (conversation.status === "connected") return

    try {
      setIsRequesting(true)
      await navigator.mediaDevices.getUserMedia({ audio: true })

      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      })
    } catch (error) {
      console.error("Failed to start conversation:", error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleRestart = async () => {
    try {
      if (conversation.status === "connected") {
        await conversation.endSession()
      }
      setAgentResponse("")
      setDisplayedText("")
      setTimeout(() => {
        handleStartConversation()
      }, 500)
    } catch (error) {
      console.error("Failed to restart:", error)
    }
  }

  const handleClose = async () => {
    try {
      if (conversation.status === "connected") {
        await conversation.endSession()
      }
      setAgentResponse("")
      setDisplayedText("")
      setIsRequesting(false)
    } catch (error) {
      console.error("Failed to close:", error)
    }
  }

  const handleMicClick = async () => {
    if (conversation.isSpeaking) {
      return
    }

    if (conversation.status !== "connected") {
      await handleStartConversation()
    }
  }

  const isActive = conversation.status === "connected"

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex flex-col items-center px-4 sm:px-6">
        <div className="w-80 h-80 relative flex-shrink-0">
          <Canvas camera={{ position: [0.0, 0.0, 8.0] }}>
            <Suspense fallback={null}>
              <Blob testMode={testMode} audioIntensity={audioIntensity} />
            </Suspense>
          </Canvas>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-6">
        {displayedText && (
          <div className="w-full max-w-2xl max-h-[6rem] overflow-y-auto scrollbar-transparent">
            <p className="text-xl sm:text-2xl md:text-3xl text-white/90 leading-relaxed text-center line-clamp-2">
              {displayedText}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 sm:gap-8 pb-8 sm:pb-12">
        <button
          onClick={handleRestart}
          disabled={isRequesting}
          className="h-12 w-12 rounded-full text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <RotateCcw className="h-6 w-6" />
        </button>

        <button
          onClick={handleMicClick}
          disabled={isRequesting || conversation.isSpeaking}
          className={`h-20 w-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center disabled:opacity-50 ${
            isActive && conversation.isSpeaking
              ? "animate-pulse shadow-2xl shadow-pink-500/70 scale-110"
              : isActive
                ? "shadow-lg shadow-pink-500/50"
                : ""
          } ${conversation.isSpeaking ? "cursor-not-allowed" : ""}`}
        >
          <Mic className="h-8 w-8" />
        </button>

        <button
          onClick={handleClose}
          disabled={isRequesting}
          className="h-12 w-12 rounded-full text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex justify-center pb-8">
        <button
          onClick={handleTestMode}
          className={`px-6 py-2 rounded-full border-2 transition-all ${
            testMode
              ? "border-pink-500 bg-pink-500/20 text-pink-400 hover:bg-pink-500/30"
              : "border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800"
          }`}
        >
          {testMode ? "STOP TEST" : "TEST"}
        </button>
      </div>
    </main>
  )
}
