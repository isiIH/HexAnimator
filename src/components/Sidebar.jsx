import React, { useEffect, useRef, useState } from 'react';

export default function Sidebar({
  bodyPose, handleBodyChange, handleHomePose,
  legsPos, handleLegChange, handleLegReset, handlePlantZ,
  angles, handleLegAngleChange, homeAngles,
  homeLegs,
  selectedLeg, setSelectedLeg,
  selectedKfIdx,
  keyframes,
  playing,
  onDeleteKf, onKfPropChange, onReorderKf
}) {
  const [activeTab, setActiveTab] = useState('body'); // 'body', 'leg', 'kf'
  const [openSections, setOpenSections] = useState({ body: true, leg: true, kf: true });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (s) => {
    if (isMobile) return;
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));
  };

  const BODY_PARAMS = [
    { key: 'x', label: 'X', min: -0.05, max: 0.05, step: 0.001 },
    { key: 'y', label: 'Y', min: -0.05, max: 0.05, step: 0.001 },
    { key: 'z', label: 'Z', min: -0.06, max: 0.06, step: 0.001 },
    { key: 'roll', label: 'Roll', min: -0.5, max: 0.5, step: 0.01 },
    { key: 'pitch', label: 'Pitch', min: -0.5, max: 0.5, step: 0.01 },
    { key: 'yaw', label: 'Yaw', min: -0.5, max: 0.5, step: 0.01 },
  ];

  const LEG_CART_PARAMS = [
    { key: 0, label: 'X', min: 0.02, max: 0.15, step: 0.001 },
    { key: 1, label: 'Y', min: -0.06, max: 0.06, step: 0.001 },
    { key: 2, label: 'Z', min: -0.1, max: 0.02, step: 0.001 },
  ];

  const LEG_ANGLE_PARAMS = [
    { key: 0, label: 'Coxa', min: -57, max: 57, step: 1 },
    { key: 1, label: 'Femur', min: -106, max: 90, step: 1 },
    { key: 2, label: 'Tibia', min: -114, max: 157, step: 1 },
  ];

  const legNames = ['RF', 'RM', 'RB', 'LF', 'LM', 'LB'];

  const handleMove = (dir) => {
    const newIdx = selectedKfIdx + dir;
    if (newIdx >= 0 && newIdx < keyframes.length) {
      onReorderKf(selectedKfIdx, newIdx);
    }
  };

  // Preview Canvas Ref
  const canvasRef = useRef(null);

  // Draw arc curve based on current keyframe
  useEffect(() => {
    if (selectedKfIdx >= 0 && keyframes[selectedKfIdx] && canvasRef.current) {
      const kf = keyframes[selectedKfIdx];
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const pad = 8;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = pad + (i / 4) * (w - 2 * pad);
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
        const y = pad + (i / 4) * (h - 2 * pad);
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
      }

      const easing = kf.easing || 'ease-in-out';
      const arcHeight = kf.arc_height || 0;

      const easeFn = {
        linear: t => t,
        'ease-in': t => t ** 3,
        'ease-out': t => 1 - (1 - t) ** 3,
        'ease-in-out': t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
      }[easing] || (t => t);

      const steps = 60;

      // Easing curve (dashed, dim)
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(108,92,231,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const et = easeFn(t);
        const px = pad + t * (w - 2 * pad);
        const py = h - pad - et * (h - 2 * pad);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arc trajectory curve (solid, bright)
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const maxArc = 0.12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const et = easeFn(t);
        const arcZ = 4 * arcHeight * et * (1 - et);
        const px = pad + t * (w - 2 * pad);
        const py = h - pad - (arcZ / maxArc) * (h - 2 * pad);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }, [selectedKfIdx, keyframes, activeTab]);

  return (
    <div className={`panel-left glass-panel} ${activeTab === 'kf' ? 'kf-compact' : ''}`}>

      {/* Mobile Tab Selector */}
      {isMobile && (
        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            Body
          </button>
          <button
            className={`tab-btn ${activeTab === 'leg' ? 'active' : ''}`}
            onClick={() => setActiveTab('leg')}
          >
            Legs
          </button>
          <button
            className={`tab-btn ${activeTab === 'kf' ? 'active' : ''}`}
            onClick={() => setActiveTab('kf')}
          >
            Keyframe
          </button>
        </div>
      )}

      <>
          <div className={`panel-section ${activeTab !== 'body' ? 'mobile-hidden' : ''}`}>
            <div
              className="panel-header"
              onClick={() => toggleSection('body')}
              style={{ cursor: isMobile ? 'default' : 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isMobile && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSections.body ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
                <span>Body Pose</span>
              </div>
              <button className="btn-home" onClick={(e) => { e.stopPropagation(); handleHomePose(); }} title="Go to Standing Pose (Home)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </button>
            </div>
            {(openSections.body || isMobile) && (
              <div className="panel-content">
                {BODY_PARAMS.map(p => (
                  <div className="slider-row" key={p.key}>
                    <span className="slider-label">{p.label}</span>
                    <div className="slider-wrapper">
                      <input
                        type="range" className="slider-input"
                        min={p.min} max={p.max} step={p.step}
                        value={bodyPose[p.key]}
                        onChange={(e) => handleBodyChange(p.key, e.target.value)}
                        disabled={playing}
                      />
                    </div>
                    <input
                      type="text" className="slider-value"
                      value={bodyPose[p.key].toFixed(3)}
                      onChange={(e) => handleBodyChange(p.key, e.target.value)}
                      disabled={playing}
                    />
                    <button className="slider-reset" onClick={() => handleBodyChange(p.key, 0)} disabled={playing}>↺</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`panel-section ${activeTab !== 'leg' ? 'mobile-hidden' : ''}`}>
            <div
              className="panel-header"
              onClick={() => toggleSection('leg')}
              style={{ cursor: isMobile ? 'default' : 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isMobile && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSections.leg ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
                <span>Leg Control</span>
              </div>
            </div>
            {(openSections.leg || isMobile) && (
              <div className="panel-content">
                <div className="leg-selector">
                  {legNames.map((name, i) => (
                    <button
                      key={i}
                      className={`leg-btn ${selectedLeg === i ? 'active' : ''}`}
                      onClick={() => setSelectedLeg(i)}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {LEG_ANGLE_PARAMS.map(p => {
                  const currentAngleRad = angles ? angles[selectedLeg * 3 + p.key] : 0;
                  const currentAngleDeg = (currentAngleRad * 180 / Math.PI) || 0;
                  const homeAngleRad = homeAngles ? homeAngles[selectedLeg * 3 + p.key] : 0;
                  const homeAngleDeg = (homeAngleRad * 180 / Math.PI) || 0;
                  return (
                    <div className="slider-row" key={p.key}>
                      <span className="slider-label">{p.label}</span>
                      <div className="slider-wrapper">
                        <input
                          type="range" className="slider-input"
                          min={p.min} max={p.max} step={p.step}
                          value={currentAngleDeg}
                          onChange={(e) => handleLegAngleChange(p.key, e.target.value)}
                          disabled={playing}
                        />
                      </div>
                      <input
                        type="text" className="slider-value"
                        value={currentAngleDeg.toFixed(1)}
                        onChange={(e) => handleLegAngleChange(p.key, e.target.value)}
                        disabled={playing}
                      />
                      <button className="slider-reset" onClick={() => handleLegAngleChange(p.key, homeAngleDeg)} title="Reset to Home" disabled={playing}>↺</button>
                    </div>
                  );
                })}

                <div style={{ marginTop: '16px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="leg-cart-info">
                    {LEG_CART_PARAMS.map(p => (
                      <div key={p.key} className="cart-info-box">
                        <span className="cart-info-label">{p.label}</span>
                        <div className="cart-info-value-row">
                          <span className="cart-info-value">
                            {(legsPos[selectedLeg]?.[p.key] || 0).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="text-btn-plant" onClick={handlePlantZ} disabled={playing}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                    Plant Leg on Ground (Z)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`panel-section ${activeTab !== 'kf' ? 'mobile-hidden' : ''}`} style={{ borderBottom: 'none' }}>
            <div
              className="panel-header"
              onClick={() => toggleSection('kf')}
              style={{ cursor: isMobile ? 'default' : 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isMobile && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSections.kf ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
                <span>Keyframe Properties</span>
              </div>
            </div>
            {(openSections.kf || isMobile) && (
              <div className="panel-content">
                {selectedKfIdx < 0 ? (
                  <div className="kf-empty-state" style={{ padding: '20px 10px', fontSize: 11 }}>
                    No keyframe selected.<br />
                    Click a marker on the timeline.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="kf-selector-container">
                        <button className="kf-move-btn" onClick={(e) => { e.stopPropagation(); handleMove(-1); }} disabled={selectedKfIdx <= 0} title="Move Left">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <span className="kf-badge-id">KF #{selectedKfIdx}</span>
                        <button className="kf-move-btn" onClick={(e) => { e.stopPropagation(); handleMove(1); }} disabled={selectedKfIdx >= keyframes.length - 1} title="Move Right">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      </div>
                      <button className="btn-icon" style={{ color: 'var(--danger)', width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); onDeleteKf(selectedKfIdx); }} title="Delete Keyframe">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>

                    <div className="kf-form-group">
                      <label className="kf-detail-label">Duration (s)</label>
                      <input
                        type="number" className="duration-input"
                        min="0.05" step="0.05"
                        value={keyframes[selectedKfIdx]?.duration ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onKfPropChange(selectedKfIdx, 'duration', val === '' ? 0.0 : parseFloat(val));
                        }}
                      />
                    </div>

                    <div className="kf-form-group">
                      <label className="kf-detail-label">Easing</label>
                      <div className="easing-buttons">
                        {['linear', 'ease-in', 'ease-out', 'ease-in-out'].map(ease => (
                          <button
                            key={ease}
                            className={`easing-btn ${keyframes[selectedKfIdx]?.easing === ease ? 'active' : ''}`}
                            onClick={() => onKfPropChange(selectedKfIdx, 'easing', ease)}
                          >
                            {ease === 'linear' ? 'Linear' : ease === 'ease-in-out' ? 'In-Out' : ease.replace('ease-', 'Ease ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="kf-form-group">
                      <label className="kf-detail-label">Leg Arc Height (m)</label>
                      <div className="kf-control-row">
                        <div className="slider-wrapper" style={{ flex: 1 }}>
                          <input
                            type="range" className="slider-input" style={{ width: '100%' }}
                            min="0" max="0.12" step="0.005"
                            value={keyframes[selectedKfIdx]?.arc_height || 0}
                            onChange={(e) => onKfPropChange(selectedKfIdx, 'arc_height', parseFloat(e.target.value))}
                          />
                        </div>
                        <span className="arc-val-badge">
                          {(keyframes[selectedKfIdx]?.arc_height || 0).toFixed(3)}
                        </span>
                      </div>
                    </div>

                    <div className="kf-form-group">
                      <label className="kf-detail-label">Curve Preview</label>
                      <canvas ref={canvasRef} className="curve-canvas" width="280" height="80" style={{ width: '100%', borderRadius: 4 }}></canvas>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </>
    </div>
  );
}
