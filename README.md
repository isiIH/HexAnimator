# HexAnimator: Hexapod Kinematics and Animation Suite

HexAnimator is a web-based simulation and animation tool designed for hexapod robots. It provides an intuitive interface for real-time inverse kinematics (IK) manipulation, keyframe-based animation sequencing, and trajectory planning.

## Key Features

### Real-Time Kinematics Engine
- Comprehensive Inverse Kinematics (IK) for all six legs, allowing for precise foot placement in 3D space.
- Direct joint angle control for fine-tuning individual motor positions.
- Body pose transformations including translation (X, Y, Z) and rotation (Roll, Pitch, Yaw) with automatic leg compensation.

### Advanced Animation Editor
- Timeline-based keyframe management with intuitive marker interaction.
- Keyframe reordering system for flexible sequence modification.
- Configurable interpolation easing functions (Linear, Ease-In, Ease-Out, Ease-In-Out).
- Parabolic leg lift trajectory planning with adjustable arc height parameters.

### User Interface and Experience
- Professional glassmorphic design system optimized for high-density information display.
- Fully responsive architecture tailored for desktop, tablet, and mobile (Android/iOS) viewports.
- Integrated accordion-style control panels for efficient workspace management on desktop.
- Specialized mobile interface with tabbed navigation and sticky controls for on-the-go editing.

### Data Management
- Project persistence via JSON export and import.
- Built-in animation library support, including quick-access triggers for pre-defined sequences.

## Technical Stack

- **Core Framework**: React 18
- **3D Rendering Engine**: Three.js via React Three Fiber
- **Robot Modeling**: URDF (Unified Robot Description Format) parsing and visualization
- **Build System**: Vite
- **Styling**: Vanilla CSS3 with advanced flexbox/grid architectures and dynamic viewport units

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
To run the application in development mode with hot-reloading:
```bash
npm run dev
```

### Production Build
To create a minimized production bundle:
```bash
npm run build
```

## Application Architecture

The application is structured into three primary layers:
1. **Simulation Layer**: Handles the mathematical models for kinematics and robot state.
2. **Scene Layer**: Manages the 3D environment, lighting, and URDF model rendering.
3. **Interface Layer**: Provides the control panels, timeline, and state management logic.
