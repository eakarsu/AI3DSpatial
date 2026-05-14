import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AI_API = 'http://localhost:3001/api/ai';

const ADVISORS = [
  {
    key: 'performance-profile',
    title: 'Performance Profiler',
    description: 'Identify FPS, draw call, GPU/CPU bottlenecks for any 3D scene.',
    color: '#22c55e',
    fields: [
      { key: 'scene_description', label: 'Scene description', type: 'textarea', required: true },
      { key: 'target_platform', label: 'Target platform', placeholder: 'mobile / vr / web' },
      { key: 'current_fps', label: 'Current FPS', type: 'number' },
      { key: 'draw_calls', label: 'Draw calls', type: 'number' },
      { key: 'polygon_count', label: 'Polygon count', type: 'number' },
    ],
    resultKey: 'profile',
  },
  {
    key: 'physics-simulation',
    title: 'Physics Simulation Plan',
    description: 'Design rigid bodies, constraints, and collision groups for a scene.',
    color: '#f59e0b',
    fields: [
      { key: 'scene_description', label: 'Scene description', type: 'textarea', required: true },
      { key: 'simulation_type', label: 'Simulation type', placeholder: 'rigid body / soft body / cloth' },
      { key: 'target_engine', label: 'Target engine', placeholder: 'cannon-es / rapier / havok' },
    ],
    resultKey: 'simulation_plan',
  },
  {
    key: 'lighting-simulation',
    title: 'Lighting Designer',
    description: 'Plan lighting, global illumination, and post-processing for a scene.',
    color: '#eab308',
    fields: [
      { key: 'scene_description', label: 'Scene description', type: 'textarea', required: true },
      { key: 'time_of_day', label: 'Time of day', placeholder: 'noon / dusk / night' },
      { key: 'mood', label: 'Mood', placeholder: 'natural / dramatic / cozy' },
      { key: 'target_engine', label: 'Target engine', placeholder: 'three.js / unity / unreal' },
    ],
    resultKey: 'lighting_plan',
  },
  {
    key: 'neural-compression',
    title: 'Neural Compression',
    description: 'Recommend a learned compression strategy for 3D assets.',
    color: '#06b6d4',
    fields: [
      { key: 'asset_description', label: 'Asset description', type: 'textarea', required: true },
      { key: 'asset_type', label: 'Asset type', placeholder: 'mesh / point cloud / texture' },
      { key: 'current_size_mb', label: 'Current size MB', type: 'number' },
      { key: 'target_size_mb', label: 'Target size MB', type: 'number' },
    ],
    resultKey: 'compression_plan',
  },
  {
    key: 'collaboration-plan',
    title: 'Collaboration / Multiplayer Plan',
    description: 'Architect real-time multi-user 3D collab with sync and presence.',
    color: '#8b5cf6',
    fields: [
      { key: 'scene_description', label: 'Scene description', type: 'textarea', required: true },
      { key: 'expected_users', label: 'Expected concurrent users', type: 'number' },
      { key: 'sync_priorities', label: 'Sync priorities', placeholder: 'transform + presence + voice' },
    ],
    resultKey: 'collaboration_plan',
  },
];

function getToken() {
  return localStorage.getItem('token');
}

export default function AdvisorPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState(ADVISORS[0].key);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const advisor = ADVISORS.find(a => a.key === activeKey);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const body = {};
      for (const f of advisor.fields) {
        if (formData[f.key] !== undefined && formData[f.key] !== '') body[f.key] = formData[f.key];
      }
      const res = await fetch(`${AI_API}/${advisor.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 503) {
        setError(`AI service not configured (missing ${data.missing || 'OPENROUTER_API_KEY'})`);
      } else if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setResult(data[advisor.resultKey] || data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="topbar">
        <div className="topbar-brand">
          <span className="brand-icon">AI3D</span>
          <h2>AI 3D/Spatial — Advisors</h2>
        </div>
        <div className="topbar-right">
          <button onClick={() => navigate('/')} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 13, cursor: 'pointer', marginRight: 8 }}>← Back</button>
          <div className="user-badge">
            <div className="user-avatar">{user?.name?.[0] || 'U'}</div>
            {user?.name || user?.email}
          </div>
          <button onClick={onLogout} className="btn-logout">Sign Out</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>AI Advisors</h1>
          <p>Performance, physics, lighting, compression, and multiplayer planning</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          {ADVISORS.map(a => (
            <button key={a.key} onClick={() => { setActiveKey(a.key); setFormData({}); setResult(null); setError(null); }}
              style={{
                background: activeKey === a.key ? `${a.color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeKey === a.key ? a.color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: 14, color: '#e0e0f0', cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{ fontWeight: 600, color: a.color, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#9090b0' }}>{a.description}</div>
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: advisor.color, marginBottom: 16 }}>{advisor.title}</h3>
          <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
            {advisor.fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 12, color: '#9090b0', marginBottom: 4 }}>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                {f.type === 'textarea' ? (
                  <textarea value={formData[f.key] || ''} onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    placeholder={f.placeholder} required={f.required} rows={3}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 8, color: '#e0e0f0', fontFamily: 'inherit' }} />
                ) : (
                  <input type={f.type || 'text'} value={formData[f.key] || ''} onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    placeholder={f.placeholder} required={f.required}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 8, color: '#e0e0f0' }} />
                )}
              </div>
            ))}
            <button type="submit" disabled={loading}
              style={{ background: advisor.color, color: '#0a0a14', border: 'none', borderRadius: 6, padding: '10px 16px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
              {loading ? 'Generating...' : 'Generate plan'}
            </button>
          </form>

          {error && <div style={{ marginTop: 16, padding: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#fca5a5' }}>{error}</div>}
          {result && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ color: '#a5b4fc', marginBottom: 12 }}>Result</h4>
              <pre style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 14, color: '#a5b4fc', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
