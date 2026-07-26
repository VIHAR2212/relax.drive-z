'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// ============================================================
// COMPLETE WORLD SYSTEM - Mountains, Tunnels, Rocks, Curved Roads
// ============================================================

const CHUNK_SIZE = 400
const RENDER_DISTANCE = 12
const ROAD_WIDTH = 16
const ROAD_VISIBLE_HEIGHT_OFFSET = 0.05

// Seeded random for consistent world generation
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

// ============================================================
// HEIGHT/TERRAIN GENERATOR - Creates mountains and hills!
// ============================================================
function getTerrainHeight(x: number, z: number): number {
  // Multiple noise layers for natural-looking mountains
  let height = 0
  
  // Large mountains (far apart, tall)
  const mountain1 = Math.sin(x * 0.0008) * Math.cos(z * 0.0006) 
  const mountain2 = Math.sin(x * 0.0012 + 1.5) * Math.cos(z * 0.001)
  height += (mountain1 + mountain2) * 25
  
  // Medium hills
  const hill1 = Math.sin(x * 0.003) * Math.cos(z * 0.0025)
  const hill2 = Math.sin(x * 0.004 + 0.8) * Math.cos(z * 0.0035)
  height += (hill1 + hill2) * 10
  
  // Small bumps/rocks
  const bump1 = Math.sin(x * 0.02) * Math.cos(z * 0.018)
  const bump2 = Math.sin(x * 0.035 + 2) * Math.cos(z * 0.03)
  height += (bump1 + bump2) * 2
  
  // Occasional tall peaks (using absolute value for sharp peaks)
  const peakNoise = Math.abs(Math.sin(x * 0.0015) * Math.cos(z * 0.0012))
  if (peakNoise > 0.85) {
    height += (peakNoise - 0.85) * 150 // Tall peak!
  }
  
  return Math.max(0, height) // No negative heights
}

// Check if point is inside a tunnel (road through mountain)
function isInTunnel(x: number, z: number, roads: RoadSegment[]): boolean {
  for (const road of roads) {
    if (road.type !== 'main') continue
    
    const points = road.points
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i]
      const [x2, z2] = points[i + 1]
      
      // Distance to road segment
      const A = x - x1, B = z - z1, C = x2 - x1, D = z2 - z1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      if (lenSq === 0) continue
      
      const param = Math.max(0, Math.min(1, dot / lenSq))
      const xx = x1 + param * C
      const zz = z1 + param * D
      const dist = Math.sqrt((x - xx) ** 2 + (z - zz) ** 2)
      
      if (dist < road.width / 2 + 4) { // Within tunnel width
        const terrainH = getTerrainHeight(xx, zz)
        if (terrainH > 8) { // Mountain is tall enough for tunnel
          return true
        }
      }
    }
  }
  return false
}

// Get tunnel clearance height at position
function getTunnelHeight(x: number, z: number, roads: RoadSegment[]): number {
  for (const road of roads) {
    if (road.type !== 'main') continue
    
    const points = road.points
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i]
      const [x2, z2] = points[i + 1]
      
      const A = x - x1, B = z - z1, C = x2 - x1, D = z2 - z1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      if (lenSq === 0) continue
      
      const param = Math.max(0, Math.min(1, dot / lenSq))
      const xx = x1 + param * C
      const zz = z1 + param * D
      const dist = Math.sqrt((x - xx) ** 2 + (z - zz) ** 2)
      
      if (dist < road.width / 2 + 3) {
        const terrainH = getTerrainHeight(xx, zz)
        if (terrainH > 8) {
          return 7 // Tunnel is 7 units high
        }
      }
    }
  }
  return Infinity // No tunnel here
}

// ============================================================
// ROAD NETWORK GENERATOR
// ============================================================
interface RoadSegment {
  points: [number, number][]
  width: number
  type: 'main' | 'service' | 'village'
}

