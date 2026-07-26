import * as THREE from 'three'
import { GearType } from '@/store/useGameStore'

// ============================================================
// PHYSICS CONSTANTS - 6-Speed Manual Transmission
// Based on user specifications for gear speed limits
// ============================================================

export const PHYSICS = {
  // 6-Speed Manual Transmission Gear Ratios
  GEAR_RATIOS: {
    'R': -3.50,
    'N': 0,
    '1': 3.55,
    '2': 2.11,
    '3': 1.38,
    '4': 1.03,
    '5': 0.83,
    '6': 0.67,
  } as Record<GearType, number>,
  
  // ============================================================
  // GEAR SPEED LIMITS (User Specification!)
  // Each gear has a maximum speed - engine can't push beyond this
  // ============================================================
  GEAR_MAX_SPEEDS: {
    'R': 15,      // Reverse: max 15 km/h
    'N': 0,       // Neutral: no drive power
    '1': 15,      // 1st gear: max 15 km/h
    '2': 30,      // 2nd gear: max 30 km/h  
    '3': 40,      // 3rd gear: max 40 km/h
    '4': 50,      // 4th gear: max 50 km/h
    '5': 65,      // 5th gear: max 65 km/h
    '6': 210,     // 6th gear: max 210 km/h (TOP SPEED!)
  } as Record<GearType, number>,
  
  // ============================================================
  // BOG THRESHOLDS - Speed below which gear struggles
  // (Engine bogs down if speed too low for selected gear)
  // ============================================================
  GEAR_BOG_SPEEDS: {
    'R': 0,
    'N': 0,
    '1': 0,       // 1st can launch from standstill
    '2': 8,       // Need ~8 km/h before 2nd works well
    '3': 18,      // Need ~18 km/h for 3rd
    '4': 28,      // Need ~28 km/h for 4th
    '5': 38,      // Need ~38 km/h for 5th
    '6': 48,      // Need ~48 km/h for 6th
  } as Record<GearType, number>,
  
  FINAL_DRIVE: 3.67,
  
  // Engine characteristics
  IDLE_RPM: 850,
  MAX_RPM: 6800,
  REDLINE_RPM: 6500,
  STALL_RPM: 150,
  PEAK_TORQUE_RPM: 4500,
  
  // Vehicle specs
  MASS: 980, // kg
  WHEELBASE: 2.51, // meters
  
  // Tire & friction
  ROLLING_RESISTANCE: 0.013,
  DRAG_COEFFICIENT: 0.34,
  FRONTAL_AREA: 2.05, // m²
  AIR_DENSITY: 1.225, // kg/m³
  
  // Power
  MAX_TORQUE: 178, // Nm
  MAX_BRAKE_FORCE: 14000, // N
  HANDBRAKE_FORCE: 7000, // N
  
  // Steering - REDUCED sensitivity for smoother control!
  STEERING_SPEED: 1.4,        // Was 2.8 - halved for less twitchy steering
  STEERING_RETURN: 2.5,       // Was 3.5 - slightly slower return
  MAX_STEERING_ANGLE: Math.PI / 6,  // Was PI/4.5 (40°) -> now 30° for realistic feel
  
  // Wheel
  WHEEL_RADIUS: 0.30, // meters
  
  // How quickly things respond
  RPM_RESPONSE_RATE: 6.5,
  COAST_DECELERATION: 0.5, // m/s² deceleration when coasting in neutral
}

// Convert km/h to m/s
const KMH_TO_MS = 1 / 3.6
const MS_TO_KMH = 3.6

// Calculate engine torque based on RPM
export function getEngineTorque(rpm: number): number {
  const { IDLE_RPM, MAX_RPM, MAX_TORQUE, STALL_RPM } = PHYSICS
  
  if (rpm <= STALL_RPM || rpm > MAX_RPM) return 0
  
  const rpmRange = MAX_RPM - IDLE_RPM
  const normalizedRPM = Math.max(0, (rpm - IDLE_RPM) / rpmRange)
  
  let torqueMultiplier: number
  
  if (normalizedRPM < 0.1) {
    // Base torque at idle (~40%) - allows car to move!
    torqueMultiplier = 0.4 + normalizedRPM * 3.0
  } else if (normalizedRPM < 0.5) {
    const t = (normalizedRPM - 0.1) / 0.4
    torqueMultiplier = 0.7 + t * 0.25
  } else if (normalizedRPM < 0.75) {
    const t = (normalizedRPM - 0.5) / 0.25
    torqueMultiplier = 0.95 + t * 0.05
  } else {
    const t = (normalizedRPM - 0.75) / 0.25
    torqueMultiplier = 1.0 - t * 0.25
  }
  
  return MAX_TORQUE * Math.max(0.05, Math.min(1.0, torqueMultiplier))
}

// Calculate wheel force with gear speed limits!
export function calculateWheelForce(
  gear: GearType,
  rpm: number,
  throttle: number,
  velocity: number,
  clutchEngaged: boolean = true
): number {
  if (gear === 'N') return 0
  if (!clutchEngaged) return 0
  
  const { GEAR_RATIOS, FINAL_DRIVE, WHEEL_RADIUS, GEAR_MAX_SPEEDS, GEAR_BOG_SPEEDS } = PHYSICS
  const gearRatio = GEAR_RATIOS[gear]
  if (gearRatio === 0) return 0
  
  // Get current speed in km/h
  const currentSpeedKmh = Math.abs(velocity) * MS_TO_KMH
  const maxSpeedKmh = GEAR_MAX_SPEEDS[gear]
  const bogSpeedKmh = GEAR_BOG_SPEEDS[gear]
  
  // ============================================================
  // GEAR SPEED LIMIT LOGIC
  // ============================================================
  
  let effectiveThrottle = throttle
  let torqueFactor = 1.0
  
  // If approaching max speed of this gear, reduce power smoothly
  if (maxSpeedKmh > 0 && currentSpeedKmh > maxSpeedKmh * 0.85) {
    // Start reducing power at 85% of gear's max speed
    const speedFactor = 1 - ((currentSpeedKmh - maxSpeedKmh * 0.85) / (maxSpeedKmh * 0.15))
    effectiveThrottle *= Math.max(0, Math.min(1, speedFactor))
    
    // At or above max speed, no more power from this gear
    if (currentSpeedKmh >= maxSpeedKmh) {
      effectiveThrottle = 0
      torqueFactor = 0.05 // Just enough to maintain, not accelerate
    }
  }
  
  // If bogging (speed too low for gear), severely limit power
  if (bogSpeedKmh > 0 && currentSpeedKmh < bogSpeedKmh && currentSpeedKmh > 2) {
    const bogFactor = currentSpeedKmh / bogSpeedKmh
    torqueFactor = 0.1 + bogFactor * 0.3 // Very limited power when bogging
    
    // Severe bog can stall the engine
    if (currentSpeedKmh < bogSpeedKmh * 0.5) {
      torqueFactor = 0.02
    }
  }
  
  // Calculate wheel force
  const engineTorque = getEngineTorque(rpm)
  const wheelTorque = engineTorque * Math.abs(gearRatio) * FINAL_DRIVE * effectiveThrottle * torqueFactor
  const wheelForce = wheelTorque / WHEEL_RADIUS
  
  return gearRatio > 0 ? wheelForce : -wheelForce
}

// Calculate drag force
export function calculateDragForce(velocity: number): number {
  const { DRAG_COEFFICIENT, FRONTAL_AREA, AIR_DENSITY } = PHYSICS
  const speed = Math.abs(velocity)
  const sign = velocity >= 0 ? 1 : -1
  return sign * 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * FRONTAL_AREA * speed * speed
}

// Calculate rolling resistance
export function calculateRollingResistance(velocity: number, mass: number): number {
  const { ROLLING_RESISTANCE } = PHYSICS
  const speed = Math.abs(velocity)
  const sign = velocity >= 0 ? -1 : 1
  return sign * ROLLING_RESISTANCE * mass * 9.81 * (1 + 0.01 * speed)
}

// Get top speed for each gear
export function getGearTopSpeed(gear: GearType): number {
  return PHYSICS.GEAR_MAX_SPEEDS[gear] || 0
}

// Get recommended shift point RPM
export function getShiftPoint(currentGear: GearType): number {
  const shiftPoints: Record<GearType, number> = {
    'R': 5500, 'N': 0, '1': 6000, '2': 5800,
    '3': 5600, '4': 5400, '5': 5200, '6': 6000,
  }
  return shiftPoints[currentGear] || 6000
}

// Smooth interpolation helper
function approach(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-rate * dt)
  return current + (target - current) * t
}

// Clamp helper
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

