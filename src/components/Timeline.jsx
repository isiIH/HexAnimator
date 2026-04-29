import React from 'react';

export default function Timeline({ 
  keyframes, totalDuration, playTime, 
  selectedKfIdx, onSelectKf, onAddKf, onDeleteAll, onSeek, onReorder 
}) {
  const handleTrackClick = (e) => {
    if (e.target.closest('.kf-marker') || e.target.closest('.kf-label')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, pct * totalDuration));
  };

  const handleArrowClick = (e, from, to) => {
    e.stopPropagation();
    if (to >= 0 && to < keyframes.length) {
      onReorder(from, to);
    }
  };

  // Generate ticks
  const ticks = [];
  const tickInterval = totalDuration > 5 ? 1.0 : totalDuration > 2 ? 0.5 : 0.25;
  for (let t = 0; t <= totalDuration + 0.01; t += tickInterval) {
    const pct = totalDuration > 0 ? (t / totalDuration) * 100 : 0;
    ticks.push(
      <span key={t} className="timeline-ruler-tick" style={{ left: `${pct}%` }}>
        {t.toFixed(1)}s
      </span>
    );
  }

  // Generate markers
  const markers = [];
  let accumulated = 0;
  keyframes.forEach((kf, i) => {
    if (i > 0) accumulated += kf.duration;
    const pct = totalDuration > 0 ? (accumulated / totalDuration) * 100 : 
               (i / Math.max(keyframes.length - 1, 1)) * 100;

    markers.push(
      <div key={`marker-${i}`}>
        <div 
          className={`kf-marker ${i === selectedKfIdx ? 'selected' : ''}`}
          style={{ left: `${pct}%` }}
          title={`KF ${i} — ${accumulated.toFixed(2)}s`}
          onClick={(e) => { e.stopPropagation(); onSelectKf(i); }}
        />
        <span className="kf-label" style={{ left: `${pct}%` }}>
          <span className="kf-label-num">{i}</span>
        </span>
      </div>
    );
  });

  const playheadPct = totalDuration > 0 ? (playTime / totalDuration) * 100 : 0;

  return (
    <div className="timeline-container glass-panel">
      <div className="timeline-toolbar">
        <div className="timeline-toolbar-left">
          <button className="btn" onClick={onAddKf}>+ Keyframe</button>
          <button className="btn btn-danger" onClick={onDeleteAll}>🗑 Delete All</button>
        </div>
        <div className="timeline-toolbar-right">
          <span className="timeline-info">
            {playTime.toFixed(3)}s / {totalDuration.toFixed(3)}s
          </span>
        </div>
      </div>
      <div className="timeline-track-wrapper">
        <div className="timeline-track" onClick={handleTrackClick}>
          <div className="timeline-ruler">{ticks}</div>
          {markers}
          <div className="timeline-playhead" style={{ left: `${playheadPct}%` }} />
        </div>
      </div>
    </div>
  );
}