function generateRoadNetwork(): RoadSegment[] {
  const roads: RoadSegment[] = []
  
  // Main highway N-S with curves
  const mainRoadNS: [number, number][] = []
  for (let z = -20000; z < 20000; z += 40) {
    const curveOffset = Math.sin(z * 0.0008) * 80 + Math.sin(z * 0.002) * 30
    mainRoadNS.push([curveOffset, z])
  }
  roads.push({ points: mainRoadNS, width: ROAD_WIDTH, type: 'main' })
  
  // Main highway E-W with curves
  const mainRoadEW: [number, number][] = []
  for (let x = -20000; x < 20000; x += 40) {
    const curveOffset = Math.sin(x * 0.001) * 60 + Math.sin(x * 0.0025) * 25
    mainRoadEW.push([x, curveOffset])
  }
  roads.push({ points: mainRoadEW, width: ROAD_WIDTH, type: 'main' })
  
  // Diagonal highways with sharp turns
  const diagRoad1: [number, number][] = []
  for (let t = -150; t <= 150; t += 2) {
    const dist = t * 100
    diagRoad1.push([
      dist + Math.sin(t * 0.15) * 120,
      dist * 0.7 + Math.cos(t * 0.1) * 80
    ])
  }
  roads.push({ points: diagRoad1, width: 14, type: 'main' })
  
  const diagRoad2: [number, number][] = []
  for (let t = -150; t <= 150; t += 2) {
    const dist = t * 100
    diagRoad2.push([
      -dist + Math.sin(t * 0.12) * 100,
      dist * 0.6 + Math.cos(t * 0.08) * 90
    ])
  }
  roads.push({ points: diagRoad2, width: 14, type: 'main' })
  
  // Service roads to villages
  const villageLocations = [
    { x: 500, z: 800 }, { x: -600, z: 1200 },
    { x: 900, z: -700 }, { x: -800, z: -1100 },
    { x: 1500, z: 1500 }, { x: -1400, z: -1600 },
    { x: 2000, z: 400 }, { x: -2100, z: -300 },
  ]
  
  villageLocations.forEach((village, idx) => {
    const serviceRoad: [number, number][] = []
    const startZ = village.z > 0 ? village.z - 400 : village.z + 400
    const startX = Math.sin(startZ * 0.0008) * 80 + Math.sin(startZ * 0.002) * 30
    
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      serviceRoad.push([
        startX + (village.x - startX) * t + Math.sin(t * Math.PI * 2) * 40,
        startZ + (village.z - startZ) * t + Math.cos(t * Math.PI * 3) * 30
      ])
    }
    roads.push({ points: serviceRoad, width: 10, type: 'service' })
    
    if (idx < 4) {
      const villageLoop: [number, number][] = []
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.3) {
        const radius = 80 + Math.sin(angle * 3) * 30
        villageLoop.push([
          village.x + Math.cos(angle) * radius,
          village.z + Math.sin(angle) * radius
        ])
      }
      roads.push({ points: villageLoop, width: 8, type: 'village' })
    }
  })
  
  return roads
}

function isPointOnRoad(x: number, z: number, roads: RoadSegment[]): { onRoad: boolean; distanceToEdge: number; roadWidth: number } {
  let closestDist = Infinity
  let closestWidth = ROAD_WIDTH
  
  for (const road of roads) {
    const points = road.points
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i]
      const [x2, z2] = points[i + 1]
      
      const A = x - x1, B = z - z1, C = x2 - x1, D = z2 - z1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      if (lenSq === 0) continue
      
      const param = Math.max(0, Math.min(1, dot / lenSq))
      const xx = x1 + param * C
      const zz = z1 + param * D
      const dist = Math.sqrt((x - xx) ** 2 + (z - zz) ** 2)
      
      if (dist < closestDist) {
        closestDist = dist
        closestWidth = road.width
      }
    }
  }
  
  return {
    onRoad: closestDist < closestWidth / 2,
    distanceToEdge: closestDist - closestWidth / 2,
    roadWidth: closestWidth
  }
}

