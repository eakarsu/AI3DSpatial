import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FEATURES } from '../config/features';
import './AppSidebar.css';

const LINKS = [
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/advisors', label: 'AI Advisors', group: 'AI tools' },
  ...FEATURES.map(feature => ({ to: `/feature/${feature.key}`, label: feature.title, group: 'Workspace' })),
  { to: '/insights/timeline', label: 'Timeline', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Views', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AI 3D Spatial</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
