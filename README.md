# HexAnimator

<p align="center">
  <strong>A web-based Hexapod Kinematics & Animation Suite</strong><br>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/9e9bd6b5-cb07-445e-b56c-957196cd0d60" alt="HexAnimator Demo" width="300" />
</p>

<p align="center">
   <a href="https://isiih.github.io/HexAnimator/"><strong>Try HexAnimator on your browser</strong></a>
</p>

---

**HexAnimator** is an intuitive, web-based 3D simulation tool for hexapod robots. It allows you to manipulate real-time inverse kinematics (IK), sequence animations using keyframes, and plan leg trajectories directly from your browser.

## Features

*   **Precise Pose Control:** Manipulate the robot's full body transformation matrix (X, Y, Z, Roll, Pitch, Yaw) using intuitive sliders, and independently adjust each leg through direct joint angle controls.
*   **Timeline Editing:** Generate keyframes to capture any robot pose. The timeline allows you to move or delete keyframes, adjust the timing between them, change interpolation curves for smoother transitions, and apply parabolic arc movements for realistic leg lifting.
*   **Built-in Animations:** Quickly test the robot's capabilities by triggering pre-configured animation sequences, such as the included "attack" motion.
*   **Import and Export Animations:** Seamlessly save your workflow or share sequences by exporting and importing your animation data as JSON files.

*Note: You can run your animations via this [Ros2 package with Rviz](https://github.com/isiIH/sophia_hexapod/tree/main/hexapod_animation).*

## Tech Stack & Architecture

Built for high performance and clean structure using **React 18**, **Three.js** (via React Three Fiber), and **Vite**. 

## Quick Start

Ensure you have **Node.js (v16+)** installed.

```bash
# 1. Clone the repository and navigate into it
git clone https://github.com/isiIH/HexAnimator.git
cd HexAnimator

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```