'use client'

import dynamic from 'next/dynamic'
import { InputHandler } from '@/components/game/InputHandler'
import { HUD } from '@/components/game/HUD'

// Dynamic import for 3D scene to avoid SSR issues
const GameScene = dynamic(
  () => import('@/components/game/GameScene').then(mod => ({ default: mod.GameScene })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex items-center justify-center">
        <div className="text-white text-xl">Loading relax.drive...</div>
      </div>
    )
  }
)

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <InputHandler />
      <GameScene />
      <HUD />
    </main>
  )
}
