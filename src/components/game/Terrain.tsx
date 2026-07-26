'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// ============================================================
// CHUNK-BASED INFINITE WORLD - Loads AHEAD of player!
// Like GTA/Minecraft - chunks load before you reach them
// ============================================================

const CHUNK_SIZE = 500 // 500m x 500m per chunk (smaller = more detail)
const RENDER_DISTANCE = 15 // Load 15 chunks ahead (~7.5km visibility)
const ROAD_WIDTH = 14 // Wider road like Image #2

// Seeded random for consistent scenery per chunk
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Get chunk key from world position
function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

// ============================================================
// TREE COMPONENT - Lush trees like Image #2
// ============================================================
function Tree({ position, scale = 1, type = 0 }: { 
  position: [number, number, number]
  scale?: number
  type?: number 
}) {
  const trunkHeight = (1.2 + Math.random() * 0.8) * scale
  const canopyRadius = (1.5 + Math.random() * 1.0) * scale
  
  const treeTypes = ['pine', 'round', 'oval']
  const treeType = treeTypes[type % 3]
  
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.12 * scale, 0.18 * scale, trunkHeight, 6]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      
      {/* Canopy */}
      {treeType === 'pine' ? (
        // Pine tree - cone shape
        <mesh position={[0, trunkHeight + canopyRadius * 0.7, 0]}>
          <coneGeometry args={[canopyRadius * 0.8, canopyRadius * 1.8, 8]} />
          <meshStandardMaterial color="#2e7d32" roughness={0.85} />
        </mesh>
      ) : treeType === 'round' ? (
        // Round tree - sphere
        <mesh position={[0, trunkHeight + canopyRadius * 0.6, 0]}>
          <sphereGeometry args={[canopyRadius, 8, 8]} />
          <meshStandardMaterial color="#388e3c" roughness={0.85} />
        </mesh>
      ) : (
        // Oval tree - ellipsoid
        <mesh position={[0, trunkHeight + canopyRadius * 0.5, 0]} scale={[1, 1.3, 1]}>
          <sphereGeometry args={[canopyRadius * 0.9, 8, 8]} />
          <meshStandardMaterial color="#43a047" roughness={0.85} />
        </mesh>
      )}
    </group>
  )
}

// ============================================================
// FLOWER/BUSH COMPONENT - Colorful roadside details like Image #2
// ============================================================
function FlowerPatch({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.15 + Math.random() * 0.15, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  )
}