// ============================================================
// TREE COMPONENT
// ============================================================
function Tree({ position, scale = 1, type = 0 }: { 
  position: [number, number, number]; scale?: number; type?: number 
}) {
  const trunkHeight = (1.5 + Math.random() * 0.6) * scale
  const canopyRadius = (1.8 + Math.random() * 0.8) * scale
  const treeTypes = ['pine', 'round', 'oak']
  const treeType = treeTypes[type % 3]
  
  return (
    <group position={position}>
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.15 * scale, 0.22 * scale, trunkHeight, 8]} />
        <meshStandardMaterial color="#5D4037" roughness={0.95} />
      </mesh>
      {treeType === 'pine' ? (
        <>
          <mesh position={[0, trunkHeight + canopyRadius * 0.5, 0]}>
            <coneGeometry args={[canopyRadius * 0.7, canopyRadius * 1.5, 8]} />
            <meshStandardMaterial color="#1B5E20" roughness={0.85} />
          </mesh>
          <mesh position={[0, trunkHeight + canopyRadius * 1.1, 0]}>
            <coneGeometry args={[canopyRadius * 0.55, canopyRadius * 1.2, 8]} />
            <meshStandardMaterial color="#2E7D32" roughness={0.85} />
          </mesh>
        </>
      ) : treeType === 'round' ? (
        <mesh position={[0, trunkHeight + canopyRadius * 0.6, 0]}>
          <sphereGeometry args={[canopyRadius, 10, 10]} />
          <meshStandardMaterial color="#388E3C" roughness={0.85} />
        </mesh>
      ) : (
        <mesh position={[0, trunkHeight + canopyRadius * 0.55, 0]} scale={[1.2, 0.9, 1.2]}>
          <sphereGeometry args={[canopyRadius * 0.9, 10, 10]} />
          <meshStandardMaterial color="#43A047" roughness={0.85} />
        </mesh>
      )}
    </group>
  )
}

// ============================================================
// ROCK COMPONENT - Variable sizes!
// ============================================================
function Rock({ position, scale = 1, type = 0 }: { 
  position: [number, number, number]; scale?: number; type?: number 
}) {
  const rockTypes = ['boulder', 'stone', 'pebble']
  const rockType = rockTypes[type % 3]
  
  // Random rotation for variety
  const rotX = Math.random() * 0.3
  const rotY = Math.random() * Math.PI * 2
  const rotZ = Math.random() * 0.2
  
  // Rock colors - gray variations
  const colors = ['#6b7280', '#9ca3af', '#4b5563', '#78716c', '#a8a29e']
  const color = colors[Math.floor(Math.random() * colors.length)]
  
  return (
    <group position={position} rotation={[rotX, rotY, rotZ]}>
      {rockType === 'boulder' ? (
        // Large boulder - irregular shape
        <mesh scale={scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} roughness={0.92} metalness={0.05} flatShading />
        </mesh>
      ) : rockType === 'stone' ? (
        // Medium stone
        <mesh scale={scale * 0.7}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} roughness={0.88} metalness={0.08} flatShading />
        </mesh>
      ) : (
        // Small pebble cluster
        <group scale={scale * 0.4}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.8, 6, 6]} />
            <meshStandardMaterial color={color} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0.4, 0.1, 0.2]} scale={0.5}>
            <sphereGeometry args={[0.7, 5, 5]} />
            <meshStandardMaterial color={color} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[-0.3, 0.05, -0.25]} scale={0.4}>
            <sphereGeometry args={[0.75, 5, 5]} />
            <meshStandardMaterial color={color} roughness={0.9} flatShading />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ============================================================
