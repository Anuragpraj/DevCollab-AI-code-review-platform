import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../../services/api';
import { PagedReviewResponse, Review } from '../../types';

const statusColors: Record<string, string> = {
  PENDING: '#f59e0b', AI_REVIEWING: '#6366f1', AI_DONE: '#10b981',
  IN_REVIEW: '#3b82f6', APPROVED: '#10b981', CHANGES_REQUESTED: '#ef4444', MERGED: '#8b5cf6',
};

const ReviewList: React.FC = () => {
  const [data, setData] = useState<PagedReviewResponse | null>(null);
  const [tab, setTab] = useState<'all' | 'my'>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === 'all' ? reviewApi.getAll(page) : reviewApi.getMy(page);
    fetch
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab, page]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Code Reviews</h1>
          <p style={styles.subtitle}>{data?.totalElements || 0} total reviews</p>
        </div>
        <Link to="/reviews/new" style={styles.newBtn}>+ New Review</Link>
      </div>

      <div style={styles.tabs}>
        {(['all', 'my'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(0); }}
            style={{ ...styles.tab, ...(tab === t ? styles.activeTab : {}) }}>
            {t === 'all' ? '🌐 All Reviews' : '👤 My Reviews'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading reviews...</div>
      ) : (
        <>
          <div style={styles.list}>
            {data?.reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            {(!data?.reviews.length) && (
              <div style={styles.empty}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p>No reviews yet. <Link to="/reviews/new" style={{ color: '#6366f1' }}>Create the first one!</Link></p>
              </div>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div style={styles.pagination}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={styles.pageBtn}>← Prev</button>
              <span style={{ color: '#64748b' }}>Page {page + 1} of {data.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(data.totalPages - 1, p + 1))} disabled={page >= data.totalPages - 1} style={styles.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
  <Link to={`/reviews/${review.id}`} style={styles.card}>
    <div style={styles.cardTop}>
      <div style={styles.cardLeft}>
        <span style={styles.langBadge}>{review.language || 'Code'}</span>
        <h3 style={styles.cardTitle}>{review.title}</h3>
        {review.description && <p style={styles.cardDesc}>{review.description}</p>}
      </div>
      <div style={styles.cardRight}>
        <span style={{ ...styles.statusBadge, background: `${statusColors[review.status]}22`, color: statusColors[review.status] }}>
          {review.status.replace(/_/g, ' ')}
        </span>
        {review.aiScore != null && (
          <div style={{ ...styles.score, color: review.aiScore >= 70 ? '#10b981' : review.aiScore >= 50 ? '#f59e0b' : '#ef4444' }}>
            {review.aiScore}/100
          </div>
        )}
      </div>
    </div>
    <div style={styles.cardFooter}>
      <span style={styles.footerItem}>👤 {review.author?.username}</span>
      <span style={styles.footerItem}>💬 {review.commentCount} comments</span>
      <span style={styles.footerItem}>🕐 {new Date(review.createdAt).toLocaleDateString()}</span>
    </div>
  </Link>
);

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1280, margin: '0 auto', padding: '32px 24px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 14 },
  newBtn: { background: '#6366f1', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 },
  activeTab: { background: 'rgba(99,102,241,0.1)', borderColor: '#6366f1', color: '#6366f1' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#64748b' },
  card: { display: 'block', background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px', textDecoration: 'none', transition: 'border-color 0.15s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flex: 1 },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16 },
  langBadge: { background: '#1e3a5f', color: '#7dd3fc', fontSize: 11, padding: '3px 8px', borderRadius: 4, marginBottom: 8, display: 'inline-block' },
  cardTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardDesc: { color: '#64748b', fontSize: 13 },
  statusBadge: { fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  score: { fontSize: 20, fontWeight: 700 },
  cardFooter: { display: 'flex', gap: 20 },
  footerItem: { color: '#64748b', fontSize: 13 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
  pageBtn: { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
};

export default ReviewList;
