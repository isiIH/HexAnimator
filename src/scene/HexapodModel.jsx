import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import URDFLoader from 'urdf-loader'

export default function HexapodModel({ url, angles, bodyPose }) {
  const [robot, setRobot] = useState(null)
  
  useEffect(() => {
    const loader = new URDFLoader()
    loader.load(url, (result) => {
      // DO NOT mutate result.rotation here, React Three Fiber manages primitive props!
      result.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      setRobot(result)
    })
  }, [url])

  useFrame(() => {
    if (robot && angles && angles.length === 18) {
      const prefixes = ['rf_', 'rm_', 'rb_', 'lf_', 'lm_', 'lb_'];
      let angleIdx = 0;
      prefixes.forEach(p => {
        robot.setJointValue(`${p}coxa_joint`, angles[angleIdx]);
        robot.setJointValue(`${p}coxa_link_to_${p}femur_link`, angles[angleIdx+1]);
        robot.setJointValue(`${p}femur_link_to_${p}tibia_link`, angles[angleIdx+2]);
        angleIdx += 3;
      });
    }
  });

  if (!robot) {
    return (
      <Html center>
        <div style={{ color: 'var(--accent-main)', fontFamily: 'var(--font-mono)' }}>
          Loading Robot...
        </div>
      </Html>
    )
  }

  // To move the base relative to the ground, we apply the bodyPose.
  // ROS uses Z-up, Three.js uses Y-up.
  // We use a group with Y-up translation, and then inside it, 
  // the primitive rotates -Math.PI/2 to convert to Z-up for the URDF.
  // Because bodyPose is in Z-up, we must map its translations to Y-up before the rotation.
  const px = bodyPose?.x || 0;
  const pz = -(bodyPose?.y || 0); // ROS Y is Three -Z
  const py = bodyPose?.z || 0;    // ROS Z is Three Y

  // For rotation, we can use a Three.js Euler. ZYX order in ROS = Z, Y, X in Three?
  // Actually, since the primitive inside rotates -PI/2 on X, the parent group should just apply the ROS rotations mapped to Three.js axes.
  // ROS Roll (X) -> Three Roll (X)
  // ROS Pitch (Y) -> Three Pitch (-Z)
  // ROS Yaw (Z) -> Three Yaw (Y)
  // Let's use the rotation prop on the group. 
  
  return (
    <group position={[px, py, pz]} rotation={[bodyPose?.roll || 0, bodyPose?.yaw || 0, -(bodyPose?.pitch || 0), 'XZY']}>
      <primitive object={robot} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0.0]} dispose={null} />
    </group>
  )
}
