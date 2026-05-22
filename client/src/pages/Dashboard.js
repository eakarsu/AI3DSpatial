import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURES } from '../config/features';

const API = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [aiUsage, setAiUsage] = useState(null);
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    FEATURES.forEach(f => {
      fetch(`${API}${f.endpoint}?limit=1`, { headers })
        .then(r => {
          if (r.status === 401) { onLogout(); return null; }
          return r.json();
        })
        .then(data => {
          if (!data) return;
          const count = data.pagination ? data.pagination.total : (Array.isArray(data) ? data.length : 0);
          setCounts(prev => ({ ...prev, [f.key]: count }));
        })
        .catch(() => {});
    });

    // Load AI usage stats
    fetch(`${API}/ai/usage`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.success) setAiUsage(data); })
      .catch(() => {});
  }, [onLogout]);

  return (
    <div className="dashboard">
      <div className="topbar">
        <div className="topbar-brand">
          <span className="brand-icon">AI3D</span>
          <h2>AI 3D/Spatial</h2>
        </div>
        <div className="topbar-right">
          <button
            onClick={() => navigate('/advisors')}
            style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac', fontSize: 13, cursor: 'pointer', marginRight: 8 }}
          >
            AI Advisors
          </button>
          <button
            onClick={() => navigate('/gap/ai-image-object-detection')}
            style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(14,165,233,0.18)', border: '1px solid rgba(14,165,233,0.35)', color: '#7dd3fc', fontSize: 13, cursor: 'pointer', marginRight: 8 }}
          >
            Object Detection
          </button>
          <button
            onClick={() => setShowUsage(!showUsage)}
            style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 13, cursor: 'pointer', marginRight: 8 }}
          >
            AI Usage
          </button>
          <div className="user-badge">
            <div className="user-avatar">{user.name?.[0] || 'U'}</div>
            {user.name || user.email}
          </div>
          <button onClick={onLogout} className="btn-logout">Sign Out</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>AI 3D/Spatial Platform</h1>
          <p>3D model generation, AR/VR content creation, and spatial computing tools</p>
        </div>

        {/* AI Usage Panel */}
        {showUsage && aiUsage && (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
            <h3 style={{ color: '#c084fc', marginBottom: 16, fontSize: 16 }}>📊 AI Usage Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#a5b4fc' }}>{aiUsage.totals?.total_calls || 0}</div>
                <div style={{ fontSize: 12, color: '#7c7caf', marginTop: 4 }}>Total AI Calls</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#c084fc' }}>{Number(aiUsage.totals?.total_tokens || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#7c7caf', marginTop: 4 }}>Total Tokens</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2dd4bf' }}>{aiUsage.totals?.unique_users || 0}</div>
                <div style={{ fontSize: 12, color: '#7c7caf', marginTop: 4 }}>Unique Users</div>
              </div>
            </div>
            {aiUsage.by_feature?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: '#7c7caf', marginBottom: 10, fontWeight: 600 }}>By Feature</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {aiUsage.by_feature.slice(0, 8).map(f => (
                    <div key={f.feature} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>{f.feature}</div>
                      <div style={{ fontSize: 11, color: '#7c7caf', marginTop: 2 }}>{f.calls} calls · {Number(f.total_tokens || 0).toLocaleString()} tokens</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="features-grid">
          {FEATURES.map(f => (
            <div
              key={f.key}
              className="feature-card"
              style={{ '--card-color': f.color }}
              onClick={() => navigate(`/feature/${f.key}`)}
            >
              <div className="card-icon" style={{ background: `${f.color}15`, color: f.color }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              <div className="card-stats">
                <span className="card-count">{counts[f.key] !== undefined ? `${counts[f.key]} items` : '...'}</span>
                <span className="card-arrow">&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
