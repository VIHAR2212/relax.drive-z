'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// ============================================================
// CHUNK-BASED INFINITE WORLD SYSTEM
// Like GTA/Minecraft - loads chunks around player, unloads behind
// ============================================================

const CHUNK_SIZE = 1000 // Each chunk is 1km x 1km
const RENDER_RADIUS_CHUNKS = 12 // Render 12 chunks each direction = 12km visibility!
const ROAD_WIDTH = 12

// ============================================================
// TERRAIN CHUNK COMPONENT
// ============================================================
function TerrainChunk({ 
  chunkX, 
  chunkZ,
  geometry,
  material 
}: { 
  chunkX: number
  chunkZ: number
  geometry: THREE.PlaneGeometry
  material: THREE.MeshStandardMaterial 
}) {
  return (
    <mesh 
      geometry={geometry} 
      material={material}
      position={[chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE]}
      receiveShadow={false}
      frustumCulled={true}
    />
  )
}

// ============================================================
// ROAD BARRIERS CHUNK
// ============================================================
function RoadBarriersChunk({ chunkX, chunkZ }: { chunkX: number; chunkZ: number }) {
  const barrierMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#888888', 
      roughness: 0.7,
      metalness: 0.6,
    }),
    []
  )

  const barriers = useMemo(() => {
    const positions: { pos: [number, number, number]; key: string }[] = []
    
    const worldOriginX = chunkX * CHUNK_SIZE
    const worldOriginZ = chunkZ * CHUNK_SIZE
    
    // Z-axis road barriers
    if (worldOriginX > -ROAD_WIDTH/2 - 1 && worldOriginX < CHUNK_SIZE + ROAD_WIDTH/2 + 1) {
      for (let z = 0; z <= CHUNK_SIZE; z += 25) {
        positions.push({
          pos: [ROAD_WIDTH / 2 + 0.5, 0.5, z],
          key: `zb-l-${chunkX}-${chunkZ}-${z}`
        })
        positions.push({
          pos: [-ROAD_WIDTH / 2 - 0.5, 0.5, z],
          key: `zb-r-${chunkX}-${chunkZ}-${z}`
        })
      }
    }
    
    // X-axis road barriers
    if (worldOriginZ > -ROAD_WIDTH/2 - 1 && worldOriginZ < CHUNK_SIZE + ROAD_WIDTH/2 + 1) {
      for (let x = 0; x <= CHUNK_SIZE; x += 25) {
        positions.push({
          pos: [x, 0.5, ROAD_WIDTH / 2 + 0.5],
          key: `xb-t-${chunkX}-${chunkZ}-${x}`
        })
        positions.push({
          pos: [x, 0.5, -ROAD_WIDTH / 2 - 0.5],
          key: `xb-b-${chunkX}-${chunkZ}-${x}`
        })
      }
    }
    
    return positions
  }, [chunkX, chunkZ])

  if (barriers.length === 0) return null

  return (
    <group position={[chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE]}>
      {barriers.map(({ pos, key }) => (
        <mesh key={key} position={pos} material={barrierMaterial}>
          <boxGeometry args={[0.15, 0.8, 8]} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================
// SCENERY CHUNK (Rocks/Trees)
// ============================================================
function SceneryChunk({ chunkX, chunkZ }: { chunkX: number; chunkZ: number }) {
  const rockMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#6b7280', 
      roughness: 0.92,
      metalness: 0.08,
    }),
    []
  )

  const sceneryItems = useMemo(() => {
    const items: { pos: [number, number, number]; scale: [number, number, number]; key: string }[] = []
    
    const seededRandom = (n: number): number => {
      const x = Math.sin(chunkX * 12.9898 + chunkZ * 78.233 + n * 43.758) * 43758.5453
      return x - Math.floor(x)
    }

    const itemCount = 40 + Math.floor(seededRandom(999) * 20)
    
    for (let i = 0; i < itemCount; i++) {
      const margin = 50
      const x = margin + seededRandom(i * 3) * (CHUNK_SIZE - margin * 2)
      const z = margin + seededRandom(i * 7 + 1) * (CHUNK_SIZE - margin * 2)
      
      const worldX = chunkX * CHUNK_SIZE + x
      const worldZ = chunkZ * CHUNK_SIZE + z
      
      if (Math.abs(worldX) < ROAD_WIDTH/2 + 8 && Math.abs(worldZ) < ROAD_WIDTH/2 + 8) continue
      
      const y = 0.3 + seededRandom(i * 11 + 2) * 0.5
      const scaleVar = 0.7 + seededRandom(i * 13 + 3) * 0.6
      
      items.push({
        pos: [x, y, z],
        scale: [scaleVar, 0.5 + seededRandom(i * 17) * 0.4, scaleVar],
        key: `scenery-${chunkX}-${chunkZ}-${i}`
      })
    }
    
    return items
  }, [chunkX, chunkZ])

  if (sceneryItems.length === 0) return null

  return (
    <group position={[chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE]}>
      {sceneryItems.map(({ pos, scale, key }) => (
        <mesh key={key} position={pos} scale={scale} material={rockMaterial}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================
// MAIN TERRAIN MANAGER - Handles loading/unloading chunks
// ============================================================
export function Terrain() {
  const vehiclePosition = useGameStore((s) => s.vehicle.position)
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set())
  const lastPlayerChunkRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 })

  // Shared geometry/material for all chunks (performance!)
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 48, 48)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    const grassColor = new THREE.Color('#4a7c4e')
    const roadColor = new THREE.Color('#333333')
    const markingColor = new THREE.Color('#dddddd')

    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i]
      const localZ = positions[i + 2]
      
      let color: THREE.Color
      
      const onRoadX = Math.abs(localX) < ROAD_WIDTH / 2
      const onRoadZ = Math.abs(localZ) < ROAD_WIDTH / 2
      const onRoad = onRoadX || onRoadZ
      
      if (onRoad) {
        const isCenterLine = (onRoadX && Math.abs(localX) < 0.15) || 
                             (onRoadZ && Math.abs(localZ) < 0.15)
        const isEdgeLine = (onRoadX && Math.abs(localX) > ROAD_WIDTH/2 - 0.25 && Math.abs(localX) < ROAD_WIDTH/2) ||
                          (onRoadZ && Math.abs(localZ) > ROAD_WIDTH/2 - 0.25 && Math.abs(localZ) < ROAD_WIDTH/2)
        
        const isDashedCenter = isCenterLine && 
          ((onRoadX ? Math.floor(Math.abs(localZ)) : Math.floor(Math.abs(localX))) % 8 < 4)
        
        if (isDashedCenter || isEdgeLine) {
          color = markingColor
        } else {
          color = roadColor
        }
      } else {
        const variation = (Math.sin(localX * 0.03) * Math.cos(localZ * 0.03)) * 0.06
        color = grassColor.clone().offsetHSL(0, 0, variation)
        
        const patchSeed = Math.sin(localX * 0.05) * Math.cos(localZ * 0.05)
        if (patchSeed > 0.7) {
          color.offsetHSL(0, -0.08, -0.06)
        }
      }
      
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    
    return geo
  }, [])

  const terrainMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    }),
    []
  )

  // Update chunks based on player position
  useFrame(() => {
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const playerChunkX = Math.floor(playerX / CHUNK_SIZE)
    const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    if (playerChunkX === lastPlayerChunkRef.current.x && 
        playerChunkZ === lastPlayerChunkRef.current.z) {
      return
    }
    
    lastPlayerChunkRef.current = { x: playerChunkX, z: playerChunkZ }
    
    const neededChunks = new Set<string>()
    
    for (let dx = -RENDER_RADIUS_CHUNKS; dx <= RENDER_RADIUS_CHUNKS; dx++) {
      for (let dz = -RENDER_RADIUS_CHUNKS; dz <= RENDER_RADIUS_CHUNKS; dz++) {
        neededChunks.add(`${playerChunkX + dx},${playerChunkZ + dz}`)
      }
    }
    
    setActiveChunks(neededChunks)
  })

  const chunkArray = useMemo(() => Array.from(activeChunks), [activeChunks])

  return (
    <group>
      {chunkArray.map(chunkKey => {
        const [xStr, zStr] = chunkKey.split(',')
        const cx = parseInt(xStr, 10)
        const cz = parseInt(zStr, 10)
        
        return (
          <TerrainChunk
            key={`terrain-${chunkKey}`}
            chunkX={cx}
            chunkZ={cz}
            geometry={terrainGeometry}
            material={terrainMaterial}
          />
        )
      })}
    </group>
  )
}

// ============================================================
// ROAD DETAILS MANAGER
// ============================================================
export function RoadDetails() {
  const vehiclePosition = useGameStore((s) => s.vehicle.position)
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set())
  const lastPlayerChunkRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 })

  useFrame(() => {
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const playerChunkX = Math.floor(playerX / CHUNK_SIZE)
    const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    if (playerChunkX === lastPlayerChunkRef.current.x && 
        playerChunkZ === lastPlayerChunkRef.current.z) {
      return
    }
    
    lastPlayerChunkRef.current = { x: playerChunkX, z: playerChunkZ }
    
    const neededChunks = new Set<string>()
    
    for (let dx = -RENDER_RADIUS_CHUNKS; dx <= RENDER_RADIUS_CHUNKS; dx++) {
      for (let dz = -RENDER_RADIUS_CHUNKS; dz <= RENDER_RADIUS_CHUNKS; dz++) {
        neededChunks.add(`${playerChunkX + dx},${playerChunkZ + dz}`)
      }
    }
    
    setActiveChunks(neededChunks)
  })

  const chunkArray = useMemo(() => Array.from(activeChunks), [activeChunks])

  return (
    <group>
      {chunkArray.map(chunkKey => {
        const [xStr, zStr] = chunkKey.split(',')
        return (
          <RoadBarriersChunk
            key={`road-${chunkKey}`}
            chunkX={parseInt(xStr, 10)}
            chunkZ={parseInt(zStr, 10)}
          />
        )
      })}
    </group>
  )
}

