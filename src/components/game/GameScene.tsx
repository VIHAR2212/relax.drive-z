'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Stars, Cloud } from '@react-three/drei'
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
          far: 8000,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
          toneMapping: 3,
          toneMappingExposure: 1.2, // Brighter!
        }}
        dpr={[1, 1.5]}
        shadows={false}
      >
        {/* Strong ambient light */}
        <ambientLight intensity={0.7} color="#b4d4ff" />
        
        {/* Main sunlight */}
        <directionalLight
          position={[200, 300, 100]}
          intensity={1.6}
          color="#fff8e7"
          castShadow={false}
        />
        
        {/* Fill light */}
        <directionalLight
          position={[-100, 150, -50]}
          intensity={0.4}
          color="#a8c8ff"
        />
        
        {/* Hemisphere light */}
        <hemisphereLight args={['#87CEEB', '#4a7c4e', 0.5]} />

        {/* Beautiful Sky */}
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
          
          <Stars radius={200} depth={50} count={500} factor={4} saturation={0} fade speed={0.2} />

          {/* Clouds for atmosphere */}
          <Cloud position={[100, 80, -200]} speed={0.2} opacity={0.5} />
          <Cloud position={[-150, 90, -300]} speed={0.15} opacity={0.4} />
          <Cloud position={[200, 70, 100]} speed={0.25} opacity={0.45} />
        </Suspense>

        {/* LIGHT fog (not heavy!) */}
        <fog attach="fog" args={['#c8e6ff', 200, 4000]} />

        {/* World layers in order */}
        <Terrain />        {/* 1. Ground */}
        <RoadDetails />     {/* 2. Roads */}
        <TreesOptimized />   {/* 3. Trees */}
        <Scenery />         {/* 4. Details */}
        <Car />             {/* 5. Vehicle */}
        <CameraController /> {/* 6. Camera */}
      </Canvas>
    </div>
  )
}
