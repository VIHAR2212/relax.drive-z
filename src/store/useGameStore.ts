import { create } from 'zustand'

export type GearType = 'R' | 'N' | '1' | '2' | '3' | '4' | '5' | '6'

export interface VehicleState {
  // Position and rotation
  position: [number, number, number]
  rotation: number // Y-axis rotation in radians
  velocity: number // Forward velocity in m/s (negative = reverse)
  steering: number // -1 to 1 (left to right)
  
  // Gear system - 6-speed manual
  gear: GearType
  engineRPM: number
  clutchEngaged: boolean // true = clutch released (power transferred), false = clutch pressed (disconnected)
  
  // Input state
  input: {
    forward: boolean      // W / Accelerator
    backward: boolean     // S / Brake
    left: boolean         // A / Steer left
    right: boolean        // D / Steer right
    handbrake: boolean    // Space / Handbrake
    clutchPressed: boolean // Left Ctrl / Clutch pedal pressed
  }
}

export interface GameStore {
  vehicle: VehicleState
  isPaused: boolean
  hasStarted: boolean
  
  // Vehicle actions
  setPosition: (pos: [number, number, number]) => void
  setRotation: (rot: number) => void
  setVelocity: (vel: number) => void
  setSteering: (steer: number) => void
  setGear: (gear: GearType) => void
  setEngineRPM: (rpm: number) => void
  setClutchEngaged: (engaged: boolean) => void
  setInput: (input: Partial<VehicleState['input']>) => void
  
  // Game actions
  setPaused: (paused: boolean) => void
  setStarted: (started: boolean) => void
  resetVehicle: () => void
}

const initialVehicleState: VehicleState = {
  position: [0, 0.5, 0],
  rotation: 0,
  velocity: 0,
  steering: 0,
  gear: 'N', // Start in Neutral (like a real car!)
  engineRPM: 850,
  clutchEngaged: true, // Start with clutch engaged (released)
  input: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    clutchPressed: false, // Clutch not pressed initially
  },
}

export const useGameStore = create<GameStore>((set) => ({
  vehicle: { ...initialVehicleState },
  isPaused: false,
  hasStarted: false,

  setPosition: (position) =>
    set((state) => ({ vehicle: { ...state.vehicle, position } })),
  
  setRotation: (rotation) =>
    set((state) => ({ vehicle: { ...state.vehicle, rotation } })),
  
  setVelocity: (velocity) =>
    set((state) => ({ vehicle: { ...state.vehicle, velocity } })),
  
  setSteering: (steering) =>
    set((state) => ({ vehicle: { ...state.vehicle, steering } })),
  
  setGear: (gear) =>
    set((state) => ({ vehicle: { ...state.vehicle, gear } })),
  
  setEngineRPM: (engineRPM) =>
    set((state) => ({ vehicle: { ...state.vehicle, engineRPM } })),
  
  setClutchEngaged: (clutchEngaged) =>
    set((state) => ({ 
      vehicle: { 
        ...state.vehicle, 
        clutchEngaged,
        // Also update clutchPressed in input for UI display
        input: { 
          ...state.vehicle.input, 
          clutchPressed: !clutchEngaged 
        }
      } 
    })),
  
  setInput: (input) =>
    set((state) => ({
      vehicle: {
        ...state.vehicle,
        input: { ...state.vehicle.input, ...input },
      },
    })),

  setPaused: (isPaused) => set({ isPaused }),
  setStarted: (hasStarted) => set({ hasStarted }),
  
  resetVehicle: () =>
    set({ vehicle: { ...initialVehicleState }, hasStarted: false }),
}))
