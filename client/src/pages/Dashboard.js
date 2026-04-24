import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURES } from '../config/features';

const API = 'http://localhost:3001/api';

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    FEATURES.forEach(f => {
      fetch(`${API}${f.endpoint}`)
        .then(r => r.json())
        .then(data => {
          setCounts(prev => ({ ...prev, [f.key]: Array.isArray(data) ? data.length : 0 }));
        })
        .catch(() => {});
    });
  }, []);

  return (
    <div className="dashboard">
      <div className="topbar">
        <div className="topbar-brand">
          <span className="brand-icon">AI3D</span>
          <h2>AI 3D/Spatial</h2>
        </div>
        <div className="topbar-right">
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
                <span className="card-count">{counts[f.key] ?? '...'} items</span>
                <span className="card-arrow">&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
