import AIReportLibrary from "./components/AIReportLibrary";
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SceneReadiness from './pages/SceneReadiness';
import ConversionPlans from './pages/ConversionPlans';
import FeaturePage from './pages/FeaturePage';
import AdvisorPage from './pages/AdvisorPage';
import './App.css';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';
import AppSidebar from './components/AppSidebar';

const API = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {const data=await r.json();if(!r.ok)throw Error(data.error||'Session could not be verified');return data;})
        .then(data => { if (data.user) setUser(data.user); })
        .catch(() => {localStorage.removeItem('token');setUser(null);})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <><AIReportLibrary floating /><Router>
      <div className={user ? 'codex-nav-shell' : undefined}>
      {user && <AppSidebar />}
      <Routes>
        <Route path="/insights/timeline" element={user?<section><h1>Archived prototype</h1><p>The native server keeps this historical feature disabled. Use Scene readiness or Conversion plans.</p></section>:<Navigate to="/login"/>} />
        <Route path="/codex/custom-viz" element={user?<section><h1>Archived prototype</h1><p>Use the supported native workspace links in the sidebar.</p></section>:<Navigate to="/login"/>} />
        <Route path="/codex/operations" element={user?<ConversionPlans/>:<Navigate to="/login"/>} />

        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/feature/:featureKey" element={user ? <section><h1>Archived prototype</h1><p>Historical generated model tables remain quarantined by the native server. Use Conversion plans to manage actual saved planning drafts.</p></section> : <Navigate to="/login" />} />
        <Route path="/scene-readiness" element={user?<SceneReadiness/>:<Navigate to="/login"/>}/>
        <Route path="/conversion-plans" element={user?<ConversionPlans/>:<Navigate to="/login"/>}/>
        <Route path="/advisors" element={user ? <section><h1>Archived AI prototypes</h1><p>These older advisor APIs remain quarantined. Scene readiness is the actual mounted OpenRouter review; the report library prepares separate advisory reports.</p></section> : <Navigate to="/login" />} />
      </Routes>
      </div>
    </Router></>
  );
}

export default App;
