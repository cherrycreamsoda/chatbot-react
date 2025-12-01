"use client"

import { useMemo, useRef } from "react"
import vertexShader from "./vertexShader"
import fragmentShader from "./fragmentShader"
import { useFrame } from "@react-three/fiber"
import { MathUtils } from "three"
import * as THREE from 'three'

interface BlobProps {
  testMode?: boolean
  audioIntensity?: number
}

const Blob = ({ testMode = false, audioIntensity = 0 }: BlobProps) => {
  const mesh = useRef<THREE.Mesh>(null)
  const hover = useRef(false)
  const uniforms = useMemo(() => {
    return {
      u_time: { value: 0 },
      u_intensity: { value: 1 },
    }
  }, [])

  useFrame((state) => {
    const { clock } = state
    if (mesh.current) {
      const mat = Array.isArray(mesh.current.material)
        ? (mesh.current.material[0] as THREE.ShaderMaterial)
        : (mesh.current.material as THREE.ShaderMaterial)

      mat.uniforms.u_time.value = 0.4 * clock.getElapsedTime()

      let targetIntensity: number
      if (testMode) {
        let parabola = audioIntensity * audioIntensity // x^2 curve
        targetIntensity = 0.15 + parabola * 0.85

      } else {
        // Normal mode: high intensity (1) or calm on hover (0.15)
        targetIntensity = hover.current ? 0.15 : 1
      }

      const lerpSpeed = testMode ? 0.5 : 0.02
      mat.uniforms.u_intensity.value = MathUtils.lerp(
        mat.uniforms.u_intensity.value,
        targetIntensity,
        lerpSpeed,
      )
    }
  })

  return (
    <mesh
      ref={mesh}
      scale={1.5}
      position={[0, 0, 0]}
      onPointerOver={() => {
        if (!testMode) hover.current = true
      }}
      onPointerOut={() => {
        if (!testMode) hover.current = false
      }}
    >
      <icosahedronGeometry args={[2, 20]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}

export default Blob
