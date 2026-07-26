import * as THREE from 'three'
import { GearType } from '@/store/useGameStore'

export const PHYSICS = {
  GEAR_RATIOS: {
    'R': -3.50, 'N': 0, '1': 3.55, '2': 2.11,
    '3': 1.38, '4': 1.03, '5': 0.83, '6': 0.67,
  } as Record<GearType, number>,
  
  // GEAR SPEED LIMITS (User Spec!)
  GEAR_MAX_SPEEDS: {
    'R': 15, 'N': 0, '1': 15, '2': 30, '3': 40,
    '4': 50, '5': 65, '6': 210,
  } as Record<GearType, number>,
  
  GEAR_BOG_SPEEDS: {
    'R': 0, 'N': 0, '1': 0, '2': 8, '3': 18,
    '4': 28, '5': 38, '6': 48,
  } as Record<GearType, number>,
  
  FINAL_DRIVE: 3.67,
  IDLE_RPM: 850, MAX_RPM: 6800, REDLINE_RPM: 6500,
  STALL_RPM: 150, PEAK_TORQUE_RPM: 4500,
  MASS: 980, WHEELBASE: 2.51,
  ROLLING_RESISTANCE: 0.013, DRAG_COEFFICIENT: 0.34,
  FRONTAL_AREA: 2.05, AIR_DENSITY: 1.225,
  MAX_TORQUE: 178, MAX_BRAKE_FORCE: 14000, HANDBRAKE_FORCE: 7000,
  STEERING_SPEED: 2.8, STEERING_RETURN: 3.5,
  MAX_STEERING_ANGLE: Math.PI / 4.5, WHEEL_RADIUS: 0.30,
  RPM_RESPONSE_RATE: 6.5, COAST_DECELERATION: 0.5,
}

const KMH_TO_MS = 1 / 3.6
const MS_TO_KMH = 3.6

