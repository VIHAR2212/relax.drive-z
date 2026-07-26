'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { getGearTopSpeed } from '@/lib/physics'

// Gear positions for H-pattern visualization
const GEAR_POSITIONS: Record<string, { x: number; y: number }> = {
  '1': { x: -45, y: -35 },
  '2': { x: -45, y: 35 },
  '3': { x: 0, y: -35 },
  '4': { x: 0, y: 35 },
  '5': { x: 45, y: -35 },
  'R': { x: 45, y: 35 },
  'N': { x: 0, y: 0 },
}

export function HUD() {
  const vehicle = useGameStore((s) => s.vehicle)
  const hasStarted = useGameStore((s) => s.hasStarted)
  const setStarted = useGameStore((s) => s.setStarted)
  
  // Engine start state
  const [engineStarting, setEngineStarting] = useState(false)
  const [engineStarted, setEngineStarted] = useState(false)
  const [showGearAnimation, setShowGearAnimation] = useState(false)
  const [lastGear, setLastGear] = useState('N')

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

  // Detect gear changes for animation
  useEffect(() => {
    if (vehicle.gear !== lastGear && hasStarted) {
      setShowGearAnimation(true)
      setLastGear(vehicle.gear)
      setTimeout(() => setShowGearAnimation(false), 500)
    }
  }, [vehicle.gear, lastGear, hasStarted])

  // Handle engine start
  const handleEngineStart = () => {
    if (!engineStarted && !engineStarting) {
      setEngineStarting(true)
      setTimeout(() => {
        setEngineStarting(false)
        setEngineStarted(true)
        setStarted(true)
      }, 1500)
    }
  }

  if (!hasStarted || !engineStarted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="text-center max-w-lg mx-4">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-[0.3em] uppercase opacity-90">
              relax.drive
            </h1>
            <p className="text-gray-500 tracking-widest text-sm">Manual Transmission Simulator</p>
          </div>

          {/* Ignition Area */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl mb-8">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className={`text-4xl ${engineStarting ? 'animate-spin' : ''}`}>
                  🔑
                </span>
                <span className={`text-lg font-medium ${engineStarted ? 'text-green-400' : engineStarting ? 'text-yellow-400 animate-pulse' : 'text-gray-400'}`}>
                  {engineStarting ? 'Starting...' : engineStarted ? 'Engine Running' : 'Ignition'}
                </span>
              </div>

              {/* Start Button */}
              {!engineStarted && (
                <button
                  onClick={handleEngineStart}
                  disabled={engineStarting}
                  className={`
                    w-full py-4 px-8 rounded-xl font-bold text-lg uppercase tracking-wider
                    transition-all duration-300 transform
                    ${engineStarting 
                      ? 'bg-yellow-600 cursor-wait text-black' 
                      : 'bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 text-white shadow-lg shadow-red-600/30'
                    }
                  `}
                >
                  {engineStarting ? '🔄 Cranking...' : '🚗 START ENGINE'}
                </button>
              )}

              {engineStarted && (
                <div className="text-green-400 font-medium animate-pulse">
                  ✅ Engine Started - Press Shift+1 to engage 1st gear
                </div>
              )}
            </div>

            {/* Controls Reference */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Quick Controls</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">W/S</kbd> Gas/Brake</div>
                <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">A/D</kbd> Steer</div>
                <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">Shift+1-6</kbd> Gears</div>
                <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">Space</kbd> Handbrake</div>
              </div>
            </div>
          </div>

          {/* Gear Pattern Preview */}
          <div className="inline-block bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-xs text-gray-500 mb-2 text-center">H-Pattern Gear Shifter</p>
            <GearStickPattern currentGear='N' size={120} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {/* Speedometer */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/75 backdrop-blur-xl rounded-3xl px-10 py-6 border border-white/10 shadow-2xl min-w-[320px]">
          <div className="text-center mb-3">
            <span className="text-7xl font-bold text-white tracking-tighter tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {speedKmh}
            </span>
            <span className="text-2xl text-gray-400 ml-2 font-light">km/h</span>
          </div>
          
          {/* Tachometer */}
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
          
          {/* Gear & RPM Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-medium">Gear</span>
              <span className={`text-4xl font-bold font-mono ${showGearAnimation ? 'scale-125 transition-transform' : 'transition-all'} ${
                vehicle.gear === 'R' ? 'text-red-400' :
                vehicle.gear === 'N' ? 'text-gray-400 animate-pulse' :
                ['1', '2'].includes(vehicle.gear) ? 'text-green-400' :
                ['3', '4'].includes(vehicle.gear) ? 'text-blue-400' :
                'text-purple-400'
              }`}>
                {getGearDisplay(vehicle.gear)}
              </span>
              {vehicle.gear === 'N' && (
                <span className="text-xs text-yellow-400 ml-2 animate-pulse">
                  Shift+1
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-medium">RPM</span>
              <span className="text-lg font-mono text-gray-300 tabular-nums">
                {Math.round(vehicle.engineRPM).toLocaleString()}
              </span>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-gray-600 block">Max</span>
              <span className="text-sm text-gray-400 font-mono">{Math.round(currentGearTopSpeed)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GEAR STICK PATTERN - Bottom Left */}
      <div className="absolute bottom-8 left-8">
        <div className={`
          bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-white/10 
          transition-all duration-300 ${showGearAnimation ? 'scale-110 border-green-500/50' : ''}
        `}>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-2 font-medium">
            Gear Shifter
          </p>
          <GearStickPattern 
            currentGear={vehicle.gear} 
            size={140} 
            animated={showGearAnimation}
          />
        </div>
      </div>

      {/* Mini controls - top right */}
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

      {/* Large gear overlay when shifting */}
      {(vehicle.gear !== 'N') && showGearAnimation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className={`
            text-[150px] font-bold opacity-20 font-mono animate-bounce
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

// H-Pattern Gear Stick Component (Fixed - Uses divs instead of SVG)
function GearStickPattern({ currentGear, size = 140, animated = false }: { 
  currentGear: string
  size?: number
  animated?: boolean 
}) {
  const pos = GEAR_POSITIONS[currentGear] || GEAR_POSITIONS['N']
  const scale = size / 100
  
  // Gear positions in the pattern
  const gears = [
    { pos: '1', x: 25, y: 20 },
    { pos: '2', x: 25, y: 80 },
    { pos: '3', x: 50, y: 20 },
    { pos: '4', x: 50, y: 80 },
    { pos: '5', x: 75, y: 20 },
    { pos: 'R', x: 75, y: 80 },
  ]
  
  return (
    <div 
      className="relative bg-gradient-to-b from-gray-200 to-gray-300 rounded-full"
      style={{ width: size, height: size }}
    >
      {/* Horizontal bar */}
      <div 
        className="absolute bg-gray-600"
        style={{
          left: `${15 * scale}px`,
          right: `${15 * scale}px`,
          top: '50%',
          height: `${3 * scale}px`,
          transform: 'translateY(-50%)',
          borderRadius: '2px'
        }}
      />
      
      {/* Vertical lines and gear positions */}
      {[25, 50, 75].map
