'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/useGameStore'

// Camera configuration - more cinematic for realistic feel
const CAMERA = {
  // Third-person chase camera offset (further back for better view)
  OFFSET: new THREE.Vector3(0, 5, -14),
  
  // Look-at offset (slightly above and in front of car)
  LOOK_AT_OFFSET: new THREE.Vector3(0, 1.8, 6),
  
  // Smoothing (lower = smoother but more lag)
  SMOOTHING: 4.0,
  
  // FOV
  FOV: 65,
}

export function CameraController() {
  const cameraRef = useThree((state) => state.camera)
  
  const currentPos = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())
  
  const vehicle = useGameStore((s) => s.vehicle)
  const hasStarted = useGameStore((s) => s.hasStarted)

  useFrame((_, delta) => {
    if (!hasStarted) return

    const clampedDelta = Math.min(delta, 0.1)
    
    // Get car position and rotation
    const carPosition = new THREE.Vector3(...vehicle.position)
    const carRotation = vehicle.rotation
    
    // Calculate desired camera position in world space
    const desiredOffset = CAMERA.OFFSET.clone()
    desiredOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation)
    const desiredPosition = carPosition.clone().add(desiredOffset)
    
    // Calculate look-at target
    const desiredLookAtOffset = CAMERA.LOOK_AT_OFFSET.clone()
    desiredLookAtOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation)
    const desiredLookAt = carPosition.clone().add(desiredLookAtOffset)
    
    // Smooth interpolation (exponential smoothing for natural feel)
    const smoothFactor = 1 - Math.exp(-CAMERA.SMOOTHING * clampedDelta)
    
    currentPos.current.lerp(desiredPosition, smoothFactor)
    currentLookAt.current.lerp(desiredLookAt, smoothFactor)
    
    // Apply to camera
    cameraRef.position.copy(currentPos.current)
    cameraRef.lookAt(currentLookAt.current)
    
    // Dynamic FOV based on speed (subtle zoom effect at high speeds)
    const speedKmh = Math.abs(vehicle.velocity * 3.6)
    // Slight zoom at high speed for dynamic feel
    // Note: FOV changes applied via camera native properties
  })

  return null // This component doesn't render anything
}