export function getEngineTorque(rpm: number): number {
  const { IDLE_RPM, MAX_RPM, MAX_TORQUE, STALL_RPM } = PHYSICS
  
  if (rpm <= STALL_RPM || rpm > MAX_RPM) return 0
  
  const rpmRange = MAX_RPM - IDLE_RPM
  const normalizedRPM = Math.max(0, (rpm - IDLE_RPM) / rpmRange)
  
  let torqueMultiplier: number
  
  if (normalizedRPM < 0.1) {
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

export function calculateWheelForce(
  gear: GearType, rpm: number, throttle: number,
  velocity: number, clutchEngaged: boolean = true
): number {
  if (gear === 'N') return 0
  if (!clutchEngaged) return 0
  
  const { GEAR_RATIOS, FINAL_DRIVE, WHEEL_RADIUS, GEAR_MAX_SPEEDS, GEAR_BOG_SPEEDS } = PHYSICS
  const gearRatio = GEAR_RATIOS[gear]
  if (gearRatio === 0) return 0
  
  const currentSpeedKmh = Math.abs(velocity) * MS_TO_KMH
  const maxSpeedKmh = GEAR_MAX_SPEEDS[gear]
  const bogSpeedKmh = GEAR_BOG_SPEEDS[gear]
  
  let effectiveThrottle = throttle
  let torqueFactor = 1.0
  
  // Reduce power as approaching gear's max speed
  if (maxSpeedKmh > 0 && currentSpeedKmh > maxSpeedKmh * 0.85) {
    const speedFactor = 1 - ((currentSpeedKmh - maxSpeedKmh * 0.85) / (maxSpeedKmh * 0.15))
    effectiveThrottle *= Math.max(0, Math.min(1, speedFactor))
    
    if (currentSpeedKmh >= maxSpeedKmh) {
      effectiveThrottle = 0
      torqueFactor = 0.05
    }
  }
  
  // Bogging: reduce power if speed too low for gear
  if (bogSpeedKmh > 0 && currentSpeedKmh < bogSpeedKmh && currentSpeedKmh > 2) {
    const bogFactor = currentSpeedKmh / bogSpeedKmh
    torqueFactor = 0.1 + bogFactor * 0.3
    
    if (currentSpeedKmh < bogSpeedKmh * 0.5) {
      torqueFactor = 0.02
    }
  }
  
  const engineTorque = getEngineTorque(rpm)
  const wheelTorque = engineTorque * Math.abs(gearRatio) * FINAL_DRIVE * effectiveThrottle * torqueFactor
  const wheelForce = wheelTorque / WHEEL_RADIUS
  
  return gearRatio > 0 ? wheelForce : -wheelForce
}

export function calculateDragForce(velocity: number): number {
  const { DRAG_COEFFICIENT, FRONTAL_AREA, AIR_DENSITY } = PHYSICS
  const speed = Math.abs(velocity)
  const sign = velocity >= 0 ? 1 : -1
  return sign * 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * FRONTAL_AREA * speed * speed
}

export function calculateRollingResistance(velocity: number, mass: number): number {
  const { ROLLING_RESISTANCE } = PHYSICS
  const speed = Math.abs(velocity)
  const sign = velocity >= 0 ? -1 : 1
  return sign * ROLLING_RESISTANCE * mass * 9.81 * (1 + 0.01 * speed)
}

export function getGearTopSpeed(gear: GearType): number {
  return PHYSICS.GEAR_MAX_SPEEDS[gear] || 0
}

export function getShiftPoint(currentGear: GearType): number {
  const shiftPoints: Record<GearType, number> = {
    'R': 5500, 'N': 0, '1': 6000, '2': 5800,
    '3': 5600, '4': 5400, '5': 5200, '6': 6000,
  }
  return shiftPoints[currentGear] || 6000
}

function approach(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-rate * dt)
  return current + (target - current) * t
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function updatePhysics(state: {
  position: [number, number, number]; rotation: number; velocity: number;
  steering: number; gear: GearType; engineRPM: number; clutchEngaged: boolean;
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean; handbrake: boolean; clutchPressed: boolean }
}, deltaTime: number) {
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

  // Steering
  let newSteering = steering
  if (input.left) {
    newSteering = Math.max(-MAX_STEERING_ANGLE, steering - STEERING_SPEED * deltaTime)
  } else if (input.right) {
    newSteering = Math.min(MAX_STEERING_ANGLE, steering + STEERING_SPEED * deltaTime)
  } else {
    if (Math.abs(newSteering) < STEERING_RETURN * deltaTime) {
      newSteering = 0
    } else if (newSteering > 0) {
      newSteering -= STEERING_RETURN * deltaTime
    } else {
      newSteering += STEERING_RETURN * deltaTime
    }
  }

  // Forces
  let totalForce = 0

  // Engine force with gear limits
  if (throttle > 0 && gear !== 'N' && newClutchEngaged) {
    const wheelForce = calculateWheelForce(gear, engineRPM, throttle, velocity, newClutchEngaged)
    const isReverseGear = gear === 'R'
    const goingWrongDirection = (isReverseGear && velocity > 0.5) || (!isReverseGear && velocity < -0.5)
    
    if (!goingWrongDirection) {
      totalForce += wheelForce
    } else {
      totalForce -= MASS * 10
    }
  }

  // Neutral coast deceleration (FIXED!)
  if (gear === 'N' && Math.abs(velocity) > 0.1) {
    const coastForce = -Math.sign(velocity) * MASS * COAST_DECELERATION
    totalForce += coastForce
  }

  // Engine braking
  if (throttle === 0 && gear !== 'N' && newClutchEngaged && Math.abs(velocity) > 0.5) {
    totalForce += -Math.sign(velocity) * MASS * 0.35
  }

  // Brakes
  if (brakeInput > 0) {
    totalForce += -Math.sign(velocity || 1) * MAX_BRAKE_FORCE * brakeInput
  }

  // Handbrake
  if (input.handbrake) {
    totalForce += -Math.sign(velocity || 1) * HANDBRAKE_FORCE
  }

  // Drag & rolling resistance (always!)
  totalForce += calculateDragForce(velocity)
  totalForce += calculateRollingResistance(velocity, MASS)

  // Apply acceleration
  let newVelocity = velocity + (totalForce / MASS) * deltaTime

  // Overall max speed: 210 km/h
  const MAX_SPEED_MS = 210 * KMH_TO_MS
  if (Math.abs(newVelocity) > MAX_SPEED_MS) {
    newVelocity = Math.sign(newVelocity) * MAX_SPEED_MS
  }

  if (Math.abs(newVelocity) < 0.03 && throttle === 0 && brakeInput === 0) {
    newVelocity = 0
  }

  if (brakeInput > 0 && Math.sign(newVelocity) !== Math.sign(velocity) && Math.abs(velocity) < 0.1) {
    newVelocity = 0
  }

  // Position update (bicycle model)
  if (Math.abs(newVelocity) > 0.0005) {
    const distance = newVelocity * deltaTime
    
    if (Math.abs(newSteering) > 0.001) {
      const turnRadius = WHEELBASE / Math.tan(Math.abs(newSteering))
      const angularVelocity = newVelocity / turnRadius
      rotation += angularVelocity * deltaTime
    }

    position[0] += Math.sin(rotation) * distance
    position[2] += Math.cos(rotation) * distance
  }

  // RPM update
  let newEngineRPM = engineRPM
  
  if (gear === 'N' || !newClutchEngaged) {
    if (throttle > 0) {
      const targetRpm = IDLE_RPM + throttle * (REDLINE_RPM - IDLE_RPM) * 0.95
      newEngineRPM = approach(engineRPM, targetRpm, RPM_RESPONSE_RATE, deltaTime)
    } else {
      newEngineRPM = approach(engineRPM, IDLE_RPM, RPM_RESPONSE_RATE * 0.8, deltaTime)
    }
  } else {
    const gearRatio = Math.abs(GEAR_RATIOS[gear])
    
    if (gearRatio > 0) {
      const wheelSpeed = Math.abs(newVelocity) / WHEEL_RADIUS
      const speedCoupledRpm = wheelSpeed * gearRatio * PHYSICS.FINAL_DRIVE * (60 / (2 * Math.PI))
      
      let targetRpm: number
      const currentSpeedKmh = Math.abs(newVelocity) * MS_TO_KMH
      const maxSpeedForGear = GEAR_MAX_SPEEDS[gear] || 210
      
      if (Math.abs(newVelocity) < 1 && throttle > 0) {
        const launchRpm = IDLE_RPM + 1200 + throttle * 1800
        targetRpm = clamp(speedCoupledRpm, launchRpm, REDLINE_RPM - 200)
      } else if (currentSpeedKmh >= maxSpeedForGear * 0.95) {
        targetRpm = REDLINE_RPM
      } else {
        const throttleEffect = throttle * (REDLINE_RPM - IDLE_RPM) * 0.25
        targetRpm = speedCoupledRpm + throttleEffect
      }
      
      targetRpm = clamp(targetRpm, IDLE_RPM * 0.9, MAX_RPM)
      newEngineRPM = approach(engineRPM, targetRpm, RPM_RESPONSE_RATE, deltaTime)
      
      if (newEngineRPM <= STALL_RPM && Math.abs(newVelocity) < 0.5 && throttle < 0.1) {
        newEngineRPM = 0
      }
      
      if (newEngineRPM >= REDLINE_RPM) {
        newEngineRPM = REDLINE_RPM - 20 + Math.random() * 40
      }
    }
  }

  return {
    position: [...position] as [number, number, number],
    rotation, velocity: newVelocity, steering: newSteering,
    gear, engineRPM: newEngineRPM, clutchEngaged: newClutchEngaged,
  }
}
