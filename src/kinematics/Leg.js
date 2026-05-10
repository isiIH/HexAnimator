/**
 * Leg class with IK and FK.
 */
import { T, matMul, matInv } from './MathUtils.js';

export class Leg {
  constructor(dims, xyzRpy) {
    const [x, y, z, r, p, yaw] = xyzRpy;
    this.T_coxa = T(x, y, z, r, p, yaw);

    this.hip_length   = dims[0];
    this.femur_length = dims[1];
    this.tibia_length = dims[2];
    this.total_length = this.hip_length + this.femur_length + this.tibia_length;

    this.Ts_foot = matMul(this.T_coxa, T(this.total_length));

    this.ths = [0, 0, 0];
  }

  getLocalPos(T_sb) {
    const Ts_c   = matMul(T_sb, this.T_coxa);
    const Tc_f   = matMul(matInv(Ts_c), this.Ts_foot);
    return [Tc_f[0][3], Tc_f[1][3], Tc_f[2][3]];
  }

  legIk(pos) {
    const [x, y, z] = pos;

    this.ths[0] = Math.atan2(y, x);

    const r      = Math.sqrt(x * x + y * y);
    const l_left = r - this.hip_length;
    let   hf     = Math.sqrt(l_left * l_left + z * z);

    const max_reach = this.femur_length + this.tibia_length - 0.001;
    const min_reach = Math.abs(this.femur_length - this.tibia_length) + 0.001;
    hf = Math.max(min_reach, Math.min(hf, max_reach));

    const a1 = Math.atan2(l_left, -z);

    let arg_a2 = (this.femur_length**2 + hf**2 - this.tibia_length**2) / (2 * this.femur_length * hf);
    arg_a2 = Math.max(-1, Math.min(1, arg_a2));
    const a2 = Math.acos(arg_a2);

    let arg_b1 = (this.femur_length**2 + this.tibia_length**2 - hf**2) / (2 * this.femur_length * this.tibia_length);
    arg_b1 = Math.max(-1, Math.min(1, arg_b1));
    const b1 = Math.acos(arg_b1);

    const angle_down = Math.PI - b1;
    const angle_up   = b1 - Math.PI;

    if (Math.abs(this.ths[2] - angle_down) <= Math.abs(this.ths[2] - angle_up)) {
      this.ths[1] = Math.PI / 2 - (a1 + a2);
      this.ths[2] = angle_down;
    } else {
      this.ths[1] = Math.PI / 2 - (a1 - a2);
      this.ths[2] = angle_up;
    }
    return [...this.ths];
  }

  legFk(ths) {
    this.ths = [...ths];
    const T0 = T(0,0,0,0,0, ths[0]);
    const T1 = matMul(matMul(T0, T(this.hip_length)), T(0,0,0,0, ths[1]));
    const T2 = matMul(matMul(T1, T(this.femur_length)), T(0,0,0,0, ths[2]));
    const Tf = matMul(T2, T(this.tibia_length));
    return [Tf[0][3], Tf[1][3], Tf[2][3]];
  }
}
