'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

// World configuration - Optimized for performance
const WORLD_SIZE = 1000 // 1km x 1km world
const ROAD_WIDTH = 12

export function Terrain() {
  // Generate terrain geometry - optimized for performance
  const { geometry, material } = useMemo(() => {
    const size = WORLD_SIZE
    const segments = 64 // Balanced detail vs performance
    
    // Create flat terrain plane
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    // Color palette
    const grassColor = new THREE.Color('#4a7c4e')
    const roadColor = new THREE.Color('#333333')
    const shoulderColor = new THREE.Color('#444444')
    const markingColor = new THREE.Color('#dddddd')

    // Generate colors based on position
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      
      let color: THREE.Color
      
      // Check if on road (simple cross pattern)
      const onRoadX = Math.abs(x) < ROAD_WIDTH / 2
      const onRoadZ = Math.abs(z) < ROAD_WIDTH / 2
      const onRoad = onRoadX || onRoadZ
      
      if (onRoad) {
        // Road surface
        const isCenterLine = (onRoadX && Math.abs(x) < 0.2) || (onRoadZ && Math.abs(z) < 0.2)
        const isEdgeLine = (onRoadX && Math.abs(x) > ROAD_WIDTH / 2 - 0.3 && Math.abs(x) < ROAD_WIDTH / 2) ||
                          (onRoadZ && Math.abs(z) > ROAD_WIDTH / 2 - 0.3 && Math.abs(z) < ROAD_WIDTH / 2)
        
        if (isCenterLine || isEdgeLine) {
          color = markingColor
        } else {
          color = roadColor
        }
      } else {
        // Grass with subtle variation
        const variation = (Math.sin(x * 0.01) * Math.cos(z * 0.01)) * 0.1
        color = grassColor.clone().offsetHSL(0, 0, variation)
      }
      
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    })

    return { geometry: geo, material: mat }
  }, [])

  return (
    <mesh 
      geometry={geometry} 
      material={material} 
      receiveShadow={false}
      position={[0, 0, 0]}
    />
  )
}

// Simple road barriers
export function RoadDetails() {
  const barrierPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    // Add barriers along roads
    for (let i = -450; i < 450; i += 30) {
      positions.push([ROAD_WIDTH / 2 + 0.5, 0.5, i])
      positions.push([-ROAD_WIDTH / 2 - 0.5, 0.5, i])
      positions.push([i, 0.5, ROAD_WIDTH / 2 + 0.5])
      positions.push([i, 0.5, -ROAD_WIDTH / 2 - 0.5])
    }
    
    return positions
  }, [])

  const barrierMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#888888', 
      roughness: 0.7,
      metalness: 0.6,
    }),
    []
  )

  return (
    <group>
      {barrierPositions.map((pos, i) => (
        <mesh 
          key={`barrier-${i}`}
          position={pos}
          material={barrierMaterial}
        >
          <boxGeometry args={[0.15, 0.8, 8]} />
        </mesh>
      ))}
    </group>
  )
}

// Simple scenery rocks
export function Scenery() {
  const rockPositions = useMemo(() => [
    [60, 0.4, 80], [-100, 0.35, -70], [150, 0.3, 50],
    [-180, 0.45, -120], [120, 0.25, -140], [-150, 0.38, 180],
    [220, 0.42, 220], [-260, 0.35, -220], [350, 0.28, -280],
    [-320, 0.32, 350], [50, 0.4, -250], [-60, 0.25, 280],
  ] as [number, number, number][])

  const rockMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color: '#6b7280', 
      roughness: 0.92,
      metalness: 0.08,
    }),
    []
  )

  return (
    <group>
      {rockPositions.map((pos, i) => (
        <mesh 
          key={`rock-${i}`}
          position={pos}
          scale={[0.8 + Math.random() * 0.6, 0.6, 0.8 + Math.random() * 0.6]}
          material={rockMaterial}
        >
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}
