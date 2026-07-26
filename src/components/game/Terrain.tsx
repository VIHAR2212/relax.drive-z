'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// INFINITE TERRAIN CONFIGURATION
const CHUNK_SIZE = 200 // Size of each terrain chunk
const ROAD_WIDTH = 12

// Infinite scrolling terrain that follows the player
export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const createChunkGeometry = useMemo(() => {
    return (chunkX: number, chunkZ: number): THREE.PlaneGeometry => {
      const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 32, 32)
      geo.rotateX(-Math.PI / 2)

      const positions = geo.attributes.position.array as Float32Array
      const colors = new Float32Array(positions.length)

      const grassColor = new THREE.Color('#4a7c4e')
      const roadColor = new THREE.Color('#333333')
      const markingColor = new THREE.Color('#dddddd')

      for (let i = 0; i < positions.length; i += 3) {
        const localX = positions[i]
        const localZ = positions[i + 2]
        
        const worldX = localX + chunkX * CHUNK_SIZE
        const worldZ = localZ + chunkZ * CHUNK_SIZE
        
        let color: THREE.Color
        
        const onRoadX = Math.abs(worldX) < ROAD_WIDTH / 2
        const onRoadZ = Math.abs(worldZ) < ROAD_WIDTH / 2
        const onRoad = onRoadX || onRoadZ
        
        if (onRoad) {
          const isCenterLine = (onRoadX && Math.abs(worldX) < 0.15) || 
                               (onRoadZ && Math.abs(worldZ) < 0.15)
          const isEdgeLine = (onRoadX && Math.abs(worldX) > ROAD_WIDTH / 2 - 0.25 && Math.abs(worldX) < ROAD_WIDTH / 2) ||
                            (onRoadZ && Math.abs(worldZ) > ROAD_WIDTH / 2 - 0.25 && Math.abs(worldZ) < ROAD_WIDTH / 2)
          
          const isDashedCenter = isCenterLine && 
            ((onRoadX ? Math.floor(Math.abs(worldZ)) : Math.floor(Math.abs(worldX))) % 8 < 4)
          
          if (isDashedCenter || isEdgeLine) {
            color = markingColor
          } else {
            color = roadColor
          }
        } else {
          const variation = (Math.sin(worldX * 0.02) * Math.cos(worldZ * 0.02)) * 0.08
          color = grassColor.clone().offsetHSL(0, 0, variation)
          
          const patchSeed = Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1)
          if (patchSeed > 0.7) {
            color.offsetHSL(0, -0.1, -0.1)
          }
        }
        
        colors[i] = color.r
        colors[i + 1] = color.g
        colors[i + 2] = color.b
      }

      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geo.computeVertexNormals()
      
      return geo
    }
  }, [])

  const material = useMemo(() => 
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    }),
    []
  )

  useFrame(() => {
    if (!meshRef.current) return
    
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const chunkX = Math.floor(playerX / CHUNK_SIZE)
    const chunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    meshRef.current.position.x = chunkX * CHUNK_SIZE
    meshRef.current.position.z = chunkZ * CHUNK_SIZE
  })

  const geometry = useMemo(() => createChunkGeometry(0, 0), [createChunkGeometry])

  return (
    <mesh 
      ref={meshRef}
      geometry={geometry} 
      material={material} 
      receiveShadow={false}
    />
  )
}

export function RoadDetails() {
  const groupRef = useRef<THREE.Group>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const barrierMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#888888', 
      roughness: 0.7,
      metalness: 0.6,
    }),
    []
  )

  const getBarrierPositions = (): [number, number, number][] => {
    const positions: [number, number, number][] = []
    
    for (let z = -CHUNK_SIZE/2; z <= CHUNK_SIZE/2; z += 20) {
      positions.push([ROAD_WIDTH / 2 + 0.5, 0.5, z])
      positions.push([-ROAD_WIDTH / 2 - 0.5, 0.5, z])
    }
    
    for (let x = -CHUNK_SIZE/2; x <= CHUNK_SIZE/2; x += 20) {
      positions.push([x, 0.5, ROAD_WIDTH / 2 + 0.5])
      positions.push([x, 0.5, -ROAD_WIDTH / 2 - 0.5])
    }
    
    return positions
  }

  useFrame(() => {
    if (!groupRef.current) return
    
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const chunkX = Math.floor(playerX / CHUNK_SIZE)
    const chunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    groupRef.current.position.x = chunkX * CHUNK_SIZE
    groupRef.current.position.z = chunkZ * CHUNK_SIZE
  })

  const barrierPositions = useMemo(() => getBarrierPositions(), [])

  return (
    <group ref={groupRef}>
      {barrierPositions.map((pos, i) => (
        <mesh key={`barrier-${i}`} position={pos} material={barrierMaterial}>
          <boxGeometry args={[0.15, 0.8, 8]} />
        </mesh>
      ))}
    </group>
  )
}

export function Scenery() {
  const groupRef = useRef<THREE.Group>(null)
  const vehiclePosition = useGameStore((s) => s.vehicle.position)

  const rockMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#6b7280', 
      roughness: 0.92,
      metalness: 0.08,
    }),
    []
  )

  const getSceneryPositions = (seedX: number, seedZ: number): [number, number, number][] => {
    const positions: [number, number, number][] = []
    
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seedX * 12.9898 + seedZ * 78.233 + n) * 43758.5453
      return x - Math.floor(x)
    }
    
    for (let i = 0; i < 30; i++) {
      const angle = pseudoRandom(i) * Math.PI * 2
      const distance = 30 + pseudoRandom(i + 100) * (CHUNK_SIZE * 0.45)
      
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      
      if (Math.abs(x) < ROAD_WIDTH / 2 + 5 && Math.abs(z) < ROAD_WIDTH / 2 + 5) continue
      
      const y = 0.25 + pseudoRandom(i + 200) * 0.35
      positions.push([x, y, z])
    }
    
    return positions
  }

  useFrame(() => {
    if (!groupRef.current) return
    
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const chunkX = Math.floor(playerX / CHUNK_SIZE)
    const chunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    groupRef.current.position.x = chunkX * CHUNK_SIZE
    groupRef.current.position.z = chunkZ * CHUNK_SIZE
  })

  const sceneryPositions = useMemo(() => getSceneryPositions(0, 0), [])

  return (
    <group ref={groupRef}>
      {sceneryPositions.map((pos, i) => (
        <mesh 
          key={`scenery-${i}`}
          position={pos}
          scale={[0.8 + (i % 5) * 0.15, 0.5 + (i % 3) * 0.2, 0.8 + (i % 5) * 0.15]}
          material={rockMaterial}
        >
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}
