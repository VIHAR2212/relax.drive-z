'use client'

import { useGameStore } from '@/store/useGameStore'
import { getGearTopSpeed } from '@/lib/physics'

export function HUD() {
  const vehicle = useGameStore((s) => s.vehicle)
  const hasStarted = useGameStore((s) => s.hasStarted)

  // Convert m/s to km/h for display
  const speedKmh = Math.abs(Math.round(vehicle.velocity * 3.6))
  
  // Get gear display text
  const getGearDisplay = (gear: string): string => {
    return gear
  }

  // RPM percentage for tachometer
  const rpmPercent = Math.min(100, ((vehicle.engineRPM - 850) / (6800 - 850)) * 100)

  // Get current gear's top speed for reference
  const currentGearTopSpeed = getGearTopSpeed(vehicle.gear)

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 pointer-events-none">
        <div className="text-center max-w-2xl mx-4">
          {/* Title */}
          <h1 className="text-6xl font-bold text-white mb-3 tracking-[0.4em] uppercase opacity-90">
            relax.drive
          </h1>
          <p className="text-lg text-gray-400 mb-10 tracking-wide">A peaceful driving experience</p>
          
          {/* Controls Panel */}
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 tracking-wider uppercase">Controls</h2>
            
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm mb-6">
              <div className="flex justify-between items-center">
                <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">W / ↑</kbd>
                <span className="text-gray-300 ml-4">Accelerate</span>
              </div>
              <div className="flex justify-between items-center">
                <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">S / ↓</kbd>
                <span className="text-gray-300 ml-4">Brake</span>
              </div>
              <div className="flex justify-between items-center">
                <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">A / ←</kbd>
                <span className="text-gray-300 ml-4">Steer Left</span>
              </div>
              <div className="flex justify-between items-center">
                <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">D / →</kbd>
                <span className="text-gray-300 ml-4">Steer Right</span>
              </div>
            </div>

            {/* Gear Shifting Section */}
            <div className="border-t border-white/10 pt-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 tracking-wider uppercase">6-Speed Manual Transmission</h3>
              
              <div className="grid grid-cols-4 gap-3 text-xs mb-4">
                <div className="flex justify-between items-center bg-red-900/30 px-3 py-2 rounded border border-red-500/30">
                  <kbd className="font-mono text-red-300">Shift+R</kbd>
                  <span className="text-gray-400 ml-2">Reverse</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded border border-gray-600/30">
                  <kbd className="font-mono text-gray-300">Shift+N</kbd>
                  <span className="text-gray-400 ml-2">Neutral</span>
                </div>
                <div className="flex justify-between items-center bg-green-900/30 px-3 py-2 rounded border border-green-500/30">
                  <kbd className="font-mono text-green-300">Shift+1</kbd>
                  <span className="text-gray-400 ml-2">1st</span>
                </div>
                <div className="flex justify-between items-center bg-green-900/30 px-3 py-2 rounded border border-green-500/30">
                  <kbd className="font-mono text-green-300">Shift+2</kbd>
                  <span className="text-gray-400 ml-2">2nd</span>
                </div>
                <div className="flex justify-between items-center bg-blue-900/30 px-3 py-2 rounded border border-blue-500/30">
                  <kbd className="font-mono text-blue-300">Shift+3</kbd>
                  <span className="text-gray-400 ml-2">3rd</span>
                </div>
                <div className="flex justify-between items-center bg-blue-900/30 px-3 py-2 rounded border border-blue-500/30">
                  <kbd className="font-mono text-blue-300">Shift+4</kbd>
                  <span className="text-gray-400 ml-2">4th</span>
                </div>
                <div className="flex justify-between items-center bg-purple-900/30 px-3 py-2 rounded border border-purple-500/30">
                  <kbd className="font-mono text-purple-300">Shift+5</kbd>
                  <span className="text-gray-400 ml-2">5th</span>
                </div>
                <div className="flex justify-between items-center bg-yellow-900/30 px-3 py-2 rounded border border-yellow-500/30">
                  <kbd className="font-mono text-yellow-300">Shift+6</kbd>
                  <span className="text-gray-400 ml-2">6th</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">Space</kbd>
                  <span className="text-gray-400 text-xs">Handbrake</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-white/15 rounded border border-white/20 font-mono text-xs">Click</kbd>
                  <span className="text-gray-400 text-xs">Start Engine</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-gray-500 text-sm animate-pulse tracking-wider">
            Click anywhere to start the engine
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {/* Speedometer - bottom center (larger, more prominent) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/75 backdrop-blur-xl rounded-3xl px-10 py-6 border border-white/10 shadow-2xl min-w-[320px]">
          {/* Speed display */}
          <div className="text-center mb-3">
            <span className="text-7xl font-bold text-white tracking-tighter tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {speedKmh}
            </span>
            <span className="text-2xl text-gray-400 ml-2 font-light">km/h</span>
          </div>
          
          {/* Tachometer bar */}
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full transition-all duration-75 rounded-full ${
                rpmPercent > 92 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                rpmPercent > 78 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                'bg-gradient-to-r from-green-500 to-emerald-400'
              }`}
              style={{ width: `${rpmPercent}%` }}
            />
          </div>
          
          {/* Gear and RPM info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-medium">Gear</span>
              <span className={`text-4xl font-bold font-mono ${
                vehicle.gear === 'R' ? 'text-red-400' :
                vehicle.gear === 'N' ? 'text-gray-400' :
                ['1', '2'].includes(vehicle.gear) ? 'text-green-400' :
                ['3', '4'].includes(vehicle.gear) ? 'text-blue-400' :
                'text-purple-400'
              }`}>
                {getGearDisplay(vehicle.gear)}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-medium">RPM</span>
              <span className="text-lg font-mono text-gray-300 tabular-nums">
                {Math.round(vehicle.engineRPM).toLocaleString()}
              </span>
            </div>
            
            {/* Gear top speed indicator */}
            <div className="text-right">
              <span className="text-xs text-gray-600 block">Max</span>
              <span className="text-sm text-gray-400 font-mono">{Math.round(currentGearTopSpeed)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini controls reminder - top right */}
      <div className="absolute top-5 right-5 bg-black/50 backdrop-blur-md rounded-lg p-4 text-xs text-gray-400 border border-white/5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono">
          <span><span className="text-gray-200">W/S</span> Gas/Brake</span>
          <span><span className="text-gray-200">A/D</span> Steer</span>
          <span><span className="text-gray-200">Shift+1-6</span> Gears</span>
          <span><span className="text-gray-200">Space</span> Handbrake</span>
        </div>
      </div>

      {/* Title - top left */}
      <div className="absolute top-5 left-5">
        <h1 className="text-base font-extralight text-white/50 tracking-[0.5em] uppercase">
          relax.drive
        </h1>
      </div>

      {/* Gear indicator overlay when shifting */}
      {(vehicle.gear !== 'N') && (
        <div className="absolute top-1/2 right-12 transform -translate-y-1/2">
          {/*
            Large gear indicator overlay
            Shows current gear in background for visual feedback
          */}
          <div className={`
            text-9xl font-bold opacity-10 font-mono
            ${vehicle.gear === 'R' ? 'text-red-500' :
              ['1', '2'].includes(vehicle.gear) ? 'text-green-500' :
              ['3', '4'].includes(vehicle.gear) ? 'text-blue-500' :
              'text-purple-500'}
          `}>
            {vehicle.gear}
          </div>
        </div>
      )}
    </div>
  )
}
