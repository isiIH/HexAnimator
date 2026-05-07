import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei'
import HexapodModel from './scene/HexapodModel'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import TopMenu from './components/TopMenu'
import { Spider } from './kinematics/Spider'
import { parseUrdf } from './kinematics/UrdfParser'
import { getFrameAtTime, totalDuration } from './kinematics/AnimationEngine'
import './index.css'

function App() {
  const [spider, setSpider] = useState(() => new Spider());

  const [angles, setAngles] = useState(spider.getJointAngles());
  const [bodyPose, setBodyPose] = useState({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 });
  const [legsPos, setLegsPos] = useState(spider.getLegPositions());
  const [homeLegs, setHomeLegs] = useState(spider.home_positions);
  const [homeAngles, setHomeAngles] = useState(spider.getJointAngles());

  const [selectedLeg, setSelectedLeg] = useState(0);

  const [keyframes, setKeyframes] = useState([]);
  const [selectedKfIdx, setSelectedKfIdx] = useState(-1);

  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [playMode, setPlayMode] = useState('once');
  const [speed, setSpeed] = useState(1);
  const [playDirection, setPlayDirection] = useState(1);

  const lastTickRef = useRef(null);
  const reqRef = useRef(null);
  const angleOverridesRef = useRef({});

  const duration = useMemo(() => totalDuration(keyframes), [keyframes]);

  // Apply pose when Body or Legs change (only if not playing, else engine handles it)
  useEffect(() => {
    if (!playing) {
      const newAngles = spider.applyPose(bodyPose, legsPos);

      // Apply manual angle overrides to prevent IK/FK jitter
      for (const [legIdx, overrideAngles] of Object.entries(angleOverridesRef.current)) {
        const idx = parseInt(legIdx, 10);
        newAngles[idx * 3] = overrideAngles[0];
        newAngles[idx * 3 + 1] = overrideAngles[1];
        newAngles[idx * 3 + 2] = overrideAngles[2];
      }

      setAngles(newAngles);
    }
  }, [bodyPose, legsPos, playing, spider]);

  // Playback Engine Loop
  const tick = (time) => {
    if (!lastTickRef.current) lastTickRef.current = time;
    const dt = (time - lastTickRef.current) / 1000.0;
    lastTickRef.current = time;

    setPlayTime((prev) => {
      let nextDir = playDirection;
      if (playMode !== 'pingpong' && nextDir === -1) {
        nextDir = 1;
        setPlayDirection(1);
      }
      let nextTime = prev + (dt * speed * nextDir);
      let isPlaying = true;

      if (duration <= 0) {
        isPlaying = false;
        nextTime = 0;
      } else {
        if (playMode === 'once') {
          if (nextTime >= duration) {
            nextTime = duration;
            isPlaying = false;
          }
        } else if (playMode === 'loop') {
          if (nextTime >= duration) nextTime = nextTime % duration;
        } else if (playMode === 'pingpong') {
          if (nextDir === 1 && nextTime >= duration) {
            nextTime = duration;
            nextDir = -1;
            setPlayDirection(-1);
          } else if (nextDir === -1 && nextTime <= 0) {
            nextTime = 0;
            nextDir = 1;
            setPlayDirection(1);
          }
        }
      }

      if (!isPlaying) {
        setPlaying(false);
        return nextTime;
      }

      // Apply interpolation
      const frame = getFrameAtTime(keyframes, Math.max(0, Math.min(nextTime, duration)));
      if (frame) {
        setBodyPose(frame.body);
        setLegsPos(frame.legs);
        const newAngles = spider.applyPose(frame.body, frame.legs);
        setAngles(newAngles);
      }
      return nextTime;
    });

    if (playing) reqRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (playing) {
      lastTickRef.current = performance.now();
      reqRef.current = requestAnimationFrame(tick);
    } else {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [playing, playMode, speed, duration, playDirection]); // Dependencies that affect loop start

  const autoSaveKf = (newBody, newLegs) => {
    if (selectedKfIdx >= 0 && !playing) {
      setKeyframes(prev => {
        const next = [...prev];
        next[selectedKfIdx] = {
          ...next[selectedKfIdx],
          body: newBody || { ...bodyPose },
          legs: newLegs ? newLegs.map(l => [...l]) : legsPos.map(l => [...l]),
          angles: [...angles]
        };
        return next;
      });
    }
  };

  const handleBodyChange = (key, val) => {
    let numVal = parseFloat(val);
    if (isNaN(numVal)) numVal = 0;
    setBodyPose(prev => {
      const nextBody = { ...prev, [key]: numVal };
      autoSaveKf(nextBody, null);
      return nextBody;
    });
  };

  useEffect(() => {
    const urdfUrl = `${import.meta.env.BASE_URL}urdf/${import.meta.env.VITE_URDF_NAME || 'sophia_v1.urdf'}`;
    fetch(urdfUrl)
      .then(res => res.text())
      .then(xml => {
        const config = parseUrdf(xml);
        const newSpider = new Spider(config);
        setSpider(newSpider);
        setHomeLegs(newSpider.home_positions);
        setLegsPos(newSpider.home_positions.map(l => [...l]));
        setAngles(newSpider.getJointAngles());
        setHomeAngles(newSpider.getJointAngles());
      })
      .catch(err => console.error("Failed to load URDF for kinematics:", err));
  }, []);

  const handleHomePose = () => {
    angleOverridesRef.current = {};
    const homeBody = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };
    setBodyPose(homeBody);
    setLegsPos(homeLegs.map(l => [...l]));
    
    // Reset internal IK state to home angles to prevent inverted knee logic
    if (spider && homeAngles && homeAngles.length === 18) {
      for (let i = 0; i < 6; i++) {
        spider.legs[i].ths = [homeAngles[i*3], homeAngles[i*3+1], homeAngles[i*3+2]];
      }
    }
    
    autoSaveKf(homeBody, homeLegs);
  };

  useEffect(() => {
    // This effect handles the initial home pose call. 
    // We can't call it inside the first useEffect because homeLegs might not be updated yet.
    if (homeLegs) handleHomePose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLegs]);

  const handleLegChange = (axisIdx, val) => {
    delete angleOverridesRef.current[selectedLeg];
    let numVal = parseFloat(val);
    if (isNaN(numVal)) numVal = 0;
    setLegsPos(prev => {
      const next = [...prev];
      next[selectedLeg] = [...next[selectedLeg]];
      next[selectedLeg][axisIdx] = numVal;
      autoSaveKf(null, next);
      return next;
    });
  };

  const handleLegReset = (axisIdx) => {
    delete angleOverridesRef.current[selectedLeg];
    setLegsPos(prev => {
      const next = [...prev];
      next[selectedLeg] = [...next[selectedLeg]];
      next[selectedLeg][axisIdx] = homeLegs[selectedLeg][axisIdx];
      autoSaveKf(null, next);
      return next;
    });
  };

  const handlePlantZ = () => {
    const targetZ = homeLegs[selectedLeg][2];
    const nextLegsPos = legsPos.map(l => [...l]);
    nextLegsPos[selectedLeg][2] = targetZ;

    // Simulate IK by temporarily applying the pose
    const testAngles = spider.applyPose(bodyPose, nextLegsPos);
    
    // Check if the resulting angles exceed Sidebar limits
    const coxaDeg = testAngles[selectedLeg * 3] * 180 / Math.PI;
    const femurDeg = testAngles[selectedLeg * 3 + 1] * 180 / Math.PI;
    const tibiaDeg = testAngles[selectedLeg * 3 + 2] * 180 / Math.PI;

    if (
      coxaDeg < -60 || coxaDeg > 60 ||
      femurDeg < -110 || femurDeg > 95 ||
      tibiaDeg < -120 || tibiaDeg > 160
    ) {
      alert("The final position is beyond the reach of the robot's legs.");
      spider.applyPose(bodyPose, legsPos); // Restore original
      return;
    }

    // Verify if it actually reached the floor (wasn't mathematically clamped by reach)
    const pos_cf = spider.legs[selectedLeg].getLocalPos(spider.T_sb);
    const [x, y, z] = pos_cf;
    const r = Math.sqrt(x * x + y * y);
    const l_left = r - spider.legs[selectedLeg].hip_length;
    const hf = Math.sqrt(l_left * l_left + z * z);
    const max_reach = spider.legs[selectedLeg].femur_length + spider.legs[selectedLeg].tibia_length;
    
    if (hf > max_reach) {
      alert("The leg cannot reach the ground from this body pose (due to excessive distance or height).");
      spider.applyPose(bodyPose, legsPos); // Restore original
      return;
    }

    // Safe to proceed
    delete angleOverridesRef.current[selectedLeg];
    setLegsPos(nextLegsPos);
    autoSaveKf(null, nextLegsPos);
  };

  const handleLegAngleChange = (angleIdx, degVal) => {
    let numVal = parseFloat(degVal);
    if (isNaN(numVal)) numVal = 0;
    const radVal = (numVal * Math.PI) / 180.0;
    const currentAnglesRad = [
      angles[selectedLeg * 3],
      angles[selectedLeg * 3 + 1],
      angles[selectedLeg * 3 + 2]
    ];
    currentAnglesRad[angleIdx] = radVal;

    // Store the manual angle override so IK doesn't overwrite it immediately
    angleOverridesRef.current[selectedLeg] = [...currentAnglesRad];

    // Convert back to cartesian leg position
    const newPos = spider.calcLegPosFromAngles(selectedLeg, currentAnglesRad);
    setLegsPos(prev => {
      const next = [...prev];
      next[selectedLeg] = newPos;
      autoSaveKf(null, next);
      return next;
    });
  };

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      if (keyframes.length >= 2) {
        if (playTime >= duration) setPlayTime(0);
        setPlayDirection(1);
        setPlaying(true);
      }
    }
  };

  const handleStop = () => {
    setPlaying(false);
    setPlayTime(0);
    if (keyframes.length > 0) {
      angleOverridesRef.current = {};
      const kf = keyframes[0];
      setBodyPose({ ...kf.body });
      if (kf.legs) {
        setLegsPos(kf.legs.map(l => [...l]));
      }
      if (kf.angles) {
        setAngles([...kf.angles]);
      }
    }
  };

  const handleSeek = (t) => {
    setPlayTime(t);
    const frame = getFrameAtTime(keyframes, t);
    if (frame) {
      setBodyPose(frame.body);
      setLegsPos(frame.legs);
    }
  };

  const handleAddKf = () => {
    const newKf = {
      body: { ...bodyPose },
      legs: legsPos.map(l => [...l]),
      angles: [...angles],
      duration: 1.0,
      easing: 'ease-in-out',
      arc_height: 0
    };
    setKeyframes(prev => [...prev, newKf]);
  };

  const handleUpdateKf = (idx) => {
    if (idx >= 0 && idx < keyframes.length) {
      setKeyframes(prev => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          body: { ...bodyPose },
          legs: legsPos.map(l => [...l]),
          angles: [...angles]
        };
        return next;
      });
    }
  };

  const handleDeleteKf = (idx) => {
    if (idx >= 0 && idx < keyframes.length) {
      setKeyframes(prev => prev.filter((_, i) => i !== idx));
      if (selectedKfIdx === idx) setSelectedKfIdx(-1);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure to clear all keyframes?")) {
      setKeyframes([]);
      setSelectedKfIdx(-1);
    }
  };

  const handleReorder = (from, to) => {
    setKeyframes(prev => {
      const next = [...prev];
      const item = next.splice(from, 1)[0];
      next.splice(to, 0, item);
      return next;
    });
    if (selectedKfIdx === from) setSelectedKfIdx(to);
  };

  const handleSelectKf = (idx) => {
    if (selectedKfIdx === idx) {
      setSelectedKfIdx(-1);
      return;
    }
    setSelectedKfIdx(idx);
    const kf = keyframes[idx];
    if (kf) {
      angleOverridesRef.current = {};
      setBodyPose({ ...kf.body });
      if (kf.legs) setLegsPos(kf.legs.map(l => [...l]));
      if (kf.angles) setAngles([...kf.angles]);
      // seek visually
      let acc = 0;
      for (let i = 1; i <= idx; i++) acc += keyframes[i].duration;
      setPlayTime(acc);
    }
  };

  const handleKfPropChange = (idx, prop, val) => {
    setKeyframes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [prop]: val };
      return next;
    });
  };

  const handleExport = () => {
    // Convert keyframes to angle-only format for export
    const exportKeyframes = keyframes.map(kf => {
      const { legs, ...rest } = kf;
      return rest;
    });

    const data = {
      version: 1,
      keyframes: exportKeyframes,
      metadata: { date: new Date().toISOString(), total_duration: duration }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animation_${Date.now()}.json`;
    a.click();
  };

  const loadAttackAnimation = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}animations/attack.json`);
      if (!response.ok) throw new Error("File not found");
      const data = await response.json();
      if (data.keyframes) {
        // Reconstruct cartesian legs from angles
        const kfs = data.keyframes.map(kf => {
          if (kf.angles && !kf.legs) {
            const reconstructedLegs = [];
            const b = kf.body;
            spider.updateBodyPos(b.x, b.y, b.z, b.roll, b.pitch, b.yaw);
            for (let i = 0; i < 6; i++) {
              const legAngles = [kf.angles[i * 3], kf.angles[i * 3 + 1], kf.angles[i * 3 + 2]];
              reconstructedLegs.push(spider.calcLegPosFromAngles(i, legAngles));
            }
            return { ...kf, legs: reconstructedLegs };
          }
          return kf; // Fallback if old format
        });
        setKeyframes(kfs);
        setSelectedKfIdx(-1);
        setPlaying(true);
        setPlayTime(0);
      }
    } catch (err) {
      console.error("Failed to load attack animation", err);
      alert("Could not load animations/attack.json. Please ensure the file exists in the public folder.");
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let kfs = data.keyframes || data;
        
        // Reconstruct cartesian legs from angles
        kfs = kfs.map(kf => {
          if (kf.angles && !kf.legs) {
            const reconstructedLegs = [];
            const b = kf.body;
            spider.updateBodyPos(b.x, b.y, b.z, b.roll, b.pitch, b.yaw);
            for (let i = 0; i < 6; i++) {
              const legAngles = [kf.angles[i * 3], kf.angles[i * 3 + 1], kf.angles[i * 3 + 2]];
              reconstructedLegs.push(spider.calcLegPosFromAngles(i, legAngles));
            }
            return { ...kf, legs: reconstructedLegs };
          }
          return kf; // Fallback if old format
        });

        setKeyframes(kfs);
        if (kfs.length > 0) {
          setBodyPose({ ...kfs[0].body });
          if (kfs[0].legs) setLegsPos(kfs[0].legs.map(l => [...l]));
          if (kfs[0].angles) setAngles([...kfs[0].angles]);
        }
        setSelectedKfIdx(-1);
        setPlayTime(0);
      } catch (err) {
        alert("Invalid JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="app-container">
      <TopMenu
        playing={playing} onPlayPause={handlePlayPause} onStop={handleStop}
        playMode={playMode} setPlayMode={setPlayMode}
        speed={speed} setSpeed={setSpeed}
        onExport={handleExport}
        onImportClick={() => document.getElementById('file-import').click()}
      />
      <input type="file" id="file-import" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />

      <div className="main-layout">
        <Sidebar
          bodyPose={bodyPose} handleBodyChange={handleBodyChange} handleHomePose={handleHomePose}
          legsPos={legsPos} handleLegChange={handleLegChange} handleLegReset={handleLegReset} handlePlantZ={handlePlantZ}
          angles={angles} handleLegAngleChange={handleLegAngleChange} homeAngles={homeAngles}
          homeLegs={homeLegs}
          selectedLeg={selectedLeg} setSelectedLeg={setSelectedLeg}
          selectedKfIdx={selectedKfIdx} keyframes={keyframes}
          playing={playing}
          onDeleteKf={handleDeleteKf}
          onKfPropChange={handleKfPropChange}
          onReorderKf={handleReorder}
        />

        <div className="panel-center">
          <div className="canvas-container">
            <Canvas camera={{ position: [-0.3, 0.2, -0.3], fov: 50 }}>
              <color attach="background" args={['#0d0d12']} />
              <ambientLight intensity={0.7} />
              <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
              <pointLight position={[0, 2, 0]} intensity={0.5} />

              <Grid position={[0, -0.0628, 0]} infiniteGrid fadeDistance={5} sectionColor="#ffffff" cellColor="#666" sectionThickness={1} opacity={0.2} />
              
              <ContactShadows 
                position={[0, -0.0627, 0]} 
                opacity={0.5} 
                scale={1} 
                blur={2} 
                far={0.5} 
                color="#000000" 
              />

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.063, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial color="#30303a" roughness={0.5} metalness={0.2} />
              </mesh>
              <axesHelper position={[0, -0.0627, 0]} args={[0.5]} />
              <OrbitControls makeDefault target={[0, 0, 0]} />

              <Suspense fallback={null}>
                <HexapodModel url={`${import.meta.env.BASE_URL}urdf/${import.meta.env.VITE_URDF_NAME || 'sophia_v1.urdf'}`} angles={angles} bodyPose={bodyPose} />
              </Suspense>
            </Canvas>
            
            <button className="attack-btn" onClick={loadAttackAnimation}>
              Attack
            </button>
          </div>

          <Timeline
            keyframes={keyframes}
            totalDuration={duration}
            playTime={playTime}
            selectedKfIdx={selectedKfIdx}
            onSelectKf={handleSelectKf}
            onAddKf={handleAddKf}
            onDeleteAll={handleClearAll}
            onSeek={handleSeek}
            onReorder={handleReorder}
          />
        </div>
      </div>
    </div>
  )
}

export default App
