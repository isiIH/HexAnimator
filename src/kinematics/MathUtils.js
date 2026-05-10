/**
 * Rotation matrix using ZYX Euler convention (yaw * pitch * roll).
 */

export function T(x = 0, y = 0, z = 0, roll = 0, pitch = 0, yaw = 0) {
  const cr = Math.cos(roll),  sr = Math.sin(roll);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw),   sy = Math.sin(yaw);

  // Column-major flat array matching numpy output exactly
  return [
    [cp*cy,             -cp*sy,             sp,     x],
    [sr*sp*cy + cr*sy,  -sr*sp*sy + cr*cy,  -sr*cp, y],
    [-cr*sp*cy + sr*sy, cr*sp*sy + sr*cy,   cr*cp,  z],
    [0,                 0,                  0,      1]
  ];
}

// Matrix multiply (4x4)
export function matMul(A, B) {
  const C = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

// Matrix inverse (4x4 homogeneous: R^T and -R^T * t)
export function matInv(M) {
  const R = [[M[0][0], M[1][0], M[2][0]],
             [M[0][1], M[1][1], M[2][1]],
             [M[0][2], M[1][2], M[2][2]]];
  const t = [M[0][3], M[1][3], M[2][3]];
  const nt = [
    -(R[0][0]*t[0] + R[0][1]*t[1] + R[0][2]*t[2]),
    -(R[1][0]*t[0] + R[1][1]*t[1] + R[1][2]*t[2]),
    -(R[2][0]*t[0] + R[2][1]*t[1] + R[2][2]*t[2]),
  ];
  return [
    [R[0][0], R[0][1], R[0][2], nt[0]],
    [R[1][0], R[1][1], R[1][2], nt[1]],
    [R[2][0], R[2][1], R[2][2], nt[2]],
    [0, 0, 0, 1]
  ];
}

export function eye4() {
  return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
}

export function translation4(x, y, z) {
  return [[1,0,0,x],[0,1,0,y],[0,0,1,z],[0,0,0,1]];
}
