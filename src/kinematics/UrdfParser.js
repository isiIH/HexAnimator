/**
 * Utility to parse URDF XML and extract robot kinematics configuration.
 */
export function parseUrdf(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "text/xml");
  
  const prefixes = ['rf', 'rm', 'rb', 'lf', 'lm', 'lb'];
  const legConfigs = [];

  prefixes.forEach(p => {
    const legData = {
      prefix: p,
      origin: [0, 0, 0, 0, 0, 0], // x, y, z, r, p, y
      dims: [0.035, 0.045, 0.09], // coxa, femur, tibia defaults
    };

    // 1. Find mounting origin
    // Sophia uses: [p]_fixed_base_joint
    let joint = xml.querySelector(`joint[name="${p}_fixed_base_joint"]`) || 
                xml.querySelector(`joint[name^="${p}"][name$="base_joint"]`);
    
    if (joint) {
      const origin = joint.querySelector("origin");
      if (origin) {
        legData.origin = [
          ...parseVec3(origin.getAttribute("xyz")),
          ...parseVec3(origin.getAttribute("rpy"))
        ];
      }
    }

    // 2. Find segment lengths
    // Coxa length: origin of coxa->femur joint
    let cfJoint = xml.querySelector(`joint[name="${p}_coxa_link_to_${p}_femur_link"]`) ||
                  xml.querySelector(`joint[name*="${p}"][name*="coxa"][name*="femur"]`);
    if (cfJoint) {
      const origin = cfJoint.querySelector("origin");
      if (origin) {
        legData.dims[0] = parseVec3(origin.getAttribute("xyz"))[0];
      }
    }

    // Femur length: origin of femur->tibia joint
    let ftJoint = xml.querySelector(`joint[name="${p}_femur_link_to_${p}_tibia_link"]`) ||
                  xml.querySelector(`joint[name*="${p}"][name*="femur"][name*="tibia"]`);
    if (ftJoint) {
      const origin = ftJoint.querySelector("origin");
      if (origin) {
        legData.dims[1] = parseVec3(origin.getAttribute("xyz"))[0];
      }
    }

    // Tibia length: furthest point in tibia link
    let tibiaLink = xml.querySelector(`link[name="${p}_tibia_link"]`) ||
                    xml.querySelector(`link[name*="${p}"][name*="tibia"]`);
    if (tibiaLink) {
      let maxDist = 0;
      // Look in visual and collision
      const geometries = tibiaLink.querySelectorAll("visual, collision");
      geometries.forEach(g => {
        const origin = g.querySelector("origin");
        const xyz = origin ? parseVec3(origin.getAttribute("xyz")) : [0, 0, 0];
        
        // If it's a box, add half size? No, usually it's a cylinder or sphere at the tip.
        // For Sophia, it's a sphere at 0.0825 with radius 0.0075.
        const sphere = g.querySelector("geometry > sphere");
        const radius = sphere ? parseFloat(sphere.getAttribute("radius")) : 0;
        
        const dist = xyz[0] + radius; // Assume oriented along X
        if (dist > maxDist) maxDist = dist;
      });
      if (maxDist > 0) legData.dims[2] = maxDist;
    }

    legConfigs.push(legData);
  });

  return legConfigs;
}

function parseVec3(str) {
  if (!str) return [0, 0, 0];
  return str.split(/\s+/).map(s => parseFloat(s) || 0);
}
