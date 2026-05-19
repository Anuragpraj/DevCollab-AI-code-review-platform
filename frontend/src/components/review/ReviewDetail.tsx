import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { reviewApi } from '../../services/api';
import { Review, CommentInfo } from '../../types';
import { connectWebSocket, sendPresence, disconnectWebSocket } from '../../services/websocket';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const commentTypeColors: Record<string, string> = {
  HUMAN: '#6366f1', AI_BUG: '#ef4444', AI_SECURITY: '#f59e0b',
  AI_BEST_PRACTICE: '#10b981', AI_SUGGESTION: '#3b82f6',
};
const commentTypeLabels: Record<string, string> = {
  HUMAN: '💬', AI_BUG: '🐛 Bug', AI_SECURITY: '🔒 Security',
  AI_BEST_PRACTICE: '✅ Best Practice', AI_SUGGESTION: '💡 Suggestion',
};
const severityColors: Record<string, string> = {
  CRITICAL: '#ef4444', ERROR: '#f97316', WARNING: '#f59e0b', INFO: '#6366f1',
};

const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'comments'>('ai');

  const loadReview = useCallback(() => {
    if (!id) return;
    reviewApi.getById(Number(id))
      .then((res) => {
        setReview(res.data);
        setComments(res.data.comments || []);
      })
      .catch(() => { toast.error('Review not found'); navigate('/reviews'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    loadReview();

    // WebSocket connection
    if (id && user) {
      connectWebSocket(
        Number(id),
        (comment) => setComments((prev) => [...prev, comment]),
        (aiResult) => {
          toast.success('AI review completed!');
          loadReview();
        },
        (status) => setReview((prev) => prev ? { ...prev, status: status as any } : prev),
        (presenceMsg) => {
          if (presenceMsg.action === 'JOINED') {
            setOnlineUsers((prev) => [...new Set([...prev, presenceMsg.username])]);
          } else {
            setOnlineUsers((prev) => prev.filter((u) => u !== presenceMsg.username));
          }
        }
      );
      sendPresence(Number(id), user.userId, user.username, 'join');
    }

    return () => {
      if (id && user) sendPresence(Number(id), user.userId, user.username, 'leave');
      disconnectWebSocket();
    };
  }, [id, user, loadReview]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !review) return;
    try {
      await reviewApi.addComment(review.id, { content: newComment, lineNumber: selectedLine });
      setNewComment('');
      setSelectedLine(undefined);
      toast.success('Comment added!');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleEditorMount = (editor: any) => {
    editor.onMouseDown((e: any) => {
      if (e.target.position) setSelectedLine(e.target.position.lineNumber);
    });
  };

  const handleRetriggerAi = async () => {
    if (!review) return;
    try {
      await reviewApi.triggerAiReview(review.id);
      toast.success('AI review retriggered!');
      setReview((prev) => prev ? { ...prev, status: 'AI_REVIEWING' } : prev);
    } catch { toast.error('Failed to trigger AI review'); }
  };

  if (loading) return <div style={styles.loading}>Loading review...</div>;
  if (!review) return null;

  const aiComments = comments.filter((c) => c.type !== 'HUMAN');
  const humanComments = comments.filter((c) => c.type === 'HUMAN');

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/reviews')} style={styles.backBtn}>← Back</button>
          <div>
            <div style={styles.headerMeta}>
              <span style={styles.langBadge}>{review.language}</span>
              <span style={{ ...styles.statusBadge, color: review.status === 'AI_REVIEWING' ? '#f59e0b' : '#10b981' }}>
                {review.status === 'AI_REVIEWING' ? '⏳ AI Reviewing...' : `✓ ${review.status.replace(/_/g, ' ')}`}
              </span>
              {onlineUsers.length > 0 && (
                <span style={styles.onlineBadge}>🟢 {onlineUsers.join(', ')} online</span>
              )}
            </div>
            <h1 style={styles.title}>{review.title}</h1>
            {review.description && <p style={styles.description}>{review.description}</p>}
          </div>
        </div>
        <div style={styles.headerRight}>
          {review.aiScore != null && (
            <div style={styles.scoreCircle}>
              <div style={{ ...styles.scoreNum, color: review.aiScore >= 70 ? '#10b981' : review.aiScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                {review.aiScore}
              </div>
              <div style={styles.scoreLabel}>AI Score</div>
            </div>
          )}
          <button onClick={handleRetriggerAi} style={styles.aiBtn}>🤖 Re-run AI</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={styles.layout}>
        {/* Code editor (left) */}
        <div style={styles.editorPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>📝 Code</span>
            {selectedLine && <span style={styles.lineIndicator}>Line {selectedLine} selected — add comment below</span>}
          </div>
          <div style={styles.editorWrapper}>
            <Editor
              height="calc(100vh - 320px)"
              language={review.language?.toLowerCase().replace('c++', 'cpp').replace('c#', 'csharp') || 'plaintext'}
              theme="vs-dark"
              value={review.codeContent}
              onMount={handleEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                renderLineHighlight: 'all',
              }}
            />
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.rightPanel}>
          {/* Tabs */}
          <div style={styles.tabs}>
            <button onClick={() => setActiveTab('ai')} style={{ ...styles.tab, ...(activeTab === 'ai' ? styles.activeTab : {}) }}>
              🤖 AI Review {aiComments.length > 0 && `(${aiComments.length})`}
            </button>
            <button onClick={() => setActiveTab('comments')} style={{ ...styles.tab, ...(activeTab === 'comments' ? styles.activeTab : {}) }}>
              💬 Team ({humanComments.length})
            </button>
          </div>

          <div style={styles.panelScroll}>
            {activeTab === 'ai' ? (
              <AiPanel review={review} aiComments={aiComments} />
            ) : (
              <HumanCommentsPanel humanComments={humanComments} />
            )}
          </div>

          {/* Add comment */}
          <form onSubmit={handleAddComment} style={styles.commentForm}>
            {selectedLine && <div style={styles.lineTag}>📍 Line {selectedLine} <button type="button" onClick={() => setSelectedLine(undefined)} style={styles.clearLine}>✕</button></div>}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... (click a line in the editor to attach it)"
              rows={3}
              style={styles.commentInput}
            />
            <button type="submit" disabled={!newComment.trim()} style={styles.commentBtn}>💬 Add Comment</button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AiPanel: React.FC<{ review: Review; aiComments: CommentInfo[] }> = ({ review, aiComments }) => (
  <div style={{ padding: '0 4px' }}>
    {review.status === 'AI_REVIEWING' && (
      <div style={styles.aiLoading}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
        <p style={{ color: '#6366f1', fontWeight: 600 }}>Claude is reviewing your code...</p>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>This usually takes 15-30 seconds</p>
      </div>
    )}

    {review.aiResult && (
      <div style={styles.aiSummaryCard}>
        <h4 style={styles.aiSummaryTitle}>📋 AI Summary</h4>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{review.aiResult.summary}</p>
        <div style={styles.aiStats}>
          <div style={styles.aiStat}><span style={{ color: '#ef4444', fontSize: 18 }}>🐛</span><span style={{ color: '#f1f5f9' }}>{review.aiResult.bugCount}</span><span style={{ color: '#64748b', fontSize: 12 }}>Bugs</span></div>
          <div style={styles.aiStat}><span style={{ color: '#f59e0b', fontSize: 18 }}>🔒</span><span style={{ color: '#f1f5f9' }}>{review.aiResult.securityIssueCount}</span><span style={{ color: '#64748b', fontSize: 12 }}>Security</span></div>
          <div style={styles.aiStat}><span style={{ color: '#10b981', fontSize: 18 }}>✅</span><span style={{ color: '#f1f5f9' }}>{review.aiResult.bestPracticeCount}</span><span style={{ color: '#64748b', fontSize: 12 }}>Best Practice</span></div>
        </div>
      </div>
    )}

    {aiComments.map((c) => <CommentCard key={c.id} comment={c} />)}

    {!review.aiResult && review.status !== 'AI_REVIEWING' && (
      <div style={styles.noAi}>
        <p style={{ color: '#64748b' }}>No AI review yet. Click "🤖 Re-run AI" to start.</p>
      </div>
    )}
  </div>
);

const HumanCommentsPanel: React.FC<{ humanComments: CommentInfo[] }> = ({ humanComments }) => (
  <div style={{ padding: '0 4px' }}>
    {humanComments.length === 0 ? (
      <div style={styles.noAi}><p style={{ color: '#64748b' }}>No team comments yet. Be the first!</p></div>
    ) : (
      humanComments.map((c) => <CommentCard key={c.id} comment={c} />)
    )}
  </div>
);

const CommentCard: React.FC<{ comment: CommentInfo }> = ({ comment }) => (
  <div style={{ ...styles.commentCard, borderLeft: `3px solid ${commentTypeColors[comment.type] || '#6366f1'}` }}>
    <div style={styles.commentHeader}>
      <span style={{ ...styles.commentTypeBadge, color: commentTypeColors[comment.type] }}>
        {commentTypeLabels[comment.type] || comment.type}
      </span>
      {comment.severity && (
        <span style={{ ...styles.severityBadge, color: severityColors[comment.severity] }}>
          {comment.severity}
        </span>
      )}
      {comment.lineNumber && <span style={styles.lineNumBadge}>Line {comment.lineNumber}</span>}
    </div>
    <p style={styles.commentContent}>{comment.content}</p>
    <div style={styles.commentFooter}>
      {comment.author && <span style={styles.commentAuthor}>👤 {comment.author.username}</span>}
      <span style={styles.commentTime}>{new Date(comment.createdAt).toLocaleString()}</span>
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '100%', padding: '24px 32px', minHeight: 'calc(100vh - 60px)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  headerLeft: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn: { background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' },
  headerMeta: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  langBadge: { background: '#1e3a5f', color: '#7dd3fc', fontSize: 11, padding: '3px 8px', borderRadius: 4 },
  statusBadge: { fontSize: 13, fontWeight: 500 },
  onlineBadge: { fontSize: 12, color: '#10b981' },
  title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 },
  description: { color: '#64748b', fontSize: 14 },
  scoreCircle: { textAlign: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '12px 20px' },
  scoreNum: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  scoreLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },
  aiBtn: { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 'calc(100vh - 200px)' },
  editorPanel: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  panelHeader: { padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: '#94a3b8', fontSize: 14, fontWeight: 500 },
  lineIndicator: { color: '#6366f1', fontSize: 12 },
  editorWrapper: { flex: 1 },
  rightPanel: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs: { display: 'flex', borderBottom: '1px solid #334155', flexShrink: 0 },
  tab: { flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  activeTab: { color: '#6366f1', borderBottom: '2px solid #6366f1' },
  panelScroll: { flex: 1, overflowY: 'auto', padding: 12 },
  aiLoading: { textAlign: 'center', padding: 32 },
  aiSummaryCard: { background: '#0f172a', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #1e3a5f' },
  aiSummaryTitle: { color: '#7dd3fc', fontSize: 14, fontWeight: 600, marginBottom: 8 },
  aiStats: { display: 'flex', gap: 16, marginTop: 12 },
  aiStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  noAi: { textAlign: 'center', padding: 40 },
  commentCard: { background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 10 },
  commentHeader: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  commentTypeBadge: { fontSize: 12, fontWeight: 600 },
  severityBadge: { fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 },
  lineNumBadge: { fontSize: 11, color: '#64748b', background: '#1e293b', padding: '1px 6px', borderRadius: 4 },
  commentContent: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, marginBottom: 8 },
  commentFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { color: '#6366f1', fontSize: 12 },
  commentTime: { color: '#475569', fontSize: 11 },
  commentForm: { borderTop: '1px solid #334155', padding: 12, flexShrink: 0 },
  lineTag: { display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', fontSize: 12, marginBottom: 8 },
  clearLine: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 0 },
  commentInput: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  commentBtn: { width: '100%', marginTop: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};

export default ReviewDetail;
