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
  ENGINE_BRAKING: 0.35, // Deceleration from engine braking in m/s²
  
  // Vehicle specs (VW Golf GTI Mk2)
  MASS: 980, // kg (lightweight hot hatch)
  WHEELBASE: 2.51, // meters
  TURN_RADIUS: 5.8, // meters at full lock
  
  // Tire friction (performance tires)
  TIRE_GRIP: 0.95,
  ROLLING_RESISTANCE: 0.012,
  
  // Power and torque (GTI 16V specs)
  MAX_POWER: 107000, // Watts (~143 hp)
  MAX_TORQUE: 178, // Nm @ 4500 RPM
  
  // Braking (performance brakes)
  MAX_BRAKE_FORCE: 14000, // N
  HANDBRAKE_FORCE: 7000, // N
  
  // Steering (power steering)
  STEERING_SPEED: 2.8, // radians per second
  STEERING_RETURN: 3.5, // radians per second (return to center)
  MAX_STEERING_ANGLE: Math.PI / 4.5, // ~40 degrees max
  
  // Aerodynamics (Cd ~0.34 for Golf Mk2)
  DRAG_COEFFICIENT: 0.34,
  FRONTAL_AREA: 2.05, // m²
  AIR_DENSITY: 1.225, // kg/m³
  
  // Wheel specifications
  WHEEL_RADIUS: 0.30, // meters (185/60R14 tire)
}

// Calculate engine torque based on RPM (realistic torque curve for 1.8L 16V)
export function getEngineTorque(rpm: number): number {
  const { IDLE_RPM, MAX_RPM, MAX_TORQUE } = PHYSICS
  
  if (rpm < IDLE_RPM) return 0
  if (rpm > MAX_RPM) return 0
  
  // Realistic torque curve for naturally aspirated engine
  // Peaks around 4500-5000 RPM with flat torque curve
  const normalizedRPM = (rpm - IDLE_RPM) / (MAX_RPM - IDLE_RPM)
  
  // Torque curve shape: builds quickly, plateaus in mid-range, tapers at top
  let torqueMultiplier: number
  
  if (normalizedRPM < 0.15) {
    // Low RPM - building torque
    torqueMultiplier = normalizedRPM / 0.15 * 0.85
  } else if (normalizedRPM < 0.65) {
    // Mid-range - strong torque plateau (3500-5000 RPM)
    torqueMultiplier = 0.85 + (normalizedRPM - 0.15) * 0.25
  } else {
    // High RPM - gradual taper towards redline
    torqueMultiplier = 0.95 - (normalizedRPM - 0.65) * 0.4
  }
  
  return MAX_TORQUE * Math.max(0, torqueMultiplier)
}

