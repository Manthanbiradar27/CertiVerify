import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await adminAPI.getAuditLogs({ page: currentPage, limit: 20 });
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotal(res.data.pagination?.total || 0);
        setPage(currentPage);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>System Audit Trail</h2>
        <p>Immutable log of administrative events, security changes, and credential lifecycles.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="search-bar">
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Tamper-evident system activity log & compliance trail
          </span>
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> log entries
          </div>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No audit records recorded yet</h3>
            <p>Platform security and lifecycle events will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(item.createdAt)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          background: 'var(--color-surface-2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {item.action}
                      </span>
                    </td>
                    <td>
                      {item.actor ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.actor.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                            {item.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-subtle)' }}>System / Anonymous</span>
                      )}
                    </td>
                    <td>
                      <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {item.targetType || '—'}
                      </span>
                      {item.targetId && (
                        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>
                          {item.targetId.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {item.ipAddress || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '300px', wordBreak: 'break-word', color: 'var(--color-text-muted)' }}>
                      {item.metadata ? JSON.stringify(item.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => fetchLogs(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
