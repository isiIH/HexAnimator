# HexAnimator: Hexapod Kinematics and Animation Suite

HexAnimator is a web-based simulation and animation tool designed for hexapod robots. It provides an intuitive interface for real-time inverse kinematics (IK) manipulation, keyframe-based animation sequencing, and trajectory planning.

## Key Features

### Hexapod Kinematics Engine
- **Dynamic URDF Parsing**: Automatically extracts joint configurations, link lengths, and mounting origins from any provided URDF file following a URDF standard convention for hexapod robots.
- **Comprehensive Inverse Kinematics (IK)**: Real-time IK solver for all six legs, with integrated safety checks to prevent out-of-reach positions or physical joint limit violations.
- **Direct Angle Control**: Purely angular-based backend to ensure universal compatibility across different robot models.
- **Smart Body Transformations**: Body pose adjustments (X, Y, Z, Roll, Pitch, Yaw) with automatic IK compensation and mathematical singularity prevention.

### Animation Editor
- Timeline-based keyframe management with marker interaction.
- Keyframe reordering system for flexible sequence modification.
- Configurable interpolation easing functions (Linear, Ease-In, Ease-Out, Ease-In-Out).
- Parabolic leg lift trajectory planning with adjustable arc height parameters.


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
