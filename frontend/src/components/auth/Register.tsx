import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setUser(res.data);
      toast.success('Account created! Welcome to DevCollab 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.email || err.response?.data?.username || err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <h1 style={styles.logoText}>DevCollab</h1>
        </div>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Username *</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="johndoe" required style={styles.input} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" required style={styles.input} />
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 24 },
  card: { background: '#1e293b', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, border: '1px solid #334155' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  logoIcon: { fontSize: 32 },
  logoText: { fontSize: 24, fontWeight: 700, color: '#f1f5f9' },
  subtitle: { color: '#94a3b8', marginBottom: 32, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: 500 },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none' },
  button: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  switchText: { textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 20 },
  link: { color: '#6366f1', textDecoration: 'none' },
};

export default Register;