// ============================================================
// MAIN PHYSICS UPDATE - COMPLETELY REWRITTEN WITH ALL FIXES
// ============================================================
export function updatePhysics(
  state: {
    position: [number, number, number]
    rotation: number
    velocity: number
    steering: number
    gear: GearType
    engineRPM: number
    clutchEngaged: boolean
    input: {
      forward: boolean
      backward: boolean
      left: boolean
      right: boolean
      handbrake: boolean
      clutchPressed: boolean
    }
  },
  deltaTime: number
): {
  position: [number, number, number]
  rotation: number
  velocity: number
  steering: number
  gear: GearType
  engineRPM: number
  clutchEngaged: boolean
} {
  // Destructure state
  let { position, rotation, velocity, steering, gear, engineRPM, input } = state
  
  const {
    MASS, STEERING_SPEED, STEERING_RETURN, MAX_STEERING_ANGLE,
    IDLE_RPM, MAX_RPM, REDLINE_RPM, STALL_RPM,
    MAX_BRAKE_FORCE, HANDBRAKE_FORCE, WHEELBASE,
    GEAR_RATIOS, WHEEL_RADIUS, RPM_RESPONSE_RATE,
    COAST_DECELERATION, GEAR_MAX_SPEEDS,
  } = PHYSICS

  let newClutchEngaged = !input.clutchPressed
  const throttle = input.forward ? 1 : 0
  const brakeInput = input.backward ? 1 : 0

  // ========== 1. UPDATE STEERING ==========
  let newSteering = steering
  
  if (input.left) {
    newSteering = Math.max(-MAX_STEERING_ANGLE, steering - STEERING_SPEED * deltaTime)
  } else if (input.right) {
    newSteering = Math.min(MAX_STEERING_ANGLE, steering + STEERING_SPEED * deltaTime)
  } else {
    // Return to center
    if (Math.abs(newSteering) < STEERING_RETURN * deltaTime) {
      newSteering = 0
    } else if (newSteering > 0) {
      newSteering -= STEERING_RETURN * deltaTime
    } else {
      newSteering += STEERING_RETURN * deltaTime
    }
  }

  // ========== 2. CALCULATE FORCES ==========
  let totalForce = 0

  // A) Engine/Drive force (with gear limits!)
  if (throttle > 0 && gear !== 'N' && newClutchEngaged) {
    const wheelForce = calculateWheelForce(gear, engineRPM, throttle, velocity, newClutchEngaged)
    
    // Wrong direction check
    const isReverseGear = gear === 'R'
    const goingWrongDirection = (isReverseGear && velocity > 0.5) || (!isReverseGear && velocity < -0.5)
    
    if (!goingWrongDirection) {
      totalForce += wheelForce
    } else {
      totalForce -= MASS * 10 // Strong resistance
    }
  }

  // B) Coast deceleration in neutral (FIXED! Now slows down properly!)
  if (gear === 'N' && !newClutchEngaged === false) {
    // In neutral without clutch: coast with drag + rolling resistance only
    // The calculateDragForce and calculateRollingResistance will handle this
    // But add extra coast deceleration for realistic feel
    if (Math.abs(velocity) > 0.1) {
      const coastForce = -Math.sign(velocity) * MASS * COAST_DECELERATION
      totalForce += coastForce
    }
  }

  // C) Engine braking (in gear, no throttle, clutch engaged)
  if (throttle === 0 && gear !== 'N' && newClutchEngaged && Math.abs(velocity) > 0.5) {
    const engineBrakeForce = -Math.sign(velocity) * MASS * 0.35
    totalForce += engineBrakeForce
  }

  // D) Brake force
  if (brakeInput > 0) {
    const brakeForce = -Math.sign(velocity || 1) * MAX_BRAKE_FORCE * brakeInput
    totalForce += brakeForce
  }

  // E) Handbrake
  if (input.handbrake) {
    const handbrakeForce = -Math.sign(velocity || 1) * HANDBRAKE_FORCE
    totalForce += handbrakeForce
  }

  // F) Aerodynamic drag and rolling resistance (always applies!)
  totalForce += calculateDragForce(velocity)
  totalForce += calculateRollingResistance(velocity, MASS)

  // ========== 3. APPLY ACCELERATION ==========
  let newVelocity = velocity + (totalForce / MASS) * deltaTime

  // Overall max speed check (210 km/h = 58.33 m/s)
  const MAX_SPEED_MS = 210 * KMH_TO_MS
  if (Math.abs(newVelocity) > MAX_SPEED_MS) {
    newVelocity = Math.sign(newVelocity) * MAX_SPEED_MS
  }

  // Prevent oscillation at very low speeds
  if (Math.abs(newVelocity) < 0.03 && throttle === 0 && brakeInput === 0) {
    newVelocity = 0
  }

  // Brake can bring to complete stop
  if (brakeInput > 0 && Math.sign(newVelocity) !== Math.sign(velocity) && Math.abs(velocity) < 0.1) {
    newVelocity = 0
  }

  // ========== 4. UPDATE POSITION (Bicycle Model) ==========
  if (Math.abs(newVelocity) > 0.0005) {
    const distance = newVelocity * deltaTime
    
    if (Math.abs(newSteering) > 0.001) {
      // FIX #1: Speed-dependent steering reduction
      // At high speeds, steering should be LESS effective (realistic car behavior!)
      const speedKmh = Math.abs(newVelocity) * MS_TO_KMH
      const speedFactor = Math.max(0.15, 1.0 - (speedKmh / 200)) // Reduces from 1.0 to 0.15 as speed goes 0→200 km/h
      
      // FIX #2: Correct direction mapping
      // In our coord system: negative steering = turn left, positive = turn right
      // We INVERT the sign because of how sin/cos rotation works below
      const turnRadius = WHEELBASE / Math.tan(Math.abs(newSteering))
      const angularVelocity = (newVelocity / turnRadius) * (-newSteering) * speedFactor
      rotation += angularVelocity * deltaTime
    }

    position[0] += Math.sin(rotation) * distance
    position[2] += Math.cos(rotation) * distance
  }

  // ========== 5. UPDATE ENGINE RPM ==========
  let newEngineRPM = engineRPM
  
  if (gear === 'N' || !newClutchEngaged) {
    // Neutral or clutch disengaged: RPM follows throttle freely
    if (throttle > 0) {
      // Revving in neutral
      const targetRpm = IDLE_RPM + throttle * (REDLINE_RPM - IDLE_RPM) * 0.95
      newEngineRPM = approach(engineRPM, targetRpm, RPM_RESPONSE_RATE, deltaTime)
    } else {
      // Return to idle
      newEngineRPM = approach(engineRPM, IDLE_RPM, RPM_RESPONSE_RATE * 0.8, deltaTime)
    }
  } else {
    // In gear with clutch engaged: RPM coupled to road speed
    const gearRatio = Math.abs(GEAR_RATIOS[gear])
    
    if (gearRatio > 0) {
      const wheelSpeed = Math.abs(newVelocity) / WHEEL_RADIUS
      const speedCoupledRpm = wheelSpeed * gearRatio * PHYSICS.FINAL_DRIVE * (60 / (2 * Math.PI))
      
      let targetRpm: number
      
      const currentSpeedKmh = Math.abs(newVelocity) * MS_TO_KMH
      const maxSpeedForGear = GEAR_MAX_SPEEDS[gear] || 210
      
      if (Math.abs(newVelocity) < 1 && throttle > 0) {
        // Launching from standstill
        const launchRpm = IDLE_RPM + 1200 + throttle * 1800
        targetRpm = clamp(speedCoupledRpm, launchRpm, REDLINE_RPM - 200)
      } else if (currentSpeedKmh >= maxSpeedForGear * 0.95) {
        // At/near gear limit: pin to redline
        targetRpm = REDLINE_RPM
      } else {
        // Normal driving: blend speed RPM with throttle influence
        const throttleEffect = throttle * (REDLINE_RPM - IDLE_RPM) * 0.25
        targetRpm = speedCoupledRpm + throttleEffect
      }
      
      targetRpm = clamp(targetRpm, IDLE_RPM * 0.9, MAX_RPM)
      newEngineRPM = approach(engineRPM, targetRpm, RPM_RESPONSE_RATE, deltaTime)
      
      // Stall check
      if (newEngineRPM <= STALL_RPM && Math.abs(newVelocity) < 0.5 && throttle < 0.1) {
        newEngineRPM = 0 // Stalled!
      }
      
      // Redline bounce effect
      if (newEngineRPM >= REDLINE_RPM) {
        newEngineRPM = REDLINE_RPM - 20 + Math.random() * 40
      }
    }
  }

  // Return updated state
  return {
    position: [...position] as [number, number, number],
    rotation,
    velocity: newVelocity,
    steering: newSteering,
    gear,
    engineRPM: newEngineRPM,
    clutchEngaged: newClutchEngaged,
  }
}
