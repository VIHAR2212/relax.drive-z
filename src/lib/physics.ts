import * as THREE from 'three'
import { GearType } from '@/store/useGameStore'

// Physics constants for realistic driving feel - 6-speed manual transmission
export const PHYSICS = {
  // 6-Speed Manual Transmission Gear Ratios (similar to VW Golf GTI Mk2)
  GEAR_RATIOS: {
    'R': -3.50,   // Reverse
    'N': 0,       // Neutral
    '1': 3.55,    // 1st Gear
    '2': 2.11,    // 2nd Gear  
    '3': 1.38,    // 3rd Gear
    '4': 1.03,    // 4th Gear
    '5': 0.83,    // 5th Gear (Overdrive)
    '6': 0.67,    // 6th Gear (Tall overdrive)
  } as Record<GearType, number>,
  
  // Final drive ratio (typical for FWD hot hatch)
  FINAL_DRIVE: 3.67,
  
  // Engine characteristics (1.8L 16V DOHC - GTI spec)
  IDLE_RPM: 850,
  MAX_RPM: 6800,
  REDLINE_RPM: 6500,
  STALL_RPM: 150,
  ENGINE_BRAKING: 0.35,
  
  // Vehicle specs (VW Golf GTI Mk2)
  MASS: 980,
  WHEELBASE: 2.51,
  TURN_RADIUS: 5.8,
  
  TIRE_GRIP: 0.95,
  ROLLING_RESISTANCE: 0.012,
  
  MAX_POWER: 107000,
  MAX_TORQUE: 178,
  PEAK_TORQUE_RPM: 4500,
  
  MAX_BRAKE_FORCE: 14000,
  HANDBRAKE_FORCE: 7000,
  
  STEERING_SPEED: 2.8,
  STEERING_RETURN: 3.5,
  MAX_STEERING_ANGLE: Math.PI / 4.5,
  
  DRAG_COEFFICIENT: 0.34,
  FRONTAL_AREA: 2.05,
  AIR_DENSITY: 1.225,
  
  WHEEL_RADIUS: 0.30,
  RPM_RESPONSE_RATE: 6.5,
}

