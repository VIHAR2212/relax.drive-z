'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Tree configuration - larger world, more trees
const TREE_COUNT = 400 // More trees for larger world
const WORLD_SIZE = 2000 // Match terrain size

// Tree types for variety
type TreeType = 'pine' | 'oak' | 'birch' | 'spruce'

interface TreeData {
  position: [number, number, number]
  scale: number
  type: TreeType
  rotation: number
}

export function TreesOptimized() {
  const trunkPineRef = useRef<THREE.InstancedMesh>(null)
  const foliagePineRef = useRef<THREE.InstancedMesh>(null)
  const trunkOakRef = useRef<THREE.InstancedMesh>(null)
  const foliageOakRef = useRef<THREE.InstancedMesh>(null)

  // Generate tree data with road avoidance for larger world
  const treeData = useMemo(() => {
    const trees: TreeData[] = []
    const isOnRoad = (x: number, z: number): boolean => {
      const ROAD_WIDTH = 14
      const margin = ROAD_WIDTH / 2 + 8 // Keep trees away from roads
      
      // Main highways
      const nearEdgeX = Math.abs(x) < margin && Math.abs(z) < 950
      const nearEdgeZ = Math.abs(z) < margin && Math.abs(x) < 950
      
      // Ring road
      const ringRadius = 600
      const distFromRing = Math.sqrt(x * x + z * z)
      const nearRing = Math.abs(distFromRing - ringRadius) < margin + 10
      
      // Diagonal highways
      const diag1Dist = Math.abs(x - z) / Math.sqrt(2)
      const diag2Dist = Math.abs(x + z) / Math.sqrt(2)
      const onDiag1 = diag1Dist < margin
      const onDiag2 = diag2Dist < margin
      
      return nearEdgeX || nearEdgeZ || nearRing || onDiag1 || onDiag2
    }

    let attempts = 0
    while (trees.length < TREE_COUNT && attempts < TREE_COUNT * 30) {
      attempts++
      
      // Spread across the entire world
      const x = (Math.random() - 0.5) * WORLD_SIZE * 0.95
      const z = (Math.random() - 0.5) * WORLD_SIZE * 0.95
      
      // Skip if on or too close to road
      if (isOnRoad(x, z)) continue
      
      // Minimum distance between trees (varied by region)
      const minDist = 6 + Math.random() * 4
      let tooClose = false
      for (const tree of trees) {
        const dx = tree.position[0] - x
        const dz = tree.position[2] - z
        if (dx * dx + dz * dz < minDist * minDist) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue
      
      // Tree type distribution (more realistic mix)
      let type: TreeType
      const rand = Math.random()
      if (rand < 0.35) {
        type = 'pine' // Coniferous
      } else if (rand < 0.65) {
        type = 'oak' // Deciduous
      } else if (rand < 0.82) {
        type = 'birch' // Birch
      } else {
        type = 'spruce' // Spruce
      }
      
      trees.push({
        position: [x, 0, z],
        scale: 0.7 + Math.random() * 1.0,
        type,
        rotation: Math.random() * Math.PI * 2,
      })
    }
    
    return trees
  }, [])

  // Separate into types for instancing
  const { pines, oaks, birches, spruces } = useMemo(() => ({
    pines: treeData.filter(t => t.type === 'pine'),
    oaks: treeData.filter(t => t.type === 'oak'),
    birches: treeData.filter(t => t.type === 'birch'),
    spruces: treeData.filter(t => t.type === 'spruce'),
  }), [treeData])

  // Initialize instances every frame (for proper positioning)
  useFrame(() => {
    const dummy = new THREE.Object3D()
    
    // Pine/Spruce trees - conical shape (InstancedMesh #1 & #2)
    const conicalTrees = [...pines, ...spruces]
    
    if (trunkPineRef.current) {
      conicalTrees.forEach((tree, i) => {
        dummy.position.set(tree.position[0], tree.position[1] + tree.scale * 0.8, tree.position[2])
        dummy.rotation.set(0, tree.rotation, 0)
        dummy.scale.setScalar(tree.scale * 0.8)
        dummy.updateMatrix()
        trunkPineRef.current!.setMatrixAt(i, dummy.matrix)
      })
      trunkPineRef.current.instanceMatrix.needsUpdate = true
    }

    if (foliagePineRef.current) {
      conicalTrees.forEach((tree, i) => {
        dummy.position.set(tree.position[0], tree.position[1] + tree.scale * 3.2, tree.position[2])
        dummy.rotation.set(0, tree.rotation, 0)
        dummy.scale.setScalar(tree.scale)
        dummy.updateMatrix()
        foliagePineRef.current!.setMatrixAt(i, dummy.matrix)
      })
      foliagePineRef.current.instanceMatrix.needsUpdate = true
    }

    // Oak/Birch trees - rounded canopy (InstancedMesh #3 & #4)
    const roundedTrees = [...oaks, ...birches]
    
    if (trunkOakRef.current) {
      roundedTrees.forEach((tree, i) => {
        dummy.position.set(tree.position[0], tree.position[1] + tree.scale * 1.4, tree.position[2])
        dummy.rotation.set(0, tree.rotation, 0)
        dummy.scale.setScalar(tree.scale * 0.85)
        dummy.updateMatrix()
        trunkOakRef.current!.setMatrixAt(i, dummy.matrix)
      })
      trunkOakRef.current.instanceMatrix.needsUpdate = true
    }

    if (foliageOakRef.current) {
      roundedTrees.forEach((tree, i) => {
        const heightMult = tree.type === 'birch' ? 4.2 : 3.8
        const widthMult = tree.type === 'birch' ? 1.0 : 1.15
        
        dummy.position.set(tree.position[0], tree.position[1] + tree.scale * heightMult, tree.position[2])
        dummy.rotation.set(0, tree.rotation, 0)
        dummy.scale.setScalar(tree.scale * widthMult)
        dummy.updateMatrix()
        foliageOakRef.current!.setMatrixAt(i, dummy.matrix)
      })
      foliageOakRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Coniferous Trees (Pines + Spruces) */}
      {/* Trunks */}
      <instancedMesh ref={trunkPineRef} args={[undefined, undefined, pines.length + spruces.length]}>
        <cylinderGeometry args={[0.12, 0.18, 2.2, 5]} />
        <meshStandardMaterial color="#5D4037" roughness={0.92} />
      </instancedMesh>
      
      {/* Foliage - conical shape */}
      <instancedMesh ref={foliagePineRef} args={[undefined, undefined, pines.length + spruces.length]}>
        <coneGeometry args={[2.0, 4.5, 7]} />
        <meshStandardMaterial 
          color="#2E7D32" 
          roughness={0.82}
        />
      </instancedMesh>

      {/* Deciduous Trees (Oaks + Birches) */}
      {/* Trunks */}
      <instancedMesh ref={trunkOakRef} args={[undefined, undefined, oaks.length + birches.length]}>
        <cylinderGeometry args={[0.16, 0.26, 3.0, 6]} />
        <meshStandardMaterial color="#4E342E" roughness={0.9} />
      </instancedMesh>
      
      {/* Foliage - rounded canopy */}
      <instancedMesh ref={foliageOakRef} args={[undefined, undefined, oaks.length + birches.length]}>
        <sphereGeometry args={[3.0, 8, 8]} />
        <meshStandardMaterial 
          color="#388E3C" 
          roughness={0.85}
        />
      </instancedMesh>
    </group>
  )
}