// Calculate wheel force based on gear, throttle, and current state
export function calculateWheelForce(
  gear: GearType,
  rpm: number,
  throttle: number,
  velocity: number
): number {
  if (gear === 'N') return 0
  
  const { GEAR_RATIOS, FINAL_DRIVE, WHEEL_RADIUS } = PHYSICS
  const gearRatio = GEAR_RATIOS[gear]
  
  if (gearRatio === 0) return 0
  
  const engineTorque = getEngineTorque(rpm)
  const wheelTorque = engineTorque * gearRatio * FINAL_DRIVE * throttle
  const wheelForce = wheelTorque / WHEEL_RADIUS
  
  return wheelForce
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

// Get top speed for each gear (theoretical, in km/h)
export function getGearTopSpeed(gear: GearType): number {
  const { GEAR_RATIOS, FINAL_DRIVE, MAX_RPM, WHEEL_RADIUS } = PHYSICS
  const ratio = GEAR_RATIOS[gear]
  if (ratio === 0) return 0
  
  // v = (RPM * wheel_circumference) / (gear_ratio * final_drive * 60)
  const wheelCircumference = 2 * Math.PI * WHEEL_RADIUS
  const speedMs = (MAX_RPM * wheelCircumference) / (Math.abs(ratio) * FINAL_DRIVE * 60)
  return Math.abs(speedMs * 3.6) // Convert to km/h
}

// Get recommended shift points (RPM where shifting up is optimal)
export function getShiftPoint(currentGear: GearType): number {
  // Shift points vary by gear - typically near redline for performance
  const shiftPoints: Record<GearType, number> = {
    'R': 6000,
    'N': 0,
    '1': 6200,  // Rev high in 1st
    '2': 6000,  // Slightly lower in 2nd
    '3': 5800,  // Mid-range optimal
    '4': 5500,  // Approaching power peak
    '5': 5200,  // Economy zone
    '6': 5000,  // Top gear cruising
  }
  return shiftPoints[currentGear] || 6000
}

// Update vehicle physics
export function updatePhysics(
  state: {
    position: [number, number, number]
    rotation: number
    velocity: number
    steering: number
    gear: GearType
    engineRPM: number
    input: {
      forward: boolean
      backward: boolean
      left: boolean
      right: boolean
      handbrake: boolean
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
} {
  const {
    position,
    rotation,
    velocity,
    steering,
    gear,
    engineRPM,
    input,
  } = state

  const {
    MASS,
    STEERING_SPEED,
    STEERING_RETURN,
    MAX_STEERING_ANGLE,
    TURN_RADIUS,
    ENGINE_BRAKING,
    IDLE_RPM,
    MAX_RPM,
    MAX_BRAKE_FORCE,
    HANDBRAKE_FORCE,
    WHEELBASE,
    GEAR_RATIOS,
    WHEEL_RADIUS,
  } = PHYSICS

  let newVelocity = velocity
  let newRotation = rotation
  let newSteering = steering
  let newEngineRPM = engineRPM

  // Throttle input (0 to 1)
  const throttle = input.forward ? 1 : 0
  const brakeInput = input.backward ? 1 : 0

  // Update steering
  if (input.left) {
    newSteering = Math.max(-MAX_STEERING_ANGLE, steering - STEERING_SPEED * deltaTime)
  } else if (input.right) {
    newSteering = Math.min(MAX_STEERING_ANGLE, steering + STEERING_SPEED * deltaTime)
  } else {
    // Return steering to center
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

  // Engine/Drive force
  if (throttle > 0 && gear !== 'N') {
    const wheelForce = calculateWheelForce(gear, engineRPM, throttle, velocity)
    
    // Check if we're trying to go wrong direction for the gear
    if ((gear === 'R' && velocity > 0.5) || ((gear === '1' || gear === '2' || gear === '3' || gear === '4' || gear === '5' || gear === '6') && velocity < -0.5)) {
      // Engine resists wrong-direction movement
      totalForce -= MASS * ENGINE_BRAKING * 10
    } else {
      totalForce += wheelForce
    }
  }

  // Engine braking when not on throttle in gear
  if (throttle === 0 && gear !== 'N' && Math.abs(velocity) > 0.1) {
    const engineBrakingForce = -Math.sign(velocity) * MASS * ENGINE_BRAKING
    totalForce += engineBrakingForce
  }

  // Brake force
  if (brakeInput > 0) {
    const brakeForce = -Math.sign(velocity || 1) * MAX_BRAKE_FORCE * brakeInput
    totalForce += brakeForce
  }

  // Handbrake
  if (input.handbrake) {
    const handbrakeForce = -Math.sign(velocity || 1) * HANDBRAKE_FORCE
    totalForce += handbrakeForce
  }

  // Drag and rolling resistance
  const dragForce = calculateDragForce(velocity)
  const rollingResistance = calculateRollingResistance(velocity, MASS)
  totalForce += dragForce + rollingResistance

  // Apply acceleration
  const acceleration = totalForce / MASS
  newVelocity += acceleration * deltaTime

  // Prevent very small velocities from oscillating
  if (Math.abs(newVelocity) < 0.02 && throttle === 0 && brakeInput === 0) {
    newVelocity = 0
  }

  // Update position based on velocity and steering (bicycle model)
  if (Math.abs(newVelocity) > 0.001) {
    // Bicycle model for Ackermann-like steering
    const distance = newVelocity * deltaTime
    
    if (Math.abs(newSteering) > 0.001) {
      // Turning radius based on steering angle
      const turnRadius = WHEELBASE / Math.tan(Math.abs(newSteering))
      const angularVelocity = newVelocity / turnRadius
      newRotation += angularVelocity * deltaTime
    }

    // Move forward in direction of rotation
    position[0] += Math.sin(newRotation) * distance
    position[2] += Math.cos(newRotation) * distance
  }

  // Update engine RPM based on velocity and gear
  if (gear === 'N') {
    // In neutral, RPM returns to idle or rises with throttle
    if (throttle > 0) {
      // Revving in neutral - limited revs
      newEngineRPM = THREE.MathUtils.lerp(engineRPM, IDLE_RPM + (MAX_RPM - IDLE_RPM) * throttle * 0.4, deltaTime * 3)
    } else {
      // Gradually return to idle
      newEngineRPM = THREE.MathUtils.lerp(engineRPM, IDLE_RPM, deltaTime * 2)
    }
  } else {
    // Calculate RPM from wheel speed
    const gearRatio = Math.abs(GEAR_RATIOS[gear])
    if (gearRatio > 0) {
      const wheelSpeed = Math.abs(newVelocity) / WHEEL_RADIUS
      newEngineRPM = wheelSpeed * gearRatio * PHYSICS.FINAL_DRIVE * (60 / (2 * Math.PI))
      
      // Clamp RPM
      newEngineRPM = THREE.MathUtils.clamp(newEngineRPM, IDLE_RPM, MAX_RPM)
      
      // Blip throttle when stationary and in gear
      if (Math.abs(newVelocity) < 0.1 && throttle > 0) {
        newEngineRPM = Math.max(newEngineRPM, IDLE_RPM + 1200 * throttle)
      }
    }
  }

  // World boundary wrapping (larger world now)
  const WORLD_SIZE = 1000 // 1km x 1km world
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
  }
}
