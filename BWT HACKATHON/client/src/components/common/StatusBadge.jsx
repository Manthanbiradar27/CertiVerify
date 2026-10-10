import { computeStatus } from '../../utils/helpers';

const STATUS_CONFIG = {
  VALID:     { label: 'Valid',     className: 'badge-valid',    icon: '✓' },
  REVOKED:   { label: 'Revoked',   className: 'badge-revoked',  icon: '✕' },
  EXPIRED:   { label: 'Expired',   className: 'badge-expired',  icon: '⏱' },
  PENDING:   { label: 'Pending',   className: 'badge-pending',  icon: '○' },
  active:    { label: 'Active',    className: 'badge-active',   icon: '●' },
  suspended: { label: 'Suspended', className: 'badge-suspended',icon: '⏸' },
};

/**
 * Badge showing certificate or account status.
 * Pass `cert` to auto-compute status, or `status` to show directly.
 */
export default function StatusBadge({ cert, status }) {
  const s = status || (cert ? computeStatus(cert) : 'VALID');
  const config = STATUS_CONFIG[s] || { label: s, className: 'badge-pending', icon: '?' };

  return (
    <span className={`badge ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
}
