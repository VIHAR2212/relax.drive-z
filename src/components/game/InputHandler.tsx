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

  // Handle key down
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }

    // Start game on any key press (except UI keys)
    if (!hasStarted && !['tab', 'escape', 'f12'].includes(e.key.toLowerCase())) {
      setStarted(true)
      return
    }

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
      
      // 6-Speed Manual Transmission - Gear Shifting
      default:
        if (e.shiftKey) {
          const key = e.key.toUpperCase() as string
          let newGear: GearType | null = null
          
          switch (key) {
            case '1':
              newGear = '1'
              break
            case '2':
              newGear = '2'
              break
            case '3':
              newGear = '3'
              break
            case '4':
              newGear = '4'
              break
            case '5':
              newGear = '5'
              break
            case '6':
              newGear = '6'
              break
            case 'N':
              newGear = 'N'
              break
            case 'R':
              newGear = 'R'
              break
          }
          
          if (newGear) {
            e.preventDefault()
            setGear(newGear)
          }
        }
        
        // Pause with Escape or P
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
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
