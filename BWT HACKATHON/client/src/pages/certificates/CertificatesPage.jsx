import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { certificatesAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate, getErrorMessage, downloadBlob, copyToClipboard } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // QR Modal
  const [qrModal, setQrModal] = useState({ show: false, qrDataUrl: '', publicId: '', certTitle: '' });
  // Revoke Modal
  const [revokeModal, setRevokeModal] = useState({ show: false, certId: '', title: '', reason: '' });
  const [revoking, setRevoking] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async (currentPage = 1, currentSearch = search, currentStatus = statusFilter) => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 10 };
      if (currentSearch) params.search = currentSearch;
      if (currentStatus) params.status = currentStatus;

      const res = await certificatesAPI.list(params);
      if (res.data?.success) {
        setCertificates(res.data.certificates || []);
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
    fetchCertificates(1, search, statusFilter);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCertificates(1, search, statusFilter);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    fetchCertificates(1, search, newStatus);
  };

  const handleShowQR = async (cert) => {
    try {
      const res = await certificatesAPI.getQR(cert._id);
      if (res.data?.success) {
        setQrModal({
          show: true,
          qrDataUrl: res.data.qrCode,
          publicId: cert.publicId,
          certTitle: cert.title,
        });
      }
    } catch (err) {
      toast.error('Failed to load QR code: ' + getErrorMessage(err));
    }
  };

  const handleDownloadPDF = async (cert) => {
    try {
      setDownloadingId(cert._id);
      const res = await certificatesAPI.download(cert._id);
      downloadBlob(res.data, `${cert.publicId}-${cert.recipient?.name || 'certificate'}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (err) {
      toast.error('Failed to download PDF: ' + getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenRevoke = (cert) => {
    setRevokeModal({
      show: true,
      certId: cert._id,
      title: cert.title,
      reason: '',
    });
  };

  const handleConfirmRevoke = async (e) => {
    e.preventDefault();
    if (!revokeModal.reason.trim()) {
      toast.error('A revocation reason is required for security audit trail.');
      return;
    }
    try {
      setRevoking(true);
      await certificatesAPI.revoke(revokeModal.certId, { reason: revokeModal.reason.trim() });
      toast.success('Certificate marked as revoked');
      setRevokeModal({ show: false, certId: '', title: '', reason: '' });
      fetchCertificates(page, search, statusFilter);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Certificates Ledger</h2>
          <p>View, verify, download, and manage the lifecycle of issued credentials.</p>
        </div>
        <Link to="/certificates/issue" className="btn btn-primary">
          ✚ Issue New Certificate
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by title, public ID, or recipient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
          {(search || statusFilter) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                fetchCertificates(1, '', '');
              }}
            >
              Reset
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> records
          </div>
        </form>

        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : certificates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <h3>No certificates found</h3>
            <p>Issue your first certificate or adjust your filter query.</p>
            <Link to="/certificates/issue" className="btn btn-primary btn-sm">
              Issue Certificate
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Certificate / ID</th>
                  <th>Recipient</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cert.title}</div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {cert.publicId}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0 4px', fontSize: '0.7rem' }}
                          onClick={() => {
                            copyToClipboard(cert.publicId);
                            toast.success('ID copied to clipboard');
                          }}
                          title="Copy Public ID"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td>
                      <div>{cert.recipient?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                        {cert.recipient?.email}
                      </div>
                    </td>
                    <td>{formatDate(cert.issueDate)}</td>
                    <td>{cert.expiryDate ? formatDate(cert.expiryDate) : 'Lifetime'}</td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2 justify-end" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/verify/${cert.publicId}`}
                          target="_blank"
                          className="btn btn-secondary btn-sm"
                          title="Open public verification page"
                        >
                          Verify ↗
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleShowQR(cert)}
                          title="View QR Code"
                        >
                          QR
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={downloadingId === cert._id}
                          onClick={() => handleDownloadPDF(cert)}
                          title="Download PDF"
                        >
                          {downloadingId === cert._id ? '...' : 'PDF'}
                        </button>
                        {!cert.isRevoked && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleOpenRevoke(cert)}
                            title="Revoke certificate"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
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
              onClick={() => fetchCertificates(page - 1, search, statusFilter)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => fetchCertificates(page + 1, search, statusFilter)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModal.show && (
        <div className="modal-overlay" onClick={() => setQrModal({ ...qrModal, show: false })}>
          <div className="modal" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Certificate QR Code</h3>
            <p className="modal-desc" style={{ marginBottom: '16px' }}>
              {qrModal.certTitle}
            </p>

            <div
              style={{
                background: '#ffffff',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block',
                margin: '0 auto 16px',
              }}
            >
              <img
                src={qrModal.qrDataUrl}
                alt="Verification QR Code"
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
                marginBottom: '20px',
                wordBreak: 'break-all',
              }}
            >
              ID: {qrModal.publicId}
            </div>

            <div className="flex gap-2 justify-center">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const verifyUrl = `${window.location.origin}/verify/${qrModal.publicId}`;
                  copyToClipboard(verifyUrl);
                  toast.success('Verification URL copied!');
                }}
              >
                Copy Public URL
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setQrModal({ ...qrModal, show: false })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {revokeModal.show && (
        <div className="modal-overlay" onClick={() => setRevokeModal({ ...revokeModal, show: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--color-danger)' }}>
              Revoke Certificate
            </h3>
            <p className="modal-desc">
              You are about to revoke <strong>{revokeModal.title}</strong>. Once revoked, any public verification attempts will permanently flag this credential as invalid.
            </p>

            <form onSubmit={handleConfirmRevoke} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Revocation Reason *</label>
                <textarea
                  className="form-input"
                  required
                  rows="3"
                  placeholder="e.g. Credential issued in error, academic integrity infraction, course incomplete..."
                  value={revokeModal.reason}
                  onChange={(e) => setRevokeModal({ ...revokeModal, reason: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setRevokeModal({ ...revokeModal, show: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={revoking}>
                  {revoking ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