// ============================================================
// SCENERY MANAGER
// ============================================================
export function Scenery() {
  const vehiclePosition = useGameStore((s) => s.vehicle.position)
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set())
  const lastPlayerChunkRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 })

  useFrame(() => {
    const playerX = vehiclePosition[0]
    const playerZ = vehiclePosition[2]
    
    const playerChunkX = Math.floor(playerX / CHUNK_SIZE)
    const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE)
    
    if (playerChunkX === lastPlayerChunkRef.current.x && 
        playerChunkZ === lastPlayerChunkRef.current.z) {
      return
    }
    
    lastPlayerChunkRef.current = { x: playerChunkX, z: playerChunkZ }
    
    const neededChunks = new Set<string>()
    
    const sceneryRadius = Math.max(RENDER_RADIUS_CHUNKS - 2, 8)
    
    for (let dx = -sceneryRadius; dx <= sceneryRadius; dx++) {
      for (let dz = -sceneryRadius; dz <= sceneryRadius; dz++) {
        neededChunks.add(`${playerChunkX + dx},${playerChunkZ + dz}`)
      }
    }
    
    setActiveChunks(neededChunks)
  })

  const chunkArray = useMemo(() => Array.from(activeChunks), [activeChunks])

  return (
    <group>
      {chunkArray.map(chunkKey => {
        const [xStr, zStr] = chunkKey.split(',')
        return (
          <SceneryChunk
            key={`scenery-${chunkKey}`}
            chunkX={parseInt(xStr, 10)}
            chunkZ={parseInt(zStr, 10)}
          />
        )
      })}
    </group>
  )
}
