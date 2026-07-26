'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// SIMPLE RELIABLE INFINITE WORLD
const WORLD_SIZE = 5000 // 5km x 5km plane (always visible!)
const ROAD_WIDTH = 12

// ============================================================
// TERRAIN - Green grass ground that ALWAYS renders
// ============================================================
export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 100, 100)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    // Vibrant grass colors!
    const grassLight = new THREE.Color('#5a9e5a')
    const grassDark = new THREE.Color('#3d7a3d')
    const roadColor = new THREE.Color('#2a2a2a')
    const roadEdge = new THREE.Color('#ffffff')

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      
      let color: THREE.Color
      
      const onRoadX = Math.abs(x) < ROAD_WIDTH / 2
      const onRoadZ = Math.abs(z) < ROAD_WIDTH / 2
      const onRoad = onRoadX || onRoadZ
      
      if (onRoad) {
        const isCenterLine = (onRoadX && Math.abs(x) < 0.2) || (onRoadZ && Math.abs(z) < 0.2)
        const isEdgeLine = (onRoadX && Math.abs(x) > ROAD_WIDTH/2 - 0.4 && Math.abs(x) < ROAD_WIDTH/2) ||
                          (onRoadZ && Math.abs(z) > ROAD_WIDTH/2 - 0.4 && Math.abs(z) < ROAD_WIDTH/2)
        const dashPattern = (onRoadX ? Math.floor(Math.abs(z)) : Math.floor(Math.abs(x))) % 6 < 3
        
        if ((isCenterLine && dashPattern) || isEdgeLine) {
          color = roadEdge
        } else {
          color = roadColor
        }
      } else {
        // Natural grass variation
        const noise1 = Math.sin(x * 0.008) * Math.cos(z * 0.008)
        const noise2 = Math.sin(x * 0.02 + z * 0.015) * 0.5
        const variation = (noise1 + noise2) * 0.15
        const t = (variation + 1) / 2
        color = grassLight.clone().lerp(grassDark, t)
        
        const patchNoise = Math.sin(x * 0.03) * Math.cos(z * 0.025)
        if (patchNoise > 0.7) color.multiplyScalar(0.85)
      }
      
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
    })

    return { geometry: geo, material: mat }
  }, [])

  // Follow player - snap to grid
  useFrame(() => {
    if (!meshRef.current) return
    
    const px = vehiclePosition[0]
    const pz = vehiclePosition[2]
    
    const gridSize = WORLD_SIZE / 2
    meshRef.current.position.x = Math.floor(px / gridSize) * gridSize
    meshRef.current.position.z = Math.floor(pz / gridSize) * gridSize
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow={false} />
  )
}

// ============================================================
// ROADS - Clear visible road markings
// ============================================================
export function RoadDetails() {
  const groupRef = useRef<THREE.Group>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const roadMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#333333', roughness: 0.75, metalness: 0.1,
    }),
    []
  )

  const lineMaterial = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.3,
    }),
    []
  )

  const roadSegments = useMemo(() => {
    const segments: JSX.Element[] = []
    
    // Z-axis road (North-South)
    segments.push(
      <mesh key="road-z" position={[0, 0.01, 0]} material={roadMaterial} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, WORLD_SIZE]} />
      </mesh>
    )
    
    // X-axis road (East-West)
    segments.push(
      <mesh key="road-x" rotation={[0, Math.PI/2, 0]} position={[0, 0.01, 0]} material={roadMaterial} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, WORLD_SIZE]} />
      </mesh>
    )
    
    // Dashed center lines - Z axis
    for (let z = -WORLD_SIZE/2; z < WORLD_SIZE/2; z += 6) {
      segments.push(
        <mesh key={`cl-z-${z}`} position={[0, 0.02, z]} material={lineMaterial}>
          <planeGeometry args={[0.2, 3]} />
        </mesh>
      )
    }
    
    // Dashed center lines - X axis
    for (let x = -WORLD_SIZE/2; x < WORLD_SIZE/2; x += 6) {
      segments.push(
        <mesh key={`cl-x-${x}`} position={[x, 0.02, 0]} rotation={[0, Math.PI/2, 0]} material={lineMaterial}>
          <planeGeometry args={[0.2, 3]} />
        </mesh>
      )
    }
    
    // Edge lines
    segments.push(<mesh key="edge-z-l" position={[-ROAD_WIDTH/2 + 0.15, 0.02, 0]} material={lineMaterial}><planeGeometry args={[0.15, WORLD_SIZE]} /></mesh>)
    segments.push(<mesh key="edge-z-r" position={[ROAD_WIDTH/2 - 0.15, 0.02, 0]} material={lineMaterial}><planeGeometry args={[0.15, WORLD_SIZE]} /></mesh>)
    segments.push(<mesh key="edge-x-t" position={[0, 0.02, -ROAD_WIDTH/2 + 0.15]} rotation={[0, Math.PI/2, 0]} material={lineMaterial}><planeGeometry args={[0.15, WORLD_SIZE]} /></mesh>)
    segments.push(<mesh key="edge-x-b" position={[0, 0.02, ROAD_WIDTH/2 - 0.15]} rotation={[0, Math.PI/2, 0]} material={lineMaterial}><planeGeometry args={[0.15, WORLD_SIZE]} /></mesh>)
    
    return segments
  }, [])

  useFrame(() => {
    if (!groupRef.current) return
    const px = vehiclePosition[0]
    const pz = vehiclePosition[2]
    const gridSize = WORLD_SIZE / 2
    groupRef.current.position.x = Math.floor(px / gridSize) * gridSize
    groupRef.current.position.z = Math.floor(pz / gridSize) * gridSize
  })

  return <group ref={groupRef}>{roadSegments}</group>
}

// ============================================================
// SCENERY - Rocks and details on the ground
// ============================================================
export function Scenery() {
  const groupRef = useRef<THREE.Group>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const rockMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#6b7280', roughness: 0.9, metalness: 0.1,
    }),
    []
  )

  const sceneryItems = useMemo(() => {
    const items: { pos: [number, number, number]; scale: number; key: string }[] = []
    
    const pseudoRandom = (n: number): number => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
      return x - Math.floor(x)
    }

    const spacing = 80
    const range = WORLD_SIZE / 2 - 100
    
    for (let gx = -range; gx <= range; gx += spacing) {
      for (let gz = -range; gz <= range; gz += spacing) {
        const idx = items.length
        const offsetX = (pseudoRandom(idx) - 0.5) * spacing * 0.8
        const offsetZ = (pseudoRandom(idx + 100) - 0.5) * spacing * 0.8
        
        const x = gx + offsetX
        const z = gz + offsetZ
        
        if (Math.abs(x) < ROAD_WIDTH + 10 && Math.abs(z) < ROAD_WIDTH + 10) continue
        
        items.push({
          pos: [x, 0.35 + pseudoRandom(idx + 200) * 0.45, z],
          scale: 0.6 + pseudoRandom(idx + 300) * 0.8,
          key: `scenery-${idx}-${gx}-${gz}`
        })
      }
    }
    
    return items
  }, [])

  useFrame(() => {
    if (!groupRef.current) return
    const px = vehiclePosition[0]
    const pz = vehiclePosition[2]
    const gridSize = WORLD_SIZE / 2
    groupRef.current.position.x = Math.floor(px / gridSize) * gridSize
    groupRef.current.position.z = Math.floor(pz / gridSize) * gridSize
  })

  return (
    <group ref={groupRef}>
      {sceneryItems.map(({ pos, scale, key }) => (
        <mesh key={key} position={pos} scale={scale} material={rockMaterial}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}
