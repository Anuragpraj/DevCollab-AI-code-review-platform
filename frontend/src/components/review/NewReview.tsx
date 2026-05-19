import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewApi } from '../../services/api';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';

const LANGUAGES = ['JavaScript', 'TypeScript', 'Java', 'Python', 'Go', 'C++', 'C#', 'PHP', 'Ruby', 'Rust', 'SQL', 'Other'];

const NewReview: React.FC = () => {
  const [form, setForm] = useState({ title: '', description: '', codeContent: '', language: 'JavaScript', githubPrUrl: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codeContent.trim()) { toast.error('Please add some code to review'); return; }
    setLoading(true);
    try {
      const res = await reviewApi.create(form);
      toast.success('Review created! Triggering AI review...');
      // Auto-trigger AI review
      await reviewApi.triggerAiReview(res.data.id);
      toast.success('AI review started — results will appear shortly!');
      navigate(`/reviews/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>New Code Review</h1>
        <p style={styles.subtitle}>Submit code for AI-powered review + team collaboration</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.topFields}>
          <div style={styles.field}>
            <label style={styles.label}>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. User authentication service - login method"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Language</label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} style={styles.select}>
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What should reviewers focus on? Any specific concerns?"
            rows={2}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>GitHub PR URL (optional)</label>
          <input
            value={form.githubPrUrl}
            onChange={(e) => setForm({ ...form, githubPrUrl: e.target.value })}
            placeholder="https://github.com/org/repo/pull/123"
            style={styles.input}
          />
        </div>

        <div style={styles.editorField}>
          <label style={styles.label}>Code *</label>
          <div style={styles.editorWrapper}>
            <Editor
              height="400px"
              language={form.language.toLowerCase().replace('c++', 'cpp').replace('c#', 'csharp')}
              theme="vs-dark"
              value={form.codeContent}
              onChange={(v) => setForm({ ...form, codeContent: v || '' })}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 12 },
              }}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={() => navigate(-1)} style={styles.cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? '⏳ Submitting...' : '🚀 Submit for AI Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 15 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  topFields: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: 500 },
  input: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  select: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none' },
  editorField: { display: 'flex', flexDirection: 'column', gap: 6 },
  editorWrapper: { border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 },
  submitBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default NewReview;
