import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orgAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentCerts, setRecentCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await orgAPI.getDashboard();
      if (res.data?.success) {
        setStats(res.data.stats);
        setRecentCerts(res.data.recentCertificates || []);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Organization Dashboard</h2>
          <p>Monitor your issued certificates, recipients, and security compliance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/recipients" className="btn btn-secondary">
            + Manage Recipients
          </Link>
          <Link to="/certificates/issue" className="btn btn-primary">
            ✚ Issue New Certificate
          </Link>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Certificates</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-text)' }}>
            {stats?.totalCertificates ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-h)' }}>Total records in ledger</div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid & Active</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-success)' }}>
            {stats?.validCertificates ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Verified & public-accessible</div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revoked</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-danger)' }}>
            {stats?.revokedCertificates ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Marked invalid with reason</div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Recipients</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-info)' }}>
            {stats?.totalRecipients ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Registered students/candidates</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div>
            <h3>Recent Certificates</h3>
            <p style={{ fontSize: '0.85rem' }}>The latest certificates issued by your organization</p>
          </div>
          <Link to="/certificates" className="btn btn-ghost btn-sm">
            View All →
          </Link>
        </div>

        {recentCerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <h3>No certificates issued yet</h3>
            <p>Issue your first digital certificate with cryptographic verification.</p>
            <Link to="/certificates/issue" className="btn btn-primary btn-sm">
              Issue Certificate
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Certificate Title</th>
                  <th>Recipient</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCerts.map((cert) => (
                  <tr key={cert._id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{cert.title}</span>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>
                        {cert.publicId}
                      </div>
                    </td>
                    <td>{cert.recipient?.name || 'Unknown'}</td>
                    <td>{formatDate(cert.issueDate)}</td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td>
                      <Link to={`/verify/${cert.publicId}`} target="_blank" className="btn btn-ghost btn-sm" title="View Public Verification">
                        Verify ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
