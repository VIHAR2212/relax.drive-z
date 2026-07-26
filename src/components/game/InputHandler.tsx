'use client'

import { useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { GearType } from '@/store/useGameStore'

export function InputHandler() {
  const setInput = useGameStore((s) => s.setInput)
  const setGear = useGameStore((s) => s.setGear)
  const setStarted = useGameStore((s) => s.setStarted)
  const setPaused = useGameStore((s) => s.setPaused)
  const hasStarted = useGameStore((s) => s.hasStarted)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Start game on any key press (except UI keys)
    if (!hasStarted && !['tab', 'escape', 'f12'].includes(e.key.toLowerCase())) {
      setStarted(true)
    }

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', '1', '2', '3', '4', '5', '6', 'n', 'r'].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }

    // GEAR SHIFTING - Handle FIRST for reliability!
    if (e.shiftKey && hasStarted) {
      const key = e.key.toUpperCase()
      
      const gearMap: Record<string, GearType> = {
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        'N': 'N',
        'R': 'R'
      }
      
      if (gearMap[key]) {
        e.preventDefault()
        setGear(gearMap[key])
        console.log(`🚗 Gear shifted to: ${gearMap[key]}`)
        return // Important: Return after gear shift!
      }
    }

    // Movement controls
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        setInput({ forward: true })
        break
      case 's':
      case 'arrowdown':
        setInput({ backward: true })
        break
      case 'a':
      case 'arrowleft':
        setInput({ left: true })
        break
      case 'd':
      case 'arrowright':
        setInput({ right: true })
        break
      case ' ':
        setInput({ handbrake: true })
        break
        
      // Pause with Escape or P
      case 'escape':
      case 'p':
        if (hasStarted) {
          setPaused(true)
        }
        break
    }
  }, [setInput, setGear, setStarted, setPaused, hasStarted])

  // Handle key up
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        setInput({ forward: false })
        break
      case 's':
      case 'arrowdown':
        setInput({ backward: false })
        break
      case 'a':
      case 'arrowleft':
        setInput({ left: false })
        break
      case 'd':
      case 'arrowright':
        setInput({ right: false })
        break
      case ' ':
        setInput({ handbrake: false })
        break
    }
  }, [setInput])

  // Handle mouse click to start
  const handleClick = useCallback(() => {
    if (!hasStarted) {
      setStarted(true)
    }
  }, [hasStarted, setStarted])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('click', handleClick)
    }
  }, [handleKeyDown, handleKeyUp, handleClick])

  return null // This component doesn't render anything
}