// FLOWER COMPONENT
// ============================================================
function FlowerPatch({ position, color, size = 1 }: { position: [number, number, number]; color: string; size?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, size * 0.08, 0]}>
        <cylinderGeometry args={[0.01, 0.01, size * 0.15, 4]} />
        <meshStandardMaterial color="#388E3C" />
      </mesh>
      <mesh position={[0, size * 0.18, 0]}>
        <sphereGeometry args={[size * 0.06, 6, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

// ============================================================
// GUARDRAIL COMPONENT
// ============================================================
function GuardRailSegment({ start, end, side = 'left', groundHeight = 0 }: { 
  start: [number, number]; end: [number, number]; side?: 'left' | 'right'; groundHeight?: number
}) {
  const direction = side === 'left' ? -1 : 1
  const dx = end[0] - start[0], dz = end[1] - start[1]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const midX = (start[0] + end[0]) / 2
  const midZ = (start[1] + end[1]) / 2
  
  const offsetX = Math.cos(angle) * direction * (ROAD_WIDTH / 2 + 0.4)
  const offsetZ = -Math.sin(angle) * direction * (ROAD_WIDTH / 2 + 0.4)
  
  return (
    <group position={[midX + offsetX, groundHeight + 0.55, midZ + offsetZ]} rotation={[0, angle, 0]}>
      <mesh position={[-length * 0.4, -0.25, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[length * 0.4, -0.25, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[Math.max(length, 1), 0.06, 0.04]} />
        <meshStandardMaterial color="#bdc3c7" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[Math.max(length, 1), 0.04, 0.03]} />
        <meshStandardMaterial color="#95a5a6" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ============================================================
// TUNNEL COMPONENT - Cut through mountains!
// ============================================================
function TunnelSegment({ start, end, width, tunnelHeight = 7 }: { 
  start: [number, number, number]; end: [number, number, number]; width: number; tunnelHeight?: number 
}) {
  const dx = end[0] - start[0], dy = end[1] - start[1], dz = end[2] - start[2]
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const midX = (start[0] + end[0]) / 2
  const midY = (start[1] + end[1]) / 2
  const midZ = (start[2] + end[2]) / 2
  
  return (
    <group position={[midX, midY, midZ]} rotation={[0, angle, 0]}>
      {/* Tunnel floor (road level) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[width, 0.3, length]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      
      {/* Tunnel ceiling */}
      <mesh position={[0, tunnelHeight, 0]}>
        <boxGeometry args={[width + 1, 0.5, length]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-width/2 - 0.25, tunnelHeight/2, 0]}>
        <boxGeometry args={[0.5, tunnelHeight, length]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[width/2 + 0.25, tunnelHeight/2, 0]}>
        <boxGeometry args={[0.5, tunnelHeight, length]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      
      {/* Arch support beams every few meters */}
      {[...Array(Math.floor(length / 8))].map((_, i) => (
        <mesh key={`beam-${i}`} position={[0, tunnelHeight * 0.6, -length/2 + 4 + i * 8]}>
          {/* Arch shape using scaled torus-like geometry */}
          <torusGeometry args={[width/2.5, 0.15, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#3d3d3d" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      
      {/* Lights along ceiling */}
      {[...Array(Math.floor(length / 10))].map((_, i) => (
        <pointLight 
          key={`light-${i}`}
          position={[0, tunnelHeight - 0.8, -length/2 + 5 + i * 10]}
          intensity={0.5}
          distance={8}
          color="#ffeedd"
        />
      ))}
    </group>
  )
}

// ============================================================
// HOUSE COMPONENT
// ============================================================
function House({ position, color = '#e74c3c', scale = 1 }: { 
  position: [number, number, number]; color?: string; scale?: number 
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#ecf0f1" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <coneGeometry args={[2.5, 1.8, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.75, 1.51]}>
        <boxGeometry args={[0.8, 1.5, 0.05]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[-0.7, 1.8, 1.51]}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.7, 1.8, 1.51]}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

// ============================================================
// TERRAIN CHUNK - With MOUNTAINS! (Variable height)
// ============================================================
function TerrainChunk({ cx, cz, roadNetwork }: { cx: number; cz: number; roadNetwork: RoadSegment[] }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 70, 70)
    geo.rotateX(-Math.PI / 2)
    
    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)
    
    const grassLight = new THREE.Color('#4CAF50')
    const grassDark = new THREE.Color('#2E7D32')
    const rockColor = new THREE.Color('#78716c')
    const snowColor = new THREE.Color('#f1f5f9')
    const roadAsphalt = new THREE.Color('#1a1a1a')
    roadAsphalt.convertSRGBToLinear()
    const roadMarking = new THREE.Color('#FFFFFF')
    const shoulderColor = new THREE.Color('#66BB6A')
    
    const worldOffsetX = cx * CHUNK_SIZE
    const worldOffsetZ = cz * CHUNK_SIZE
    
    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i]
      const localZ = positions[i + 2]
      
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      // GET TERRAIN HEIGHT (MOUNTAIN!)
      const height = getTerrainHeight(worldX, worldZ)
      
      // Set Y position (this creates the 3D terrain!)
      positions[i + 1] = height
      
      let color: THREE.Color
      
      // Check if in tunnel (flatten for road)
      const inTunnel = isInTunnel(worldX, worldZ, roadNetwork)
      if (inTunnel) {
        positions[i + 1] = 0 // Flatten for tunnel
      }
      
      // Check if on road
      const roadInfo = isPointOnRoad(worldX, worldZ, roadNetwork)
      
      if (roadInfo.onRoad && !inTunnel) {
        // Road surface - keep at road level with slight slope following terrain
        const roadBaseHeight = getTerrainHeight(worldX, worldZ) * 0.1 // Mostly flat but slight contour
        positions[i + 1] = roadBaseHeight
        
        const distFromCenter = roadInfo.distanceToEdge + roadInfo.roadWidth / 2
        const normalizedDist = Math.abs(distFromCenter) / (roadInfo.roadWidth / 2)
        
        if (normalizedDist > 0.88) {
          color = roadMarking
        } else if (normalizedDist < 0.08) {
          const dashPattern = (Math.floor(Math.abs(worldZ) / 4) + Math.floor(Math.abs(worldX) / 4)) % 2
          color = dashPattern === 0 ? roadMarking : roadAsphalt.clone().multiplyScalar(0.7)
        } else if ((normalizedDist > 0.3 && normalizedDist < 0.36) || (normalizedDist > 0.62 && normalizedDist < 0.68)) {
          const dashPattern = (Math.floor(Math.abs(worldZ) / 3)) % 2
          color = dashPattern === 0 ? roadMarking.clone().multiplyScalar(0.85) : roadAsphalt
        } else {
          const asphaltVariation = 0.95 + Math.sin(worldX * 0.1 + worldZ * 0.1) * 0.05
          color = roadAsphalt.clone().multiplyScalar(asphaltVariation)
        }
      } else if (height > 35) {
        // Snow caps on very tall mountains!
        const snowBlend = Math.min(1, (height - 35) / 20)
        color = grassLight.clone().lerp(snowColor, snowBlend)
      } else if (height > 20) {
        // Rocky mountain area
        const rockBlend = (height - 20) / 15
        color = grassDark.clone().lerp(rockColor, rockBlend)
      } else if (height > 8) {
        // Higher ground - darker grass
        const slopeBlend = (height - 8) / 12
        color = grassLight.clone().lerp(grassDark, slopeBlend)
      } else {
        // Normal grass with variation
        const noise1 = Math.sin(worldX * 0.003) * Math.cos(worldZ * 0.003)
        const noise2 = Math.sin(worldX * 0.008 + worldZ * 0.006) * 0.5
        const noise3 = Math.cos(worldX * 0.015 - worldZ * 0.01) * 0.25
        const variation = (noise1 + noise2 + noise3) * 0.2
        
        const t = Math.max(0, Math.min(1, (variation + 1) / 2))
        color = grassLight.clone().lerp(grassDark, t)
        
        if (roadInfo.distanceToEdge < 5 && roadInfo.distanceToEdge > 0) {
          const shoulderBlend = 1 - (roadInfo.distanceToEdge / 5)
          color.lerp(shoulderColor, shoulderBlend * 0.5)
        }
        
        if (Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.04) > 0.65) {
          color.multiplyScalar(0.85)
        }
      }
      
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true // Gives rocky/mountain look!
    })
    
    return { geometry: geo, material: mat }
  }, [cx, cz, roadNetwork])
  
  return (
    <mesh 
      geometry={geometry} 
      material={material}
      position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}
      receiveShadow
    />
  )
}

// ============================================================
// ROAD MESHES - Follows terrain contours
// ============================================================
function RoadMeshes({ roadNetwork, chunkX, chunkZ }: { 
  roadNetwork: RoadSegment[]; chunkX: number; chunkZ: number 
}) {
  const meshes = useMemo(() => {
    const result: JSX.Element[] = []
    const chunkMinX = chunkX * CHUNK_SIZE - 50
    const chunkMaxX = chunkMinX + CHUNK_SIZE + 100
    const chunkMinZ = chunkZ * CHUNK_SIZE - 50
    const chunkMaxZ = chunkMinZ + CHUNK_SIZE + 100
    
    const tunnelSegments: { start: [number, number, number]; end: [number, number, number]; width: number }[] = []
    
    roadNetwork.forEach((road, roadIdx) => {
      const points = road.points
      
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, z1] = points[i]
        const [x2, z2] = points[i + 1]
        
        const segMinX = Math.min(x1, x2), segMaxX = Math.max(x1, x2)
        const segMinZ = Math.min(z1, z2), segMaxZ = Math.max(z1, z2)
        
        if (segMaxX < chunkMinX || segMinX > chunkMaxX || segMaxZ < chunkMinZ || segMinZ > chunkMaxZ) continue
        
        const dx = x2 - x1, dz = z2 - z1
        const length = Math.sqrt(dx * dx + dz * dz)
        const angle = Math.atan2(dx, dz)
        const midX = (x1 + x2) / 2
        const midZ = (z1 + z2) / 2
        
        // Get terrain height at road position
        const h1 = getTerrainHeight(x1, z1)
        const h2 = getTerrainHeight(x2, z2)
        const avgHeight = (h1 + h2) / 2
        const inTunnel = avgHeight > 8 && road.type === 'main'
        
        // Road surface height
        const roadY = inTunnel ? ROAD_VISIBLE_HEIGHT_OFFSET : avgHeight + ROAD_VISIBLE_HEIGHT_OFFSET
        
        result.push(
          <mesh key={`road-${roadIdx}-${i}`} position={[midX, roadY, midZ]} rotation={[0, angle, 0]} receiveShadow>
            <planeGeometry args={[road.width, length + 0.5]} />
            <meshStandardMaterial color="#222222" roughness={0.82} metalness={0.0} />
          </mesh>
        )
        
        // Center line markings
        if (i % 2 === 0) {
          result.push(
            <mesh key={`cl-${roadIdx}-${i}`} position={[midX, roadY + 0.005, midZ]} rotation={[0, angle, 0]}>
              <planeGeometry args={[0.2, length * 0.4]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.15} />
            </mesh>
          )
        }
        
        // Edge lines
        ;[['l', 1] as const, ['r', -1] as const].forEach(([side, dir]) => {
          result.push(
            <mesh
              key={`el-${side}-${roadIdx}-${i}`}
              position={[
                midX + Math.cos(angle + Math.PI/2) * (road.width/2 - 0.2),
                roadY + 0.005,
                midZ + Math.sin(angle + Math.PI/2) * (road.width/2 - 0.2)
              ]}
              rotation={[0, angle, 0]}
            >
              <planeGeometry args={[0.15, length + 0.5]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          )
        })
        
        // Guardrails for main roads (not in tunnels)
        if (road.type === 'main' && i % 3 === 0 && !inTunnel) {
          result.push(<GuardRailSegment key={`gr-l-${roadIdx}-${i}`} start={[x1, z1]} end={[x2, z2]} side="left" groundHeight={avgHeight} />)
          result.push(<GuardRailSegment key={`gr-r-${roadIdx}-${i}`} start={[x1, z1]} end={[x2, z2]} side="right" groundHeight={avgHeight} />)
        }
        
        // Collect tunnel segments
        if (inTunnel) {
          tunnelSegments.push({
            start: [x1, ROAD_VISIBLE_HEIGHT_OFFSET, z1],
            end: [x2, ROAD_VISIBLE_HEIGHT_OFFSET, z2],
            width: road.width
          })
        }
      }
    })
    
    // Add tunnel meshes
    tunnelSegments.forEach((seg, idx) => {
      result.push(
        <TunnelSegment
          key={`tunnel-${idx}`}
          start={seg.start}
          end={seg.end}
          width={seg.width}
          tunnelHeight={7}
        />
      )
    })
    
    return result
  }, [roadNetwork, chunkX, chunkZ])
  
  return <group>{meshes}</group>
}

