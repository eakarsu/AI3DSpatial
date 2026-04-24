import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FEATURES } from '../config/features';

const API = 'http://localhost:3001/api';

function formatAiResponse(text) {
  if (!text) return '';
  // Convert markdown-like formatting to styled HTML
  let formatted = text
    .replace(/^### (.+)$/gm, '<h3 style="color:#a855f7;margin:16px 0 8px;font-size:16px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#c084fc;margin:18px 0 10px;font-size:18px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#e0e0f0;margin:20px 0 12px;font-size:20px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0f0">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c0c0e0">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.12);padding:2px 6px;border-radius:4px;color:#a5b4fc;font-size:13px">$1</code>')
    .replace(/^- (.+)$/gm, '<div style="padding:4px 0 4px 16px;position:relative"><span style="position:absolute;left:0;color:#6366f1">\u2022</span> $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding:4px 0 4px 16px">$1</div>')
    .replace(/\n\n/g, '<div style="height:12px"></div>')
    .replace(/\n/g, '<br/>');
  return formatted;
}

export default function FeaturePage({ user, onLogout }) {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const feature = FEATURES.find(f => f.key === featureKey);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (!feature) return;
    try {
      const res = await fetch(`${API}${feature.endpoint}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  if (!feature) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Feature not found</div>;
  }

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`${API}${feature.endpoint}/${id}`, { method: 'DELETE' });
      setSelectedItem(null);
      loadItems();
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
    feature.formFields.forEach(f => {
      initial[f.key] = f.type === 'checkbox' ? false : '';
    });
    setFormData(initial);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editItem
        ? `${API}${feature.endpoint}/${editItem.id}`
        : `${API}${feature.endpoint}`;
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setShowForm(false);
      setEditItem(null);
      loadItems();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      setAiResponse(data);
    } catch (err) {
      setAiResponse({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiAsNew = async () => {
    if (!aiResponse?.ai_response) return;
    const initial = { name: `AI: ${aiPrompt.slice(0, 50)}`, description: aiPrompt };
    feature.formFields.forEach(f => {
      if (!initial[f.key]) initial[f.key] = f.type === 'checkbox' ? false : '';
    });
    initial.ai_generated = true;
    initial.ai_prompt = aiPrompt;
    initial.ai_response = aiResponse.ai_response;

    try {
      const res = await fetch(`${API}${feature.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial),
      });
      if (res.ok) {
        setShowAi(false);
        setAiPrompt('');
        setAiResponse(null);
        loadItems();
      }
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const renderValue = (col, item) => {
    const val = item[col.key];
    if (col.type === 'status') {
      const cls = `status-badge status-${(val || '').toLowerCase().replace(/\s+/g, '-')}`;
      return <span className={cls}>{val}</span>;
    }
    if (col.type === 'boolean') {
      return val ? '\u2705' : '\u274C';
    }
    if (col.type === 'number' && val !== null && val !== undefined) {
      return Number(val).toLocaleString();
    }
    return val || '\u2014';
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
            <button className="btn-back" onClick={() => navigate('/')}>\u2190 Back</button>
            <h1 className="page-title">{feature.icon} {feature.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ai" onClick={() => { setShowAi(true); setAiResponse(null); setAiPrompt(''); }}>
              \u2728 AI Generate
            </button>
            <button className="btn-new" onClick={handleNew}>
              + New Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ height: 300 }}><div className="loader"></div></div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {feature.columns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>AI</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={feature.columns.length + 2} style={{ textAlign: 'center', padding: 40, color: '#666' }}>No items yet. Click "New Item" or "AI Generate" to add one.</td></tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} onClick={() => handleRowClick(item)}>
                    <td>{idx + 1}</td>
                    {feature.columns.map(col => (
                      <td key={col.key}>{renderValue(col, item)}</td>
                    ))}
                    <td>{item.ai_generated ? <span className="ai-badge">\u2728 AI</span> : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>\u2715</button>
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
                       value !== null && value !== undefined ? String(value) : '\u2014'}
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
                      <div className="ai-response-header">
                        <h4>\u2728 AI Generated Content</h4>
                      </div>
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
            </div>
            <div className="modal-actions">
              <button className="btn-edit" onClick={() => handleEdit(selectedItem)}>\u270F Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(selectedItem.id)}>\u{1F5D1} Delete</button>
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
              <button className="modal-close" onClick={() => setShowForm(false)}>\u2715</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {feature.formFields.map(field => (
                    <div key={field.key} className={`form-group ${field.fullWidth ? 'full-width' : ''}`}>
                      <label>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.key] || ''}
                          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        >
                          <option value="">Select...</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ paddingTop: 4 }}>
                          <input
                            type="checkbox"
                            checked={!!formData[field.key]}
                            onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })}
                            style={{ width: 'auto' }}
                          />
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
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>\u2728 AI Generate — {feature.title}</h2>
              <button className="modal-close" onClick={() => setShowAi(false)}>\u2715</button>
            </div>
            <div className="modal-body">
              <div className="ai-prompt-section">
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>
                  Prompt
                </label>
                <textarea
                  className="ai-prompt-input"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={feature.aiPromptHint}
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                  <button
                    className="btn-ai"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                  >
                    {aiLoading ? 'Generating...' : '\u2728 Generate with AI'}
                  </button>
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
                        <h4>\u2728 AI Response</h4>
                        <span className="ai-model-badge">{aiResponse.model || 'AI Model'}</span>
                      </div>
                      <div className="ai-response-body">
                        <div
                          className="ai-response-content"
                          dangerouslySetInnerHTML={{ __html: formatAiResponse(aiResponse.ai_response) }}
                        />
                      </div>
                      {aiResponse.usage && (
                        <div className="ai-response-meta">
                          <div className="ai-meta-item">Prompt tokens: <span>{aiResponse.usage.prompt_tokens}</span></div>
                          <div className="ai-meta-item">Completion tokens: <span>{aiResponse.usage.completion_tokens}</span></div>
                          <div className="ai-meta-item">Feature: <span>{aiResponse.feature || feature.title}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                  {aiResponse.ai_response && !aiResponse.error && (
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
