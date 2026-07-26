# 🚗 relax.drive

A relaxing 3D browser-based open-world driving experience with realistic manual transmission physics.

![relax.drive](https://img.shields.io/badge/relax.drive-3D_Driving_Game-blue?style=for-the-badge)

## 🎮 Features

- **Realistic 6-Speed Manual Transmission** - Shift through gears 1-6 + Neutral + Reverse
- **Physics-Based Driving** - Engine torque curves, drag, rolling resistance, engine braking
- **3D Open World** - Procedural terrain with 200+ optimized trees
- **Chase Camera** - Smooth third-person camera following the vehicle
- **GLB Car Models** - Support for custom 3D car models
- **Browser-Based** - Runs entirely in the browser using WebGL

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate (Gas) |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `Space` | Handbrake |
| `Shift + 1` | 1st Gear |
| `Shift + 2` | 2nd Gear |
| `Shift + 3` | 3rd Gear |
| `Shift + 4` | 4th Gear |
| `Shift + 5` | 5th Gear |
| `Shift + 6` | 6th Gear |
| `Shift + N` | Neutral |
| `Shift + R` | Reverse |
| `P` / `Escape` | Pause |

## 🛠️ Tech Stack

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React Three Fiber](https://github.com/pmndrs/react-three-fiber)** - React renderer for Three.js
- **[Three.js](https://threejs.org/)** - 3D graphics library
- **[@react-three/drei](https://github.com/pmndrs/drei)** - Useful helpers for R3F
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS

## 📦 Installation & Local Run

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm or yarn or pnpm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/relax-drive.git

# 2. Enter the project directory
cd relax-drive

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# 5. Open browser to http://localhost:3000
```

## 🌐 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/relax-drive)

**One-click deployment:**
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select this repository
4. Click "Deploy" - Done!

### Manual Vercel Setup

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
vercel
```

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main entry point
│   ├── layout.tsx        # Root layout with fonts
│   └── globals.css       # Global styles
├── components/game/
│   ├── Car.tsx           # Vehicle component (GLB model)
│   ├── Terrain.tsx       # Ground/world terrain
│   ├── Trees.tsx         # Instanced tree system
│   ├── CameraController.tsx # Chase camera
│   ├── InputHandler.tsx  # Keyboard input handler
│   ├── HUD.tsx           # Heads-up display
│   └── GameScene.tsx     # Main 3D canvas scene
├── store/
│   └── useGameStore.ts   # Zustand state management
└── lib/
    └── physics.ts        # Vehicle physics engine
public/
└── models/               # GLB car models
```

## 🎨 Custom Car Models

Add your own `.glb` car models to `public/models/` folder and update `src/components/game/Car.tsx` to load them using `useGLTF` from `@react-three/drei`.

## ⚙️ Performance Optimizations

- InstancedMesh for trees (200+ trees in only 4 draw calls)
- No shadow maps (reduces GPU load)
- DPR capping at [1, 1.5]
- High-performance WebGL context
- Dynamic imports with SSR disabled for 3D components

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for relaxing drives**
