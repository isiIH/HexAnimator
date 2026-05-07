/**
 * Direct port of spider.py — Spider class managing 6 legs + body IK.
 * No ROS dependencies — pure math.
 */
import { T, matMul, matInv, eye4, translation4 } from './MathUtils.js';
import { Leg } from './Leg.js';

const PREFIXES = ['rf_', 'rm_', 'rb_', 'lf_', 'lm_', 'lb_'];

export class Spider {
  constructor(config = null) {
    this.legs = [];
    this.T_sb = eye4();

    if (config) {
      for (const legCfg of config) {
        this.legs.push(new Leg(legCfg.dims, legCfg.origin));
      }
    } else {
      // Fallback defaults (Sophia-like)
      const dims = [0.035, 0.045, 0.09];
      const chassis_radius = 0.06;
      const yaws = [
        Math.PI / 3,       // rf
        0.0,               // rm
        -Math.PI / 3,      // rb
        2 * Math.PI / 3,   // lf
        Math.PI,           // lm
        4 * Math.PI / 3,   // lb
      ];

      for (const yaw of yaws) {
        const x = chassis_radius * Math.cos(yaw);
        const y = chassis_radius * Math.sin(yaw);
        this.legs.push(new Leg(dims, [x, y, 0, 0, 0, yaw]));
      }
    }

    // Default home positions — could be derived but for now keeping defaults
    // derived from the first leg dimensions if available
    const dims = this.legs[0] ? [this.legs[0].hip_length, this.legs[0].femur_length, this.legs[0].tibia_length] : [0.035, 0.045, 0.09];
    const reach = dims[0] + dims[1] * 0.7; // heuristic
    const height = -dims[2] * 0.7; // heuristic
    
    // For Sophia: 0.035 + 0.045*0.7 = 0.0665, -0.09*0.7 = -0.063.
    // Close enough to [0.085, 0, -0.0627].
    // Let's stick to the Sophia values as default if it's Sophia, 
    // or calculate if lengths are very different.
    if (Math.abs(dims[2] - 0.09) < 0.001) {
      this.home_positions = Array.from({ length: 6 }, () => [0.085, 0, -0.0627]);
    } else {
      this.home_positions = Array.from({ length: 6 }, () => [dims[0] + dims[1], 0, -dims[2]/1.4]);
    }

    this.home();
  }


  updateBodyPos(x = 0, y = 0, z = 0, roll = 0, pitch = 0, yaw = 0) {
    this.T_sb = T(x, y, z, roll, pitch, yaw);
    for (const leg of this.legs) {
      const pos_cf = leg.getLocalPos(this.T_sb);
      leg.legIk(pos_cf);
    }
    return this.getJointAngles();
  }

  moveLegs(positions, targets = null, local = false) {
    if (!targets) targets = [1,1,1,1,1,1];
    for (let i = 0; i < 6; i++) {
      if (targets[i] === 0) continue;
      let pos_cf;
      if (local) {
        const Tc_f = translation4(positions[i][0], positions[i][1], positions[i][2]);
        this.legs[i].Ts_foot = matMul(matMul(this.T_sb, this.legs[i].T_coxa), Tc_f);
        pos_cf = positions[i];
      } else {
        this.legs[i].Ts_foot[0][3] = positions[i][0];
        this.legs[i].Ts_foot[1][3] = positions[i][1];
        this.legs[i].Ts_foot[2][3] = positions[i][2];
        pos_cf = this.legs[i].getLocalPos(this.T_sb);
      }
      this.legs[i].legIk(pos_cf);
    }
    return this.getJointAngles();
  }

  getPlantedLegsPos(nextBody, currentLegs, currentBody) {
    const old_T_sb = T(currentBody.x, currentBody.y, currentBody.z, currentBody.roll, currentBody.pitch, currentBody.yaw);
    const new_T_sb = T(nextBody.x, nextBody.y, nextBody.z, nextBody.roll, nextBody.pitch, nextBody.yaw);
    
    const nextLegs = [];
    for (let i = 0; i < 6; i++) {
      const Tc_f = translation4(currentLegs[i][0], currentLegs[i][1], currentLegs[i][2]);
      const Ts_foot = matMul(matMul(old_T_sb, this.legs[i].T_coxa), Tc_f);
      
      const Ts_c = matMul(new_T_sb, this.legs[i].T_coxa);
      const new_Tc_f = matMul(matInv(Ts_c), Ts_foot);
      nextLegs.push([new_Tc_f[0][3], new_Tc_f[1][3], new_Tc_f[2][3]]);
    }
    return nextLegs;
  }

  applyPose(body, legs) {
    for (let i = 0; i < 6; i++) {
      const Tc_f = translation4(legs[i][0], legs[i][1], legs[i][2]);
      this.legs[i].Ts_foot = matMul(this.legs[i].T_coxa, Tc_f);
    }
    return this.updateBodyPos(body.x, body.y, body.z, body.roll, body.pitch, body.yaw);
  }

  calcLegPosFromAngles(idx, anglesRad) {
    const pos_cf = this.legs[idx].legFk(anglesRad);
    const T_pos = eye4();
    T_pos[0][3] = pos_cf[0];
    T_pos[1][3] = pos_cf[1];
    T_pos[2][3] = pos_cf[2];

    const Ts_foot = matMul(matMul(this.T_sb, this.legs[idx].T_coxa), T_pos);
    const Tc_f_stored = matMul(matInv(this.legs[idx].T_coxa), Ts_foot);
    
    return [Tc_f_stored[0][3], Tc_f_stored[1][3], Tc_f_stored[2][3]];
  }

  getJointAngles() {
    const angles = [];
    for (const leg of this.legs) {
      angles.push(...leg.ths);
    }
    return angles;
  }

  getLegPositions() {
    return this.legs.map(leg => [leg.Ts_foot[0][3], leg.Ts_foot[1][3], leg.Ts_foot[2][3]]);
  }

  home() {
    this.moveLegs(this.home_positions, null, true);
  }
}

export { PREFIXES };