// ============================================================
// SINGLE TERRAIN CHUNK - Grass ground with road
// ============================================================
function TerrainChunk({ cx, cz }: { cx: number; cz: number }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 50, 50)
    geo.rotateX(-Math.PI / 2)
    
    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)
    
    // Colors for beautiful terrain like Image #2
    const grassLight = new THREE.Color('#5cb85c') // Vibrant light green
    const grassDark = new THREE.Color('#3d8b3d')   // Rich dark green  
    const roadAsphalt = new THREE.Color('#2c2c2c') // Dark asphalt
    const roadMarking = new THREE.Color('#ffffff')  // White lines
    const shoulderColor = new THREE.Color('#4a7c4a') // Road shoulder green
    
    // World position offset for this chunk
    const worldOffsetX = cx * CHUNK_SIZE
    const worldOffsetZ = cz * CHUNK_SIZE
    
    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i]
      const localZ = positions[i + 2]
      
      // Convert to world coordinates
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      let color: THREE.Color
      
      // Check if on main road (Z-axis road - runs North-South through all chunks)
      const onRoadZ = Math.abs(worldX) < ROAD_WIDTH / 2
      // Check if on cross road (X-axis road)  
      const onRoadX = Math.abs(worldZ) < ROAD_WIDTH / 2
      const onRoad = onRoadZ || onRoadX
      
      if (onRoad) {
        // Road surface with proper markings like Image #2
        let isCenterLine = false
        let isEdgeLine = false
        let isLaneLine = false
        
        if (onRoadZ && !onRoadX) {
          // On Z-axis road - center line at x=0
          isCenterLine = Math.abs(worldX) < 0.15
          // Lane lines at ±3.5m (divides 14m road into ~3.5m lanes)
          isLaneLine = Math.abs(Math.abs(worldX) - 3.5) < 0.12
          // Edge lines near road edge
          isEdgeLine = Math.abs(worldX) > ROAD_WIDTH/2 - 0.3
        } else if (onRoadX && !onRoadZ) {
          // On X-axis road - center line at z=0
          isCenterLine = Math.abs(worldZ) < 0.15
          isLaneLine = Math.abs(Math.abs(worldZ) - 3.5) < 0.12
          isEdgeLine = Math.abs(worldZ) > ROAD_WIDTH/2 - 0.3
        }
        
        // Dashed pattern for center line (every 4m)
        const dashPos = onRoadZ ? Math.floor(Math.abs(worldZ)) : Math.floor(Math.abs(worldX))
        const isDashed = (dashPos % 8) < 4
        
        if (isCenterLine && isDashed) {
          color = roadMarking
        } else if (isLaneLine && !isDashed) {
          // Dashed lane lines
          color = roadMarking.clone().multiplyScalar(0.9) // Slightly dimmer
        } else if (isEdgeLine) {
          color = roadMarking // Solid edge lines
        } else {
          color = roadAsphalt
        }
      } else {
        // Beautiful grass with natural variation like Image #2
        const noise1 = Math.sin(worldX * 0.005) * Math.cos(worldZ * 0.005)
        const noise2 = Math.sin(worldX * 0.012 + worldZ * 0.008) * 0.6
        const noise3 = Math.sin(worldX * 0.025 - worldZ * 0.02) * 0.3
        const variation = (noise1 + noise2 + noise3) * 0.18
        
        // Mix grass colors
        const t = Math.max(0, Math.min(1, (variation + 1) / 2))
        color = grassLight.clone().lerp(grassDark, t)
        
        // Add slight darker patches for depth
        const patchNoise = Math.sin(worldX * 0.04) * Math.cos(worldZ * 0.035)
        if (patchNoise > 0.6) {
          color.multiplyScalar(0.88)
        }
        
        // Road shoulder transition (slightly different green near roads)
        const distToRoad = Math.min(
          Math.abs(worldX) - ROAD_WIDTH/2,
          Math.abs(worldZ) - ROAD_WIDTH/2
        )
        if (distToRoad > 0 && distToRoad < 3) {
          const shoulderBlend = 1 - (distToRoad / 3)
          color.lerp(shoulderColor, shoulderBlend * 0.4)
        }
      }
      
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
    })
    
    return { geometry: geo, material: mat }
  }, [cx, cz])
  
  return (
    <mesh 
      geometry={geometry} 
      material={material}
      position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}
      receiveShadow={false}
    />
  )
}

// ============================================================
// SCENERY CHUNK - Trees, flowers, bushes for one chunk
// ============================================================
function SceneryChunk({ cx, cz }: { cx: number; cz: number }) {
  const items = useMemo(() => {
    const result: JSX.Element[] = []
    const rand = seededRandom(cx * 1000 + cz + 12345)
    
    const worldOffsetX = cx * CHUNK_SIZE
    const worldOffsetZ = cz * CHUNK_SIZE
    
    // Place trees (avoid roads)
    const treeCount = 15 + Math.floor(rand() * 10) // 15-25 trees per chunk
    
    for (let i = 0; i < treeCount; i++) {
      const localX = (rand() - 0.5) * CHUNK_SIZE * 0.9
      const localZ = (rand() - 0.5) * CHUNK_SIZE * 0.9
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      // Skip if too close to road
      const distToRoadZ = Math.abs(worldX)
      const distToRoadX = Math.abs(worldZ)
      if (distToRoadZ < ROAD_WIDTH/2 + 4 || distToRoadX < ROAD_WIDTH/2 + 4) continue
      
      const scale = 0.7 + rand() * 0.8
      const treeType = Math.floor(rand() * 3)
      
      result.push(
        <Tree 
          key={`tree-${i}`}
          position={[localX, 0, localZ]} 
          scale={scale}
          type={treeType}
        />
      )
    }
    
    // Flower patches along roadsides (like Image #2!)
    const flowerColors = ['#ff6b9d', '#c77dff', '#ffd93d', '#6bcb77', '#ff8c42', '#4d96ff']
    const flowerCount = 20 + Math.floor(rand() * 15)
    
    for (let i = 0; i < flowerCount; i++) {
      const side = rand() > 0.5 ? 1 : -1
      const whichRoad = rand() > 0.5 ? 'z' : 'x'
      
      let localX: number, localZ: number
      
      if (whichRoad === 'z') {
        // Along Z-axis road
        localX = side * (ROAD_WIDTH/2 + 2 + rand() * 8)
        localZ = (rand() - 0.5) * CHUNK_SIZE * 0.95
      } else {
        // Along X-axis road
        localX = (rand() - 0.5) * CHUNK_SIZE * 0.95
        localZ = side * (ROAD_WIDTH/2 + 2 + rand() * 8)
      }
      
      const color = flowerColors[Math.floor(rand() * flowerColors.length)]
      const y = 0.1 + rand() * 0.2
      
      result.push(
        <FlowerPatch 
          key={`flower-${i}`}
          position={[localX, y, localZ]}
          color={color}
        />
      )
    }
    
    // Occasional bushes
    const bushCount = 5 + Math.floor(rand() * 5)
    for (let i = 0; i < bushCount; i++) {
      const localX = (rand() - 0.5) * CHUNK_SIZE * 0.85
      const localZ = (rand() - 0.5) * CHUNK_SIZE * 0.85
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      // Skip if on road
      if (Math.abs(worldX) < ROAD_WIDTH/2 + 2 || Math.abs(worldZ) < ROAD_WIDTH/2 + 2) continue
      
      const bushScale = 0.4 + rand() * 0.5
      
      result.push(
        <mesh key={`bush-${i}`} position={[localX, bushScale * 0.5, localZ]} scale={[bushScale, bushScale * 0.7, bushScale]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#2e7d32" roughness={0.9} />
        </mesh>
      )
    }
    
    return result
  }, [cx, cz])
  
  return (
    <group position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}>
      {items}
    </group>
  )
}

// ============================================================
// MAIN TERRAIN MANAGER - Handles chunk loading/unloading
// Loads AHEAD of player so no pop-in!
// ============================================================
export function Terrain() {
  const vehiclePosition = useGameStore((s) => s.vehicle.position)
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set())
  const lastPlayerChunk = useRef<{ x: number; z: number }>({ x: Infinity, z: Infinity })
  
  // Calculate which chunks should be active based on player position
  useFrame(() => {
    const px = vehiclePosition[0]
    const pz = vehiclePosition[2]
    
    // Current chunk player is in
    const playerCx = Math.floor(px / CHUNK_SIZE)
    const playerCz = Math.floor(pz / CHUNK_SIZE)
    
    // Only update if player moved to a new chunk (optimization!)
    if (playerCx === lastPlayerChunk.current.x && playerCz === lastPlayerChunk.current.z) {
      return
    }
    
    lastPlayerChunk.current = { x: playerCx, z: playerCz }
    
    // Generate all chunks within render distance
    const newChunks = new Set<string>()
    
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = playerCx + dx
        const cz = playerCz + dz
        newChunks.add(getChunkKey(cx, cz))
      }
    }
    
    setActiveChunks(newChunks)
  })
  
  // Render active chunks
  const chunks: JSX.Element[] = []
  const scenery: JSX.Element[] = []
  
  activeChunks.forEach(key => {
    const [cxStr, czStr] = key.split(',')
    const cx = parseInt(cxStr)
    const cz = parseInt(czStr)
    
    chunks.push(<TerrainChunk key={`terrain-${key}`} cx={cx} cz={cz} />)
    scenery.push(<SceneryChunk key={`scenery-${key}`} cx={cx} cz={cz} />)
  })
  
  return (
    <>
      {chunks}
      {scenery}
    </>
  )
}

// Keep backward compatibility
export function RoadDetails() {
  return null // Roads are now part of TerrainChunk
}

export function Scenery() {
  return null // Scenery is now part of SceneryChunk
}
