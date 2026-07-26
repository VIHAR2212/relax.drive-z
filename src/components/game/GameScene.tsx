'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { Car } from './Car'
import { Terrain, RoadDetails, Scenery } from './Terrain'
import { TreesOptimized } from './Trees'
import { CameraController } from './CameraController'

export function GameScene() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{
          position: [0, 12, -25],
          fov: 65,
          near: 0.1,
          far: 25000, // Increased for 12km+ visibility!
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
          toneMapping: 3, // ACES Filmic
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 1.5]}
        shadows={false}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} color="#b4d4ff" />
        
        <directionalLight
          position={[200, 300, 100]}
          intensity={1.4}
          color="#fff5e6"
          castShadow={false}
        />
        
        <directionalLight
          position={[-100, 150, -50]}
          intensity={0.3}
          color="#a8c8ff"
        />
        
        <hemisphereLight
          args={['#87CEEB', '#3d5c3d', 0.4]}
        />

        {/* Sky */}
        <Suspense fallback={null}>
          <Sky
            distance={450000}
            sunPosition={[200, 100, 150]}
            inclination={0.52}
            azimuth={0.25}
            rayleigh={2}
            turbidity={8}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />
          
          <Stars 
            radius={200}
            depth={50}
            count={500}
            factor={4}
            saturation={0}
            fade
            speed={0.2}
          />
        </Suspense>

        {/* Fog for depth - adjusted for 12km visibility */}
        <fog attach="fog" args={['#c8e6ff', 8000, 15000]} />

        {/* World */}
        <Terrain />
        <RoadDetails />
        <TreesOptimized />
        <Scenery />

        {/* Player vehicle */}
        <Car />

        {/* Camera controller */}
        <CameraController />
      </Canvas>
    </div>
  )
}
