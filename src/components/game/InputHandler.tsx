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

  // Handle key down - MAIN INPUT HANDLER
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log('🎮 Key pressed:', e.key, 'Shift:', e.shiftKey)
    
    // Start game on any key press (except UI keys)
    if (!hasStarted && !['tab', 'escape', 'f12'].includes(e.key.toLowerCase())) {
      setStarted(true)
    }

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', '1', '2', '3', '4', '5', '6', 'n', 'r'].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }

    // ========== GEAR SHIFTING (HIGHEST PRIORITY) ==========
    // Check for Shift + Number/Letter for gear changes
    if (e.shiftKey) {
      const keyUpper = e.key.toUpperCase()
      
      // Direct gear mapping
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
      
      if (gearMap[keyUpper]) {
        e.preventDefault()
        e.stopPropagation()
        
        console.log('⚙️ Shifting to gear:', gearMap[keyUpper])
        setGear(gearMap[keyUpper])
        
        return // IMPORTANT: Return immediately after gear shift!
      }
    }

    // ========== MOVEMENT CONTROLS ==========
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
        
      // Pause controls
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
      console.log('🖱️ Clicked to start')
      setStarted(true)
    }
  }, [hasStarted, setStarted])

  useEffect(() => {
    console.log('🎮 InputHandler mounted, attaching listeners...')
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('click', handleClick)

    return () => {
      console.log('🎮 InputHandler unmounting, removing listeners...')
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('click', handleClick)
    }
  }, [handleKeyDown, handleKeyUp, handleClick])

  return null // This component doesn't render anything
}
