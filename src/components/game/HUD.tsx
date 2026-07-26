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
  const [currentGearDisplay, setCurrentGearDisplay] = useState('N')

  // Convert m/s to km/h for display
  const speedKmh = Math.abs(Math.round(vehicle.velocity * 3.6))
  
  // RPM percentage for tachometer
  const rpmPercent = Math.min(100, Math.max(0, ((vehicle.engineRPM - 850) / (6800 - 850)) * 100))

  // Get current gear's top speed for reference
  const currentGearTopSpeed = getGearTopSpeed(vehicle.gear)

  // Detect gear changes for animation
  useEffect(() => {
    if (vehicle.gear !== lastGear && hasStarted) {
      setShowGearAnimation(true)
      setLastGear(vehicle.gear)
      setCurrentGearDisplay(vehicle.gear)
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
                <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">Left Ctrl</kbd> Clutch</div>
              </div>
            </div>
          </div>

          {/* Gear Pattern Preview */}
          <div className="inline-block bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mr-4 align-top">
            <p className="text-xs text-gray-500 mb-2 text-center">H-Pattern Gear Shifter</p>
            <GearStickPattern currentGear='N' size={120} />
          </div>

          {/* Pedal Preview */}
          <div className="inline-block bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 align-top">
            <p className="text-xs text-gray-500 mb-2 text-center">Pedals (A/B/C)</p>
            <CarPedals gasPressed={false} brakePressed={false} clutchPressed={false} size={80} />
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
          
          {/* Clutch Status Indicator */}
          {!vehicle.clutchEngaged && (
            <div className="mb-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider rounded-full animate-pulse">
                🔧 Clutch Disengaged
              </span>
            </div>
          )}
          
          {/* Gear & RPM Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-medium">Gear</span>
              <span className={`text-4xl font-bold font-mono transition-all duration-200 ${
                showGearAnimation ? 'scale-125' : ''
              } ${
                vehicle.gear === 'R' ? 'text-red-400' :
                vehicle.gear === 'N' ? 'text-gray-400 animate-pulse' :
                ['1', '2'].includes(vehicle.gear) ? 'text-green-400' :
                ['3', '4'].includes(vehicle.gear) ? 'text-blue-400' :
                'text-purple-400'
              }`}>
                {vehicle.gear}
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
            Gear Shifter (Shift+1-6)
          </p>
          <GearStickPattern 
            currentGear={vehicle.gear} 
            size={140} 
            animated={showGearAnimation}
          />
        </div>
      </div>

      {/* CAR PEDALS - Bottom Right (A/B/C) */}
      <div className="absolute bottom-8 right-8">
        <div className="bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-3 font-medium">
            Pedals (A=Gas B=Brake C=Clutch)
          </p>
          <CarPedals 
            gasPressed={vehicle.input.forward}
            brakePressed={vehicle.input.backward}
            clutchPressed={!vehicle.clutchEngaged} // Show pressed when disengaged
            size={120}
          />
          
          {/* Pedal Labels with Key Hints */}
          <div className="flex justify-between mt-2 px-2">
            <div className="text-center">
              <span className={`text-xs font-bold transition-colors block ${vehicle.input.forward ? 'text-green-400' : 'text-gray-500'}`}>A</span>
              <span className="text-[9px] text-gray-600">W</span>
            </div>
            <div className="text-center">
              <span className={`text-xs font-bold transition-colors block ${vehicle.input.backward ? 'text-red-400' : 'text-gray-500'}`}>B</span>
              <span className="text-[9px] text-gray-600">S</span>
            </div>
            <div className="text-center">
              <span className={`text-xs font-bold transition-colors block ${!vehicle.clutchEngaged ? 'text-yellow-400' : 'text-gray-500'}`}>C</span>
              <span className="text-[9px] text-gray-600">Ctrl</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini controls - top right */}
      <div className="absolute top-5 right-5 bg-black/50 backdrop-blur-md rounded-lg p-4 text-xs text-gray-400 border border-white/5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono">
          <span><span className="text-gray-200">W/S</span> Gas/Brake</span>
          <span><span className="text-gray-200">A/D</span> Steer</span>
          <span><span className="text-gray-200">Shift+1-6</span> Gears</span>
          <span><span className="text-gray-200">Left Ctrl</span> Clutch</span>
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

// H-Pattern Gear Stick Component
function GearStickPattern({ currentGear, size = 140, animated = false }: { 
  currentGear: string
  size?: number
  animated?: boolean 
}) {
  const pos = GEAR_POSITIONS[currentGear] || GEAR_POSITIONS['N']
  const scale = size / 100
  
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
      
      {/* Vertical lines and gears */}
      {[25, 50, 75].map((xPos, idx) => (
        <div key={idx}>
          <div 
            className="absolute bg-gray-600"
            style={{
              left: `${xPos * scale}px`,
              top: `${20 * scale}px`,
              bottom: `${20 * scale}px`,
              width: `${3 * scale}px`,
              transform: 'translateX(-50%)',
              borderRadius: '2px'
            }}
          />
          
          {/* Top gears (1, 3, 5) */}
          {gears.filter(g => g.x === xPos && g.y === 20).map(gear => (
            <div
              key={gear.pos}
              className="absolute flex items-center justify-center font-bold font-mono text-xs transition-all duration-200"
              style={{
                left: `${xPos * scale}px`,
                top: `${20 * scale}px`,
                width: `${20 * scale}px`,
                height: `${20 * scale}px`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: currentGear === gear.pos ? (animated ? '#22c55e' : '#2563eb') : '#666',
                color: currentGear === gear.pos ? '#fff' : '#333',
                borderRadius: '50%',
                border: `${currentGear === gear.pos ? 2 : 1}px solid ${currentGear === gear.pos ? '#fff' : '#888'}`,
                fontSize: `${11 * scale}px`,
                boxShadow: currentGear === gear.pos ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none'
              }}
            >
              {gear.pos}
            </div>
          ))}
          
          {/* Bottom gears (2, 4, R) */}
          {gears.filter(g => g.x === xPos && g.y === 80).map(gear => (
            <div
              key={gear.pos}
              className="absolute flex items-center justify-center font-bold font-mono text-xs transition-all duration-200"
              style={{
                left: `${xPos * scale}px`,
                top: `${80 * scale}px`,
                width: `${20 * scale}px`,
                height: `${20 * scale}px`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: currentGear === gear.pos ? (animated ? '#22c55e' : '#2563eb') : '#666',
                color: currentGear === gear.pos ? '#fff' : '#333',
                borderRadius: '50%',
                border: `${currentGear === gear.pos ? 2 : 1}px solid ${currentGear === gear.pos ? '#fff' : '#888'}`,
                fontSize: `${11 * scale}px`,
                boxShadow: currentGear === gear.pos ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none'
              }}
            >
              {gear.pos}
            </div>
          ))}
        </div>
      ))}
      
      {/* Neutral position */}
      <div
        className="absolute flex items-center justify-center font-bold font-mono transition-all duration-200"
        style={{
          left: '50%',
          top: '50%',
          width: `${24 * scale}px`,
          height: `${24 * scale}px`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: currentGear === 'N' ? (animated ? '#fbbf24' : '#9ca3af') : 'transparent',
          color: currentGear === 'N' ? '#fff' : '#555',
          borderRadius: '50%',
          border: `${currentGear === 'N' ? 2 : 1}px solid ${currentGear === 'N' ? '#fff' : '#888'}`,
          fontSize: `${10 * scale}px`
        }}
      >
        N
      </div>
      
      {/* Gear stick knob */}
      <div
        className={`absolute rounded-full bg-gray-800 border-2 border-white shadow-lg transition-all duration-300 ${animated ? 'animate-pulse bg-green-500' : ''}`}
        style={{
          left: `calc(50% + ${pos.x * 0.5}%)`,
          top: `calc(50% + ${pos.y * 0.5}%)`,
          width: `${16 * scale}px`,
          height: `${16 * scale}px`,
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  )
}

// Car Pedals Component (A/B/C)
function CarPedals({ gasPressed, brakePressed, clutchPressed, size = 120 }: {
  gasPressed: boolean
  brakePressed: boolean
  clutchPressed: boolean
  size?: number
}) {
  const pedalWidth = size * 0.22
  const pedalHeight = size * 0.45
  const spacing = size * 0.08
  
  return (
    <div 
      className="relative flex items-end justify-center gap-1"
      style={{ width: size, height: size * 0.65 }}
    >
      {/* A - Accelerator (Gas) Pedal - Small, angled */}
      <div className="relative" style={{ width: pedalWidth * 0.85 }}>
        {/* Pedal arm */}
        <div 
          className="absolute bg-gray-700 mx-auto"
          style={{ 
            width: pedalWidth * 0.35, 
            height: size * 0.18,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: pedalHeight - 2
          }}
        />
        {/* Pedal pad */}
        <div 
          className={`
            absolute bottom-0 rounded-t-lg transition-all duration-100
            ${gasPressed 
              ? 'bg-gradient-to-t from-green-600 to-green-400 shadow-lg shadow-green-500/50' 
              : 'bg-gradient-to-t from-gray-700 to-gray-600'
            }
          `}
          style={{ 
            width: pedalWidth * 0.85, 
            height: pedalHeight * 0.75,
            transform: gasPressed ? 'rotate(-5deg) translateY(4px)' : 'rotate(0deg)',
            transformOrigin: 'bottom center'
          }}
        >
          {/* Grip lines */}
          <div className="absolute inset-x-2 top-2 space-y-1.5">
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
          </div>
        </div>
        {/* Label */}
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold transition-colors ${gasPressed ? 'text-green-400' : 'text-gray-500'}`}>
          A
        </div>
      </div>

      {/* B - Brake Pedal - Medium */}
      <div className="relative" style={{ width: pedalWidth }}>
        {/* Pedal arm */}
        <div 
          className="absolute bg-gray-700 mx-auto"
          style={{ 
            width: pedalWidth * 0.4, 
            height: size * 0.2,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: pedalHeight - 2
          }}
        />
        {/* Pedal pad */}
        <div 
          className={`
            absolute bottom-0 rounded-t-lg transition-all duration-100
            ${brakePressed 
              ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-lg shadow-red-500/50' 
              : 'bg-gradient-to-t from-gray-700 to-gray-600'
            }
          `}
          style={{ 
            width: pedalWidth, 
            height: pedalHeight * 0.82,
            transform: brakePressed ? 'translateY(6px)' : 'translateY(0)',
          }}
        >
          {/* Grip lines */}
          <div className="absolute inset-x-2.5 top-2 space-y-1.5">
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
          </div>
        </div>
        {/* Label */}
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold transition-colors ${brakePressed ? 'text-red-400' : 'text-gray-500'}`}>
          B
        </div>
      </div>

      {/* C - Clutch Pedal - Large, wider (like real cars!) */}
      <div className="relative" style={{ width: pedalWidth * 1.2 }}>
        {/* Pedal arm */}
        <div 
          className="absolute bg-gray-700 mx-auto"
          style={{ 
            width: pedalWidth * 0.45, 
            height: size * 0.22,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: pedalHeight - 2
          }}
        />
        {/* Pedal pad */}
        <div 
          className={`
            absolute bottom-0 rounded-t-lg transition-all duration-100
            ${clutchPressed 
              ? 'bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-lg shadow-yellow-500/50' 
              : 'bg-gradient-to-t from-gray-700 to-gray-600'
            }
          `}
          style={{ 
            width: pedalWidth * 1.2, 
            height: pedalHeight,
            transform: clutchPressed ? 'translateY(8px)' : 'translateY(0)',
          }}
        >
          {/* Grip lines */}
          <div className="absolute inset-x-3 top-2 space-y-1.5">
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
            <div className="h-0.5 bg-gray-500/50 rounded" />
          </div>
        </div>
        {/* Label */}
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold transition-colors ${clutchPressed ? 'text-yellow-400' : 'text-gray-500'}`}>
          C
        </div>
      </div>
    </div>
  )
}