// FIXED: Engine now produces torque at idle!
export function getEngineTorque(rpm: number): number {
  const { IDLE_RPM, MAX_RPM, MAX_TORQUE, STALL_RPM } = PHYSICS
  
  if (rpm <= STALL_RPM || rpm > MAX_RPM) return 0
  
  const rpmRange = MAX_RPM - IDLE_RPM
  const normalizedRPM = Math.max(0, (rpm - IDLE_RPM) / rpmRange)
  
  let torqueMultiplier: number
  
  if (normalizedRPM < 0.1) {
    // FIX: 40% base torque at idle (was 0%!)
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
  gear: GearType,
  rpm: number,
  throttle: number,
  velocity: number,
  clutchEngaged: boolean = true
): number {
  if (gear === 'N') return 0
  if (!clutchEngaged) return 0  // Clutch disengaged = no power to wheels
  
  const { GEAR_RATIOS, FINAL_DRIVE, WHEEL_RADIUS } = PHYSICS
  const gearRatio = GEAR_RATIOS[gear]
  if (gearRatio === 0) return 0
  
  const engineTorque = getEngineTorque(rpm)
  const wheelTorque = engineTorque * Math.abs(gearRatio) * FINAL_DRIVE * throttle
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
  const { GEAR_RATIOS, FINAL_DRIVE, MAX_RPM, WHEEL_RADIUS } = PHYSICS
  const ratio = GEAR_RATIOS[gear]
  if (ratio === 0) return 0
  const wheelCircumference = 2 * Math.PI * WHEEL_RADIUS
  const speedMs = (MAX_RPM * wheelCircumference) / (Math.abs(ratio) * FINAL_DRIVE * 60)
  return Math.abs(speedMs * 3.6)
}

export function getShiftPoint(currentGear: GearType): number {
  const shiftPoints: Record<GearType, number> = {
    'R': 6000, 'N': 0, '1': 6200, '2': 6000,
    '3': 5800, '4': 5500, '5': 5200, '6': 5000,
  }
  return shiftPoints[currentGear] || 6000
}

function approach(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-rate * dt)
  return current + (target - current) * t
}

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
  const { position, rotation, velocity, steering, gear, engineRPM, clutchEngaged, input } = state

  const {
    MASS, STEERING_SPEED, STEERING_RETURN, MAX_STEERING_ANGLE,
    ENGINE_BRAKING, IDLE_RPM, MAX_RPM, REDLINE_RPM, STALL_RPM,
    MAX_BRAKE_FORCE, HANDBRAKE_FORCE, WHEELBASE, GEAR_RATIOS,
    WHEEL_RADIUS, RPM_RESPONSE_RATE,
  } = PHYSICS

  let newVelocity = velocity
  let newRotation = rotation
  let newSteering = steering
  let newEngineRPM = engineRPM
  let newClutchEngaged = !input.clutchPressed

  const throttle = input.forward ? 1 : 0
  const brakeInput = input.backward ? 1 : 0

  // Steering update
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

  // Calculate forces
  let totalForce = 0

  if (throttle > 0 && gear !== 'N') {
    const wheelForce = calculateWheelForce(gear, newEngineRPM, throttle, velocity, newClutchEngaged)
    
    const isReverseGear = gear === 'R'
    const goingWrongDirection = (isReverseGear && velocity > 0.5) || (!isReverseGear && velocity < -0.5)
    
    if (goingWrongDirection) {
      totalForce -= MASS * ENGINE_BRAKING * 10
    } else {
      totalForce += wheelForce
    }
  }

  if (throttle === 0 && gear !== 'N' && newClutchEngaged && Math.abs(velocity) > 0.1) {
    totalForce += -Math.sign(velocity) * MASS * ENGINE_BRAKING
  }

  if (brakeInput > 0) {
    totalForce += -Math.sign(velocity || 1) * MAX_BRAKE_FORCE * brakeInput
  }

  if (input.handbrake) {
    totalForce += -Math.sign(velocity || 1) * HANDBRAKE_FORCE
  }

  totalForce += calculateDragForce(velocity) + calculateRollingResistance(velocity, MASS)

  // Apply acceleration
  const acceleration = totalForce / MASS
  newVelocity += acceleration * deltaTime

  if (Math.abs(newVelocity) < 0.02 && throttle === 0 && brakeInput === 0) {
    newVelocity = 0
  }

  // Update position (bicycle model)
  if (Math.abs(newVelocity) > 0.001) {
    const distance = newVelocity * deltaTime
    
    if (Math.abs(newSteering) > 0.001) {
      const turnRadius = WHEELBASE / Math.tan(Math.abs(newSteering))
      const angularVelocity = newVelocity / turnRadius
      newRotation += angularVelocity * deltaTime
    }

    position[0] += Math.sin(newRotation) * distance
    position[2] += Math.cos(newRotation) * distance
  }

  // Update engine RPM
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
      
      if (Math.abs(newVelocity) < 0.5 && throttle > 0) {
        // Launching from standstill - allows car to move!
        const launchRpm = IDLE_RPM + 1500 + throttle * 2000
        targetRpm = Math.max(speedCoupledRpm, launchRpm)
        targetRpm = Math.min(targetRpm, REDLINE_RPM - 200)
      } else {
        const throttleEffect = throttle * (REDLINE_RPM - IDLE_RPM) * 0.3
        targetRpm = speedCoupledRpm + throttleEffect
      }
      
      targetRpm = THREE.MathUtils.clamp(targetRpm, IDLE_RPM * 0.9, MAX_RPM)
      newEngineRPM = approach(engineRPM, targetRpm, RPM_RESPONSE_RATE, deltaTime)
      
      if (newEngineRPM <= STALL_RPM && Math.abs(newVelocity) < 0.5 && throttle < 0.1) {
        newEngineRPM = 0
      }
      
      if (newEngineRPM >= REDLINE_RPM) {
        newEngineRPM = REDLINE_RPM + (Math.random() - 0.5) * 100
      }
    }
  }

  // World boundary wrapping
  const WORLD_SIZE = 1000
  if (position[0] > WORLD_SIZE) position[0] -= WORLD_SIZE * 2
  if (position[0] < -WORLD_SIZE) position[0] += WORLD_SIZE * 2
  if (position[2] > WORLD_SIZE) position[2] -= WORLD_SIZE * 2
  if (position[2] < -WORLD_SIZE) position[2] += WORLD_SIZE * 2

  return {
    position: [...position] as [number, number, number],
    rotation: newRotation,
    velocity: newVelocity,
    steering: newSteering,
    gear,
    engineRPM: newEngineRPM,
    clutchEngaged: newClutchEngaged,
  }
}