// ============================================================
// SCENERY CHUNK - Trees, Flowers, Houses, ROCKS!
// ============================================================
function SceneryChunk({ cx, cz, roadNetwork }: { cx: number; cz: number; roadNetwork: RoadSegment[] }) {
  const items = useMemo(() => {
    const result: JSX.Element[] = []
    const rand = seededRandom(cx * 10000 + cz * 1000 + 42)
    
    const worldOffsetX = cx * CHUNK_SIZE
    const worldOffsetZ = cz * CHUNK_SIZE
    
    // Place TREES
    const treeCount = 18 + Math.floor(rand() * 10)
    for (let i = 0; i < treeCount; i++) {
      const localX = (rand() - 0.5) * CHUNK_SIZE * 0.92
      const localZ = (rand() - 0.5) * CHUNK_SIZE * 0.92
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      const roadInfo = isPointOnRoad(worldX, worldZ, roadNetwork)
      if (roadInfo.onRoad || roadInfo.distanceToEdge < 6) continue
      
      // Don't place trees on very steep slopes or too high
      const height = getTerrainHeight(worldX, worldZ)
      if (height > 45) continue // Above snow line
      
      const scale = 0.8 + rand() * 0.7
      const treeType = Math.floor(rand() * 3)
      
      result.push(<Tree key={`tree-${i}`} position={[localX, height, localZ]} scale={scale} type={treeType} />)
    }
    
    // Place ROCKS (Variable sizes!)
    const rockCount = 12 + Math.floor(rand() * 15)
    for (let i = 0; i < rockCount; i++) {
      const localX = (rand() - 0.5) * CHUNK_SIZE * 0.95
      const localZ = (rand() - 0.5) * CHUNK_SIZE * 0.95
      const worldX = localX + worldOffsetX
      const worldZ = localZ + worldOffsetZ
      
      const roadInfo = isPointOnRoad(worldX, worldZ, roadNetwork)
      if (roadInfo.onRoad || roadInfo.distanceToEdge < 4) continue
      
      const height = getTerrainHeight(worldX, worldZ)
      
      // Variable rock sizes based on location
      let rockScale: number
      const roll = rand()
      if (roll < 0.3) {
        rockScale = 0.3 + rand() * 0.4 // Small pebbles
      } else if (roll < 0.7) {
        rockScale = 0.7 + rand() * 0.8 // Medium stones
      } else {
        rockScale = 1.5 + rand() * 2.0 // Large boulders!
      }
      
      // More rocks in mountain areas
      if (height > 15 && rand() > 0.5) {
        rockScale *= 1.5 // Bigger rocks on mountains
      }
      
      const rockType = Math.floor(rand() * 3)
      result.push(<Rock key={`rock-${i}`} position={[localX, height + rockScale * 0.3, localZ]} scale={rockScale} type={rockType} />)
    }
    
    // FLOWERS along roadsides
    const flowerColors = ['#FF69B4', '#FFD700', '#DA70D6', '#87CEEB', '#FF6347', '#98FB98']
    const flowerCount = 22 + Math.floor(rand() * 12)
    
    for (let i = 0; i < flowerCount; i++) {
      const testX = (rand() - 0.5) * CHUNK_SIZE
      const testZ = (rand() - 0.5) * CHUNK_SIZE
      const worldTestX = testX + worldOffsetX
      const worldTestZ = testZ + worldOffsetZ
      
      const roadInfo = isPointOnRoad(worldTestX, worldTestZ, roadNetwork)
      if (!roadInfo.onRoad && roadInfo.distanceToEdge > 1 && roadInfo.distanceToEdge < 8) {
        const height = getTerrainHeight(worldTestX, worldTestZ)
        if (height > 30) continue // No flowers too high
        
        const color = flowerColors[Math.floor(rand() * flowerColors.length)]
        result.push(<FlowerPatch key={`flower-${i}`} position={[testX, height, testZ]} color={color} size={0.6 + rand() * 0.6} />)
      }
    }
    
    // VILLAGES with houses
    const shouldHaveVillage = Math.abs(cx + cz) % 7 === 0 && Math.abs(cx) > 2
    
    if (shouldHaveVillage) {
      const houseCount = 3 + Math.floor(rand() * 4)
      const roofColors = ['#e74c3c', '#c0392b', '#d35400', '#e67e22', '#8e44ad']
      const villageCenterX = (rand() - 0.5) * CHUNK_SIZE * 0.5
      const villageCenterZ = (rand() - 0.5) * CHUNK_SIZE * 0.5
      
      for (let i = 0; i < houseCount; i++) {
        const hx = villageCenterX + (rand() - 0.5) * 120
        const hz = villageCenterZ + (rand() - 0.5) * 120
        const worldHx = hx + worldOffsetX
        const worldHz = hz + worldOffsetZ
        
        const roadInfo = isPointOnRoad(worldHx, worldHz, roadNetwork)
        if (roadInfo.onRoad || roadInfo.distanceToEdge < 15) continue
        
        const height = getTerrainHeight(worldHx, worldHz)
        // Don't build houses on steep slopes or too high
        if (height > 25) continue
        
        const roofColor = roofColors[Math.floor(rand() * roofColors.length)]
        result.push(<House key={`house-${i}`} position={[hx, height, hz]} color={roofColor} scale={0.7 + rand() * 0.5} />)
      }
    }
    
    return result
  }, [cx, cz, roadNetwork])
  
  return <group position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}>{items}</group>
}

