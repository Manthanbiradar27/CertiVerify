import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getStats();
      if (res.data?.success) {
        setStats(res.data.stats);
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
          <h2>System Administration</h2>
          <p>Global oversight, organization verification, and platform security audit.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/organizations" className="btn btn-secondary">
            🏛 Organizations
          </Link>
          <Link to="/admin/audit" className="btn btn-primary">
            📋 Audit Logs
          </Link>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Organizations</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-text)' }}>
            {stats?.totalOrgs ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-h)' }}>
            {stats?.activeOrgs ?? 0} active, {stats?.suspendedOrgs ?? 0} suspended
          </div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Issued Certificates</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-info)' }}>
            {stats?.totalCerts ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Across all organizations</div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid Credentials</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-success)' }}>
            {stats?.validCerts ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Currently verifiable</div>
        </div>

        <div className="stat-card">
          <div className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revoked Credentials</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-danger)' }}>
            {stats?.revokedCerts ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Flagged as invalid</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>Organization Governance</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '20px' }}>
            Review registered institutions, grant or suspend issuing authority, and verify organizational credentials.
          </p>
          <Link to="/admin/organizations" className="btn btn-secondary w-full">
            Manage Organizations →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>Platform Certificates</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '20px' }}>
            Inspect all certificates across every tenant with cryptographic audit metadata and status logs.
          </p>
          <Link to="/admin/certificates" className="btn btn-secondary w-full">
            Inspect All Certificates →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>Immutable Audit Trail</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '20px' }}>
            Track every sensitive action, revocation event, account change, and IP address for compliance.
          </p>
          <Link to="/admin/audit" className="btn btn-secondary w-full">
            View Audit Log →
          </Link>
        </div>
      </div>
    </div>
  );
}
