import React from 'react';

export default function TopMenu({ 
  playing, onPlayPause, onStop, playMode, setPlayMode, speed, setSpeed, 
  onExport, onImportClick 
}) {
  return (
    <header className="top-menu">

      <div className="header-actions">
        <button className="btn" onClick={onImportClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </button>
        <button className="btn" onClick={onExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      <div className="playback-controls">
        <button className="btn-icon" onClick={onStop} title="Stop">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </button>
        <button 
          className={`btn-icon ${playing ? 'active' : ''}`}
          onClick={onPlayPause} 
          title={playing ? "Pause" : "Play"}
        >
          {playing ? 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
        </button>
        <select 
          className="select-modern" 
          value={playMode} 
          onChange={e => setPlayMode(e.target.value)}
        >
          <option value="once">Once</option>
          <option value="loop">Loop</option>
          <option value="pingpong">Ping-Pong</option>
        </select>
        <select 
          className="select-modern" 
          value={speed} 
          onChange={e => setSpeed(parseFloat(e.target.value))}
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </header>
  );
}