// ============================================================
// MAIN TERRAIN MANAGER
// ============================================================
export function Terrain() {
  const vehiclePosition = useGameStore((s) => s.vehicle.position)
  const [activeChunks, setActiveChunks] = useState<Set<string>>(new Set())
  const lastPlayerChunk = useRef<{ x: number; z: number }>({ x: Infinity, z: Infinity })
  
  const roadNetwork = useMemo(() => generateRoadNetwork(), [])
  
  useFrame(() => {
    const px = vehiclePosition[0], pz = vehiclePosition[2]
    const playerCx = Math.floor(px / CHUNK_SIZE), playerCz = Math.floor(pz / CHUNK_SIZE)
    
    if (playerCx === lastPlayerChunk.current.x && playerCz === lastPlayerChunk.current.z) return
    
    lastPlayerChunk.current = { x: playerCx, z: playerCz }
    
    const newChunks = new Set<string>()
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        newChunks.add(getChunkKey(playerCx + dx, playerCz + dz))
      }
    }
    setActiveChunks(newChunks)
  })
  
  const terrainChunks: JSX.Element[] = []
  const sceneryChunks: JSX.Element[] = []
  const roadMeshes: JSX.Element[] = []
  
  activeChunks.forEach(key => {
    const [cxStr, czStr] = key.split(',')
    const cx = parseInt(cxStr), cz = parseInt(czStr)
    
    terrainChunks.push(<TerrainChunk key={`terrain-${key}`} cx={cx} cz={cz} roadNetwork={roadNetwork} />)
    sceneryChunks.push(<SceneryChunk key={`scenery-${key}`} cx={cx} cz={cz} roadNetwork={roadNetwork} />)
    roadMeshes.push(<RoadMeshes key={`roads-${key}`} roadNetwork={roadNetwork} chunkX={cx} chunkZ={cz} />)
  })
  
  return (
    <>
      {terrainChunks}
      {roadMeshes}
      {sceneryChunks}
    </>
  )
}

export function RoadDetails() { return null }
export function Scenery() { return null }
