import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FEATURES } from '../config/features';

const API = 'http://localhost:3001/api';
const AI_API = 'http://localhost:3001/api/ai';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

function formatAiResponse(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3 style="color:#a855f7;margin:16px 0 8px;font-size:16px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#c084fc;margin:18px 0 10px;font-size:18px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#e0e0f0;margin:20px 0 12px;font-size:20px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0f0">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c0c0e0">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.12);padding:2px 6px;border-radius:4px;color:#a5b4fc;font-size:13px">$1</code>')
    .replace(/^- (.+)$/gm, '<div style="padding:4px 0 4px 16px;position:relative"><span style="position:absolute;left:0;color:#6366f1">&bull;</span> $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding:4px 0 4px 16px">$1</div>')
    .replace(/\n\n/g, '<div style="height:12px"></div>')
    .replace(/\n/g, '<br/>');
}

function renderParsedJson(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const skip = ['ai_generated', 'ai_prompt', 'ai_response', 'name', 'description', 'summary'];
  const entries = Object.entries(parsed).filter(([k]) => !skip.includes(k));
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ color: '#a855f7', marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Structured AI Data</h4>
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: '#7c7caf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {key.replace(/_/g, ' ')}
            </div>
            <div style={{ color: '#c0c0e0', fontSize: 13 }}>
              {typeof val === 'object'
                ? <pre style={{ margin: 0, fontSize: 12, color: '#a5b4fc', overflowX: 'auto' }}>{JSON.stringify(val, null, 2)}</pre>
                : String(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturePage({ user, onLogout }) {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const feature = FEATURES.find(f => f.key === featureKey);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [toolResult, setToolResult] = useState(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [batchCount, setBatchCount] = useState(3);

  const loadItems = useCallback(async (page = 1) => {
    if (!feature) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}${feature.endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (data.data && data.pagination) {
        setItems(data.data);
        setPagination(data.pagination);
      } else if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  }, [feature, search, statusFilter, pagination.limit, onLogout]);

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  if (!feature) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Feature not found</div>;
  }

  const handlePageChange = (newPage) => {
    loadItems(newPage);
  };

  const handleRowClick = (item) => setSelectedItem(item);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const res = await fetch(`${API}${feature.endpoint}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) { onLogout(); return; }
      setSelectedItem(null);
      loadItems(pagination.page);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({ ...item });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditItem(null);
    const initial = {};
    feature.formFields.forEach(f => { initial[f.key] = f.type === 'checkbox' ? false : ''; });
    setFormData(initial);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editItem ? `${API}${feature.endpoint}/${editItem.id}` : `${API}${feature.endpoint}`;
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(formData) });
      if (res.status === 401) { onLogout(); return; }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      setShowForm(false);
      setEditItem(null);
      loadItems(pagination.page);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch(`${API}${feature.aiEndpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setAiResponse(data);
      if (data.saved_item) {
        loadItems(pagination.page);
      }
    } catch (err) {
      setAiResponse({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch(`${AI_API}/batch-generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ base_prompt: aiPrompt, count: batchCount, table: feature.table }),
      });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setAiResponse({ ...data, ai_response: JSON.stringify(data.variations, null, 2) });
      if (data.saved_count > 0) loadItems(pagination.page);
    } catch (err) {
      setAiResponse({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiAsNew = async () => {
    if (!aiResponse?.ai_response) return;
    const initial = { name: `AI: ${aiPrompt.slice(0, 50)}`, description: aiPrompt };
    feature.formFields.forEach(f => { if (!initial[f.key]) initial[f.key] = f.type === 'checkbox' ? false : ''; });
    initial.ai_generated = true;
    initial.ai_prompt = aiPrompt;
    initial.ai_response = aiResponse.ai_response;

    try {
      const res = await fetch(`${API}${feature.endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(initial),
      });
      if (res.status === 401) { onLogout(); return; }
      if (res.ok) {
        setShowAi(false);
        setAiPrompt('');
        setAiResponse(null);
        loadItems(pagination.page);
      }
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleSuggestTags = async () => {
    if (!selectedItem) return;
    setToolLoading(true);
    setToolResult(null);
    try {
      const res = await fetch(`${AI_API}/suggest-tags`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: selectedItem.name, description: selectedItem.description, category: selectedItem.category }),
      });
      const data = await res.json();
      setToolResult({ type: 'tags', data });
    } catch (err) {
      setToolResult({ type: 'error', error: err.message });
    } finally {
      setToolLoading(false);
    }
  };

  const handleExportAdvisor = async (engine) => {
    if (!selectedItem) return;
    setToolLoading(true);
    setToolResult(null);
    try {
      const res = await fetch(`${AI_API}/export-advisor`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ asset_id: selectedItem.id, asset_type: feature.table, target_engine: engine }),
      });
      const data = await res.json();
      setToolResult({ type: 'export', data });
    } catch (err) {
      setToolResult({ type: 'error', error: err.message });
    } finally {
      setToolLoading(false);
    }
  };

  const renderValue = (col, item) => {
    const val = item[col.key];
    if (col.type === 'status') {
      return <span className={`status-badge status-${(val || '').toLowerCase().replace(/\s+/g, '-')}`}>{val}</span>;
    }
    if (col.type === 'boolean') return val ? '✅' : '❌';
    if (col.type === 'number' && val !== null && val !== undefined) return Number(val).toLocaleString();
    return val || '—';
  };

  return (
    <div className="feature-page">
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
        <div className="page-header">
          <div className="page-header-left">
            <button className="btn-back" onClick={() => navigate('/')}>&larr; Back</button>
            <h1 className="page-title">{feature.icon} {feature.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ai" onClick={() => { setShowAi(true); setAiResponse(null); setAiPrompt(''); }}>
              ✨ AI Generate
            </button>
            <button className="btn-new" onClick={handleNew}>+ New Item</button>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e0e0f0', fontSize: 13 }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e0e0f0', fontSize: 13 }}
          >
            <option value="">All Statuses</option>
            {['ready', 'processing', 'error', 'draft', 'published', 'completed', 'active', 'available', 'processed', 'mapped', 'generating', 'archived'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ height: 300 }}><div className="loader"></div></div>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {feature.columns.map(col => <th key={col.key}>{col.label}</th>)}
                    <th>AI</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={feature.columns.length + 2} style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                      No items found. Click "New Item" or "AI Generate" to add one.
                    </td></tr>
                  ) : items.map((item, idx) => (
                    <tr key={item.id} onClick={() => handleRowClick(item)}>
                      <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                      {feature.columns.map(col => <td key={col.key}>{renderValue(col, item)}</td>)}
                      <td>{item.ai_generated ? <span className="ai-badge">✨ AI</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', opacity: pagination.page <= 1 ? 0.5 : 1 }}
                >
                  &larr; Prev
                </button>
                <span style={{ color: '#a0a0c0', fontSize: 13 }}>
                  Page {pagination.page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} total
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setToolResult(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => { setSelectedItem(null); setToolResult(null); }}>&#x2715;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selectedItem).filter(([k]) =>
                  !['id', 'created_at', 'updated_at', 'ai_prompt', 'ai_response'].includes(k)
                ).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <div className="detail-label">{key.replace(/_/g, ' ')}</div>
                    <div className="detail-value">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                       value !== null && value !== undefined ? String(value) : '—'}
                    </div>
                  </div>
                ))}
                {selectedItem.ai_prompt && (
                  <div className="detail-item full-width">
                    <div className="detail-label">AI Prompt</div>
                    <div className="detail-value">{selectedItem.ai_prompt}</div>
                  </div>
                )}
                {selectedItem.ai_response && (
                  <div className="detail-item full-width">
                    <div className="detail-label">AI Response</div>
                    <div className="ai-response-card" style={{ marginTop: 8 }}>
                      <div className="ai-response-header"><h4>✨ AI Generated Content</h4></div>
                      <div className="ai-response-body">
                        <div className="ai-response-content"
                          dangerouslySetInnerHTML={{ __html: formatAiResponse(selectedItem.ai_response) }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">Created</div>
                  <div className="detail-value">{new Date(selectedItem.created_at).toLocaleString()}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Updated</div>
                  <div className="detail-value">{new Date(selectedItem.updated_at).toLocaleString()}</div>
                </div>
              </div>

              {/* AI Tools for selected item */}
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => setShowTools(!showTools)}
                  style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', fontSize: 13, cursor: 'pointer' }}
                >
                  🔧 AI Tools
                </button>
                {showTools && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={handleSuggestTags} disabled={toolLoading}
                      style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer' }}>
                      🏷 Suggest Tags
                    </button>
                    {['Unity', 'Unreal Engine', 'Three.js', 'Godot'].map(engine => (
                      <button key={engine} onClick={() => handleExportAdvisor(engine)} disabled={toolLoading}
                        style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)', color: '#2dd4bf', fontSize: 12, cursor: 'pointer' }}>
                        Export → {engine}
                      </button>
                    ))}
                  </div>
                )}
                {toolLoading && <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>AI processing...</div>}
                {toolResult && !toolLoading && (
                  <div style={{ marginTop: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 16 }}>
                    {toolResult.type === 'error' && <div style={{ color: '#f87171' }}>{toolResult.error}</div>}
                    {toolResult.type === 'tags' && toolResult.data?.tags && (
                      <div>
                        <div style={{ fontSize: 12, color: '#7c7caf', marginBottom: 8 }}>Suggested Tags</div>
                        <div style={{ color: '#c0c0e0', fontSize: 13 }}>{toolResult.data.tags.combined_tag_string}</div>
                        {toolResult.data.tags.suggested_tags?.map((t, i) => (
                          <span key={i} style={{ display: 'inline-block', margin: '4px 4px 0 0', padding: '2px 8px', background: 'rgba(99,102,241,0.2)', borderRadius: 12, fontSize: 12, color: '#a5b4fc' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {toolResult.type === 'export' && toolResult.data?.export_plan && (
                      <div>
                        <div style={{ fontSize: 12, color: '#7c7caf', marginBottom: 8 }}>Export Checklist — {toolResult.data.export_plan.target_engine}</div>
                        {toolResult.data.export_plan.checklist?.slice(0, 6).map((item, i) => (
                          <div key={i} style={{ marginBottom: 6, color: '#c0c0e0', fontSize: 13 }}>
                            <span style={{ color: item.required ? '#f87171' : '#4ade80', marginRight: 6 }}>{item.required ? '!' : '✓'}</span>
                            <strong>{item.action}</strong> — {item.notes}
                          </div>
                        ))}
                        {toolResult.data.export_plan.summary && (
                          <div style={{ marginTop: 8, fontSize: 13, color: '#a0a0c0' }}>{toolResult.data.export_plan.summary}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-edit" onClick={() => handleEdit(selectedItem)}>&#x270F; Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (New / Edit) */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit' : 'New'} {feature.title.replace(/s$/, '')}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&#x2715;</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {feature.formFields.map(field => (
                    <div key={field.key} className={`form-group ${field.fullWidth ? 'full-width' : ''}`}>
                      <label>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} required={field.required} />
                      ) : field.type === 'select' ? (
                        <select value={formData[field.key] || ''} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}>
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ paddingTop: 4 }}>
                          <input type="checkbox" checked={!!formData[field.key]} onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })} style={{ width: 'auto' }} />
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={formData[field.key] || ''}
                          onChange={e => setFormData({ ...formData, [field.key]: field.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value })}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '0 28px 24px' }}>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editItem ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAi && (
        <div className="modal-overlay" onClick={() => setShowAi(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✨ AI Generate — {feature.title}</h2>
              <button className="modal-close" onClick={() => setShowAi(false)}>&#x2715;</button>
            </div>
            <div className="modal-body">
              <div className="ai-prompt-section">
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>Prompt</label>
                <textarea
                  className="ai-prompt-input"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={feature.aiPromptHint}
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-ai" onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}>
                    {aiLoading ? 'Generating...' : '✨ Generate with AI'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ color: '#a0a0c0', fontSize: 13 }}>Batch:</label>
                    <select value={batchCount} onChange={e => setBatchCount(Number(e.target.value))}
                      style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e0e0f0', fontSize: 13 }}>
                      {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} variations</option>)}
                    </select>
                    <button className="btn-ai" onClick={handleBatchGenerate} disabled={aiLoading || !aiPrompt.trim()}
                      style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.4)', color: '#2dd4bf' }}>
                      Batch Generate
                    </button>
                  </div>
                </div>
              </div>

              {aiLoading && (
                <div className="ai-loading">
                  <div className="loader"></div>
                  <p>AI is generating content for {feature.title}...</p>
                </div>
              )}

              {aiResponse && !aiLoading && (
                <div className="ai-response-section">
                  {aiResponse.error ? (
                    <div className="login-error">{aiResponse.error}</div>
                  ) : (
                    <div className="ai-response-card">
                      <div className="ai-response-header">
                        <h4>✨ AI Response</h4>
                        <span className="ai-model-badge">{aiResponse.model || 'AI Model'}</span>
                      </div>
                      <div className="ai-response-body">
                        <div className="ai-response-content"
                          dangerouslySetInnerHTML={{ __html: formatAiResponse(aiResponse.ai_response) }}
                        />
                        {aiResponse.parsed && renderParsedJson(aiResponse.parsed)}
                      </div>
                      {aiResponse.usage && (
                        <div className="ai-response-meta">
                          <div className="ai-meta-item">Prompt tokens: <span>{aiResponse.usage.prompt_tokens}</span></div>
                          <div className="ai-meta-item">Completion tokens: <span>{aiResponse.usage.completion_tokens}</span></div>
                          {aiResponse.saved_item && <div className="ai-meta-item">Saved: <span style={{ color: '#4ade80' }}>✓ Auto-saved</span></div>}
                        </div>
                      )}
                    </div>
                  )}
                  {aiResponse.ai_response && !aiResponse.error && !aiResponse.saved_item && (
                    <button className="btn-save-ai" onClick={handleSaveAiAsNew}>
                      Save as New {feature.title.replace(/s$/, '')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
