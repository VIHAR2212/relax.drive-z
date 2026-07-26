'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { GearType } from '@/store/useGameStore'

// ============================================================
// CRITICAL FIX: Use e.code instead of e.key for gear detection!
// 
// When you press Shift+1, e.key returns '!' (exclamation mark)
// but e.code returns 'Digit1' ALWAYS - this is layout-independent
// and makes "Shift + number" reliable!
// ============================================================

const GEAR_SHIFT_CODES: Record<string, GearType> = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  KeyN: 'N',
  KeyR: 'R',
}

const DRIVE_CODES = new Set([
  'KeyW',
  'ArrowUp',
  'KeyS', 
  'ArrowDown',
  'KeyA',
  'ArrowLeft',
  'KeyD',
  'ArrowRight',
  'Space',
])

export function InputHandler() {
  const setInput = useGameStore((s) => s.setInput)
  const setGear = useGameStore((s) => s.setGear)
  const setStarted = useGameStore((s) => s.setStarted)
  const setPaused = useGameStore((s) => s.setPaused)
  const setClutchEngaged = useGameStore((s) => s.setClutchEngaged)
  const hasStarted = useGameStore((s) => s.hasStarted)
  
  // Ref for auto-clutch timer
  const clutchTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track pressed keys (like working version does)
  const pressedKeysRef = useRef<Set<string>>(new Set())

  // Handle key down - MAIN INPUT HANDLER
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log('🎮 KeyDown:', { 
      key: e.key, 
      code: e.code, 
      shiftKey: e.shiftKey, 
      ctrlKey: e.ctrlKey 
    })
    
    // Ignore repeats from held keys (like working version does!)
    if (e.repeat) return
    
    // Ignore input if focus is in a text field
    const target = e.target as HTMLElement | null
    if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

    // Start game on any key press (except UI keys)
    if (!hasStarted && !['Tab', 'Escape', 'F12'].includes(e.code)) {
      setStarted(true)
    }

    // ========== CLUTCH CONTROL (Left Ctrl = clutch pedal) ==========
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      console.log('🔧 Clutch PRESSED (Ctrl)')
      setClutchEngaged(false) // Disengage clutch (pedal down)
      e.preventDefault()
      return
    }

    // ========== GEAR SHIFTING (HIGHEST PRIORITY) ==========
    // Use e.code (NOT e.key!) - This is the critical fix!
    // Shift + Digit1/2/3/4/5/6 or Shift + KeyN/KeyR for gears
    if (e.shiftKey && e.code in GEAR_SHIFT_CODES) {
      e.preventDefault()
      e.stopPropagation()
      
      const gear = GEAR_SHIFT_CODES[e.code]
      console.log('⚙️ Shifting to gear:', gear, '(code:', e.code, ')')
      
      // AUTO-CLUTCH: Disengage clutch when shifting (like a real car!)
      setClutchEngaged(false)
      
      // Change the gear
      setGear(gear)
      
      // Clear any existing timer
      if (clutchTimerRef.current) {
        clearTimeout(clutchTimerRef.current)
      }
      
      // AUTO-CLUTCH: Re-engage clutch after 300ms (smooth release)
      clutchTimerRef.current = setTimeout(() => {
        console.log('🔧 Clutch RE-ENGAGED after shift')
        setClutchEngaged(true)
      }, 300)
      
      return // Return immediately after gear shift!
    }

    // ========== MOVEMENT CONTROLS ==========
    if (DRIVE_CODES.has(e.code)) {
      pressedKeysRef.current.add(e.code)
      syncDriveInput()
    }

    // Pause controls
    if (e.code === 'Escape' || (e.code === 'KeyP' && !e.shiftKey)) {
      if (hasStarted) {
        setPaused(true)
      }
    }
    
    // Engine restart (like working version uses 'E')
    if (e.code === 'KeyE' && !e.shiftKey) {
      console.log('🔄 Engine restart requested')
    }

  }, [setInput, setGear, setStarted, setPaused, hasStarted, setClutchEngaged])

  // Sync drive input from pressed keys (like working version!)
  const syncDriveInput = useCallback(() => {
    const pressed = pressedKeysRef.current
    setInput({
      forward: pressed.has('KeyW') || pressed.has('ArrowUp'),
      backward: pressed.has('KeyS') || pressed.has('ArrowDown'),
      left: pressed.has('KeyA') || pressed.has('ArrowLeft'),
      right: pressed.has('KeyD') || pressed.has('ArrowRight'),
      handbrake: pressed.has('Space'),
    })
  }, [setInput])

  // Handle key up
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Handle clutch release
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      console.log('🔧 Clutch RELEASED - re-engaging')
      setClutchEngaged(true) // Engage clutch (pedal up)
      return
    }

    // Handle drive control release
    if (DRIVE_CODES.has(e.code)) {
      pressedKeysRef.current.delete(e.code)
      syncDriveInput()
    }
  }, [setInput, setClutchEngaged, syncDriveInput])

  // Handle mouse click to start
  const handleClick = useCallback(() => {
    if (!hasStarted) {
      console.log('🖱️ Clicked to start')
      setStarted(true)
    }
  }, [hasStarted, setStarted])
  
  // Handle blur - release all inputs (like working version!)
  const handleBlur = useCallback(() => {
    console.log('🪟 Window blurred - releasing all inputs')
    pressedKeysRef.current.clear()
    syncDriveInput()
  }, [syncDriveInput])

  useEffect(() => {
    console.log('🎮 InputHandler mounted, attaching listeners...')
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('click', handleClick)
    window.addEventListener('blur', handleBlur)

    return () => {
      console.log('🎮 InputHandler unmounting, removing listeners...')
      if (clutchTimerRef.current) {
        clearTimeout(clutchTimerRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleKeyDown, handleKeyUp, handleClick, handleBlur])

  return null // This component doesn't render anything
}
