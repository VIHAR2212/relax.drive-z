'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'
import { updatePhysics } from '@/lib/physics'

// Try to load GLB model, fallback to procedural
let GLTFLoader: any = null
let useGLTF: any = null

try {
  const drei = require('@react-three/drei')
  useGLTF = drei.useGLTF
} catch (e) {
  console.log('GLTF loader not available, using procedural car')
}

const CAR_MODEL_PATH = '/models/1992_volkswagen_golf_gti_mk2.glb'

export function Car() {
  const groupRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  
  // Get state and actions from store
  const vehicle = useGameStore((s) => s.vehicle)
  const setPosition = useGameStore((s) => s.setPosition)
  const setRotation = useGameStore((s) => s.setRotation)
  const setVelocity = useGameStore((s) => s.setVelocity)
  const setSteering = useGameStore((s) => s.setSteering)
  const setEngineRpm = useGameStore((s) => s.setEngineRPM)

  // Update physics every frame
  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Clamp delta to prevent physics explosions on lag spikes
    const clampedDelta = Math.min(delta, 0.05)

    try {
      // Run physics simulation
      const newState = updatePhysics(vehicle, clampedDelta)

      // Update store with new state
      setPosition(newState.position)
      setRotation(newState.rotation)
      setVelocity(newState.velocity)
      setSteering(newState.steering)
      setEngineRpm(newState.engineRPM)

      // Apply transforms to 3D object
      groupRef.current.position.set(...newState.position)
      groupRef.current.rotation.y = newState.rotation
      
      // Add slight body roll based on steering for realism
      const targetRoll = -newState.steering * 0.05
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        targetRoll,
        delta * 5
      )
      
      // Add slight pitch based on acceleration/deceleration
      const targetPitch = vehicle.input.forward ? -0.02 : (vehicle.input.backward ? 0.02 : 0)
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetPitch,
        delta * 3
      )
    } catch (error) {
      console.error('Physics update error:', error)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Procedural Car Body (always works!) */}
      <ProceduralCarBody />
      
      {/* Headlight beams */}
      <spotLight
        position={[0.7, 0.6, 2.5]}
        angle={0.4}
        penumbra={0.5}
        intensity={vehicle.input.forward ? 2 : 0}
        color="#fff5e6"
        distance={20}
        castShadow={false}
      />
      <spotLight
        position={[-0.7, 0.6, 2.5]}
        angle={0.4}
        penumbra={0.5}
        intensity={vehicle.input.forward ? 2 : 0}
        color="#fff5e6"
        distance={20}
        castShadow={false}
      />
      
      {/* Taillights glow when braking */}
      <pointLight
        position={[0.65, 0.5, -2.3]}
        intensity={vehicle.input.backward ? 3 : 0.3}
        color="#ff0000"
        distance={5}
      />
      <pointLight
        position={[-0.65, 0.5, -2.3]}
        intensity={vehicle.input.backward ? 3 : 0.3}
        color="#ff0000"
        distance={5}
      />
    </group>
  )
}

// Procedural car body that always renders (no external dependencies)
function ProceduralCarBody() {
  // Materials
  const bodyMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#2563eb', // Blue color
      roughness: 0.3,
      metalness: 0.8,
    }),
    []
  )
  
  const glassMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#88ccff',
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7,
    }),
    []
  )
  
  const tireMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#1a1a1a',
      roughness: 0.9,
    }),
    []
  )
  
  const rimMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#444444',
      roughness: 0.3,
      metalness: 0.8,
    }),
    []
  )
  
  const lightMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#ff3333',
      emissive: '#ff0000',
      emissiveIntensity: 0.5,
    }),
    []
  )

  return (
    <group position={[0, 0.4, 0]}>
      {/* Main body - lower section */}
      <mesh material={bodyMaterial} position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[2.0, 0.6, 4.5]} />
      </mesh>
      
      {/* Cabin/roof */}
      <mesh material={bodyMaterial} position={[0, 0.75, -0.3]} castShadow>
        <boxGeometry args={[1.8, 0.55, 2.2]} />
      </mesh>
      
      {/* Hood (front slope) */}
      <mesh material={bodyMaterial} position={[0, 0.45, 2]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[1.95, 0.35, 1.5]} />
      </mesh>
      
      {/* Trunk (rear slope) */}
      <mesh material={bodyMaterial} position={[0, 0.45, -2]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[1.95, 0.35, 1.2]} />
      </mesh>
      
      {/* Windshield */}
      <mesh material={glassMaterial} position={[0, 0.72, 0.85]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.8]} />
      </mesh>
      
      {/* Rear window */}
      <mesh material={glassMaterial} position={[0, 0.68, -1.45]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.6]} />
      </mesh>
      
      {/* Side windows */}
      <mesh material={glassMaterial} position={[0.92, 0.75, -0.3]}>
        <boxGeometry args={[0.05, 0.4, 1.8]} />
      </mesh>
      <mesh material={glassMaterial} position={[-0.92, 0.75, -0.3]}>
        <boxGeometry args={[0.05, 0.4, 1.8]} />
      </mesh>
      
      {/* Headlights */}
      <mesh material={lightMaterial} position={[0.75, 0.35, 2.25]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
      </mesh>
      <mesh material={lightMaterial} position={[-0.75, 0.35, 2.25]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
      </mesh>
      
      {/* Taillights */}
      <mesh material={lightMaterial} position={[0.8, 0.35, -2.25]}>
        <boxGeometry args={[0.35, 0.15, 0.05]} />
      </mesh>
      <mesh material={lightMaterial} position={[-0.8, 0.35, -2.25]}>
        <boxGeometry args={[0.35, 0.15, 0.05]} />
      </mesh>
      
      {/* Wheels */}
      <Wheel position={[1.1, -0.15, 1.4]} tireMaterial={tireMaterial} rimMaterial={rimMaterial} />
      <Wheel position={[-1.1, -0.15, 1.4]} tireMaterial={tireMaterial} rimMaterial={rimMaterial} />
      <Wheel position={[1.1, -0.15, -1.5]} tireMaterial={tireMaterial} rimMaterial={rimMaterial} />
      <Wheel position={[-1.1, -0.15, -1.5]} tireMaterial={tireMaterial} rimMaterial={rimMaterial} />
      
      {/* Mirrors */}
      <mesh material={bodyMaterial} position={[1.1, 0.65, 0.8]}>
        <boxGeometry args={[0.15, 0.12, 0.08]} />
      </mesh>
      <mesh material={bodyMaterial} position={[-1.1, 0.65, 0.8]}>
        <boxGeometry args={[0.15, 0.12, 0.08]} />
      </mesh>
    </group>
  )
}

// Wheel component
function Wheel({ position, tireMaterial, rimMaterial }: { 
  position: [number, number, number]
  tireMaterial: THREE.Material
  rimMaterial: THREE.Material 
}) {
  return (
    <group position={position}>
      {/* Tire */}
      <mesh material={tireMaterial} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.38, 0.38, 0.25, 16]} />
      </mesh>
      {/* Rim */}
      <mesh material={rimMaterial} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.26, 8]} />
      </mesh>
    </group>
  )
}

// (useMemo imported at top)
