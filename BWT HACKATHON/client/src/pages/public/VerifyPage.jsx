import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { publicAPI } from '../../api';
import { formatDate } from '../../utils/helpers';

const STATUS_CONFIG = {
  VALID:     { icon: '✅', color: 'var(--color-success)', cls: 'valid',     heading: 'Certificate Verified' },
  REVOKED:   { icon: '❌', color: 'var(--color-danger)',  cls: 'revoked',   heading: 'Certificate Revoked' },
  EXPIRED:   { icon: '⏰', color: 'var(--color-warning)', cls: 'expired',   heading: 'Certificate Expired' },
  NOT_FOUND: { icon: '🔍', color: 'var(--color-text-muted)', cls: 'not-found', heading: 'Not Found' },
};

function VerifyResult({ result }) {
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.NOT_FOUND;
  return (
    <div className={`verify-result ${cfg.cls}`} style={{ marginTop: '24px' }}>
      <div className="verify-result-icon">{cfg.icon}</div>
      <h2 style={{ color: cfg.color }}>{cfg.heading}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>{result.message}</p>

      {result.status !== 'NOT_FOUND' && (
        <div className="verify-details">
          {[
            ['Certificate ID', result.certificateId],
            ['Recipient Name', result.recipientName],
            ['Issued By', result.issuingOrganization],
            ['Certificate Title', result.title],
            ['Issue Date', formatDate(result.issueDate)],
            ['Valid Until', result.expiryDate ? formatDate(result.expiryDate) : 'No Expiry'],
            result.status === 'REVOKED' && ['Revoked On', formatDate(result.revokedAt)],
            result.status === 'REVOKED' && result.revocationReason && ['Revocation Reason', result.revocationReason],
          ]
            .filter(Boolean)
            .map(([label, value]) => (
              <div className="verify-detail-row" key={label}>
                <span className="label">{label}</span>
                <span className="value">{value || 'N/A'}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  const { publicId: paramId } = useParams();
  const navigate = useNavigate();
  const [inputId, setInputId] = useState(paramId || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (id) => {
    const certId = (id || inputId).trim();
    if (!certId) { setError('Please enter a certificate ID.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await publicAPI.verify(certId);
      setResult(res.data.result);
      // Update URL without navigation so it's shareable
      navigate(`/verify/${certId}`, { replace: true });
    } catch {
      setError('Verification service unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if ID comes from URL param
  useEffect(() => {
    if (paramId) handleVerify(paramId);
  }, []); // eslint-disable-line

  return (
    <div>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 64px)', padding: '60px 24px', background: 'radial-gradient(ellipse at top, #1a1a30 0%, var(--color-bg) 60%)' }}>
        <div className="verify-card">
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Verify Certificate</h1>
            <p>Enter a certificate ID to check its current authenticity and status.</p>
          </div>

          <div className="card">
            <div className="form-group">
              <label className="form-label" htmlFor="certId">Certificate ID</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="certId"
                  type="text"
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="e.g. aB3xK9mNpQ2w"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleVerify()}
                  disabled={loading}
                  id="verify-btn"
                >
                  {loading ? <span className="spinner" /> : 'Verify'}
                </button>
              </div>
              {error && <span className="form-error">{error}</span>}
              <span className="form-hint">The certificate ID can be found on the certificate document or scanned via QR code.</span>
            </div>

            {result && <VerifyResult result={result} />}
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
            Authenticity is always verified against live database records. QR code scanning links directly to this page.
          </p>
        </div>
      </div>
    </div>
  );
}
