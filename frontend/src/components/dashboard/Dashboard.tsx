import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
import { DashboardStats } from '../../types';
import { useAuthStore } from '../../store/authStore';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    dashboardApi.getStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;
  if (!stats) return <div style={styles.loading}>Failed to load stats</div>;

  const issuesData = Object.entries(stats.issuesByType || {}).map(([name, value]) => ({ name, value }));
  const languageData = Object.entries(stats.reviewsByLanguage || {}).map(([name, value]) => ({ name, value }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome back, {user?.fullName || user?.username}!</p>
        </div>
        <Link to="/reviews/new" style={styles.newBtn}>+ New Review</Link>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard icon="📋" label="Total Reviews" value={stats.totalReviews} color="#6366f1" />
        <StatCard icon="👤" label="My Reviews" value={stats.myReviews} color="#10b981" />
        <StatCard icon="⭐" label="Avg AI Score" value={stats.avgScore ? `${stats.avgScore}/100` : 'N/A'} color="#f59e0b" />
        <StatCard icon="💬" label="Total Comments" value={stats.totalComments || 0} color="#8b5cf6" />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        {/* Score History */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Code Quality Score Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
              <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Issues Pie Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Issues by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={issuesData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {issuesData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Language Bar + Top Reviewers */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Reviews by Language</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={languageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🏆 Top Contributors</h3>
          {stats.topReviewers?.map((reviewer, i) => (
            <div key={reviewer.username} style={styles.reviewerRow}>
              <div style={styles.reviewerRank}>{i + 1}</div>
              <div style={styles.reviewerAvatar}>{reviewer.username.charAt(0).toUpperCase()}</div>
              <div style={styles.reviewerInfo}>
                <div style={styles.reviewerName}>{reviewer.fullName || reviewer.username}</div>
                <div style={styles.reviewerMeta}>{reviewer.reviewCount} reviews · avg {reviewer.avgScore?.toFixed(0) || '—'}/100</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: any; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
    <div style={styles.statIcon}>{icon}</div>
    <div style={{ ...styles.statValue, color }}>{value}</div>
    <div style={styles.statLabel}>{label}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1280, margin: '0 auto', padding: '32px 24px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', fontSize: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 15 },
  newBtn: { background: '#6366f1', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  statIcon: { fontSize: 28, marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 13 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  chartCard: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  chartTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: 600, marginBottom: 16 },
  reviewerRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b' },
  reviewerRank: { color: '#6366f1', fontWeight: 700, fontSize: 16, width: 20 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 },
  reviewerInfo: { flex: 1 },
  reviewerName: { color: '#f1f5f9', fontSize: 14, fontWeight: 500 },
  reviewerMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
};

export default Dashboard;
