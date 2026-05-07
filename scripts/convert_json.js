import fs from 'fs';
import { Spider } from '../src/kinematics/Spider.js';

// Read old json
const oldJsonStr = fs.readFileSync('./public/animations/attack_old.json', 'utf8');
const data = JSON.parse(oldJsonStr);

const kfs = data.keyframes || data;
const spider = new Spider(); // Default config is Sophia

const newKfs = kfs.map(kf => {
    // calculate angles from body and legs using IK
    const angles = spider.applyPose(kf.body, kf.legs);
    
    // Create new kf object without legs, but with angles
    const { legs, ...rest } = kf;
    return { ...rest, angles: [...angles] };
});

const newData = {
    version: 1,
    keyframes: newKfs,
    metadata: data.metadata || { date: new Date().toISOString() }
};

fs.writeFileSync('./public/animations/attack.json', JSON.stringify(newData, null, 2));
console.log("Successfully converted attack_old.json to attack.json");
