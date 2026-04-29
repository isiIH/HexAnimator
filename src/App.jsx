import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import HexapodModel from './scene/HexapodModel'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import TopMenu from './components/TopMenu'
import { Spider } from './kinematics/Spider'
import { getFrameAtTime, totalDuration } from './kinematics/AnimationEngine'
import './index.css'

function App() {
  const spider = useMemo(() => new Spider(), []);
  
  const [angles, setAngles] = useState(spider.getJointAngles());
  const [bodyPose, setBodyPose] = useState({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 });
  const [legsPos, setLegsPos] = useState(spider.getLegPositions());
  const homeLegs = useMemo(() => spider.home_positions, [spider]);
  
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
      let nextTime = prev + (dt * speed * playDirection);
      let nextDir = playDirection;
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
          legs: newLegs ? newLegs.map(l => [...l]) : legsPos.map(l => [...l]) 
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

  const handleHomePose = () => {
    angleOverridesRef.current = {};
    const homeBody = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };
    setBodyPose(homeBody);
    setLegsPos(homeLegs.map(l => [...l]));
    autoSaveKf(homeBody, homeLegs);
  };

  useEffect(() => {
    handleHomePose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setLegsPos(kf.legs.map(l => [...l]));
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
          legs: legsPos.map(l => [...l])
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
    if (window.confirm("Delete all keyframes?")) {
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
    setSelectedKfIdx(idx);
    const kf = keyframes[idx];
    if (kf) {
      angleOverridesRef.current = {};
      setBodyPose({ ...kf.body });
      setLegsPos(kf.legs.map(l => [...l]));
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
    const data = {
      version: 1,
      keyframes,
      metadata: { date: new Date().toISOString(), total_duration: duration }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animation_${Date.now()}.json`;
    a.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const kfs = data.keyframes || data;
        setKeyframes(kfs);
        if (kfs.length > 0) {
          setBodyPose({ ...kfs[0].body });
          setLegsPos(kfs[0].legs.map(l => [...l]));
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
      <input type="file" id="file-import" accept=".json" style={{display: 'none'}} onChange={handleImportFile} />

      <div className="main-layout">
        <Sidebar 
          bodyPose={bodyPose} handleBodyChange={handleBodyChange} handleHomePose={handleHomePose}
          legsPos={legsPos} handleLegChange={handleLegChange} handleLegReset={handleLegReset}
          angles={angles} handleLegAngleChange={handleLegAngleChange}
          homeLegs={homeLegs}
          selectedLeg={selectedLeg} setSelectedLeg={setSelectedLeg}
          selectedKfIdx={selectedKfIdx} keyframes={keyframes}
          onDeleteKf={handleDeleteKf}
          onKfPropChange={handleKfPropChange}
        />
        
        <div className="panel-center">
          <div className="canvas-container">
            <Canvas camera={{ position: [-0.6, 0.5, -0.6], fov: 50 }}>
              <color attach="background" args={['#0a0a0f']} />
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
              
              <Grid position={[0, -0.0627, 0]} infiniteGrid fadeDistance={2} sectionColor="#333" cellColor="#111" />
              <axesHelper position={[0, -0.0627, 0]} args={[0.5]} />
              <OrbitControls makeDefault target={[0, 0, 0]} />
              
              <Suspense fallback={null}>
                <HexapodModel url={`${import.meta.env.BASE_URL}urdf/sophia.urdf`} angles={angles} bodyPose={bodyPose} />
              </Suspense>
            </Canvas>
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
