import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isRevokedFilter, setIsRevokedFilter] = useState('');

  const fetchCertificates = async (currentPage = 1, revokedVal = isRevokedFilter) => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 15 };
      if (revokedVal !== '') params.isRevoked = revokedVal;

      const res = await adminAPI.listCertificates(params);
      if (res.data?.success) {
        setCerts(res.data.certificates || []);
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
    fetchCertificates(1, isRevokedFilter);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>All Platform Certificates</h2>
        <p>Global view of all credentials across every issuer organization.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="search-bar">
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={isRevokedFilter}
            onChange={(e) => {
              setIsRevokedFilter(e.target.value);
              fetchCertificates(1, e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="false">Active / Valid</option>
            <option value="true">Revoked</option>
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> records
          </div>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : certs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <h3>No certificates found</h3>
            <p>No certificates exist or match the selected filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title / Public ID</th>
                  <th>Issuer Organization</th>
                  <th>Recipient</th>
                  <th>Issued Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Verify</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((cert) => (
                  <tr key={cert._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cert.title}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>
                        {cert.publicId}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{cert.organization?.name || 'Unknown Org'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                        {cert.organization?.email}
                      </div>
                    </td>
                    <td>{cert.recipient?.name || 'Unknown Recipient'}</td>
                    <td>{formatDate(cert.issueDate)}</td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/verify/${cert.publicId}`}
                        target="_blank"
                        className="btn btn-ghost btn-sm"
                      >
                        Verify ↗
                      </Link>
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
              onClick={() => fetchCertificates(page - 1, isRevokedFilter)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => fetchCertificates(page + 1, isRevokedFilter)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
