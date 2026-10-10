import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { recipientsAPI, certificatesAPI } from '../../api';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function IssueCertificatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRecipientId = searchParams.get('recipientId');

  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  const [formData, setFormData] = useState({
    recipientId: preselectedRecipientId || '',
    title: '',
    description: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  const [hasExpiry, setHasExpiry] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecipientsList();
  }, []);

  const fetchRecipientsList = async () => {
    try {
      setLoadingRecipients(true);
      const res = await recipientsAPI.list({ limit: 100 });
      if (res.data?.success) {
        const list = res.data.recipients || [];
        setRecipients(list);
        if (preselectedRecipientId && list.some((r) => r._id === preselectedRecipientId)) {
          setFormData((prev) => ({ ...prev, recipientId: preselectedRecipientId }));
        } else if (list.length > 0 && !formData.recipientId) {
          setFormData((prev) => ({ ...prev, recipientId: list[0]._id }));
        }
      }
    } catch (err) {
      toast.error('Failed to load recipients list: ' + getErrorMessage(err));
    } finally {
      setLoadingRecipients(false);
    }
  };

  const selectedRecipient = recipients.find((r) => r._id === formData.recipientId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipientId) {
      toast.error('Please select a recipient');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Certificate title is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        recipientId: formData.recipientId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        issueDate: formData.issueDate,
        expiryDate: hasExpiry && formData.expiryDate ? formData.expiryDate : null,
      };

      const res = await certificatesAPI.issue(payload);
      if (res.data?.success) {
        toast.success('Certificate issued successfully!');
        navigate('/certificates');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Issue Digital Certificate</h2>
          <p>Generate a tamper-evident digital credential with cryptographic verification ID.</p>
        </div>
        <Link to="/certificates" className="btn btn-secondary">
          ← Back to Certificates
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Form Card */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Certificate Details</h3>

          {recipients.length === 0 && !loadingRecipients ? (
            <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
              <div>
                <strong>No recipients found.</strong> You must add at least one recipient before issuing a certificate.
                <div style={{ marginTop: '8px' }}>
                  <Link to="/recipients" className="btn btn-primary btn-sm">
                    + Add Recipient Now
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Recipient *</label>
              {loadingRecipients ? (
                <div className="spinner"></div>
              ) : (
                <select
                  className="form-input"
                  required
                  value={formData.recipientId}
                  onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                >
                  <option value="">Select a recipient...</option>
                  {recipients.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Certificate Title *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Certified Full Stack Software Engineer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Achievement Summary</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="e.g. In recognition of completing 400 hours of coursework, micro-projects, and security assessments."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Issue Date *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                  <label className="form-label">Expiry Date</label>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasExpiry}
                      onChange={(e) => setHasExpiry(e.target.checked)}
                    />
                    Expires?
                  </label>
                </div>
                <input
                  type="date"
                  className="form-input"
                  disabled={!hasExpiry}
                  value={formData.expiryDate}
                  min={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={submitting || recipients.length === 0}
              >
                {submitting ? 'Generating Cryptographic Record...' : '🔒 Issue Verified Certificate'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="card" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border-light)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Live Credential Preview
            </span>
            <span className="badge badge-valid">PREVIEW</span>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #13131c 0%, #1a1a2e 100%)',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-primary-h)', marginBottom: '8px' }}>
              CertiVerify Credential
            </div>

            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '12px' }}>
              {formData.title || 'Certificate Title'}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              This certifies that
            </p>

            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f0ff', margin: '8px 0' }}>
              {selectedRecipient ? selectedRecipient.name : 'Recipient Name'}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '20px', minHeight: '40px' }}>
              {formData.description || 'Has successfully fulfilled all the requirements and demonstrated mastery of the subject matter.'}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '16px',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--color-text-subtle)' }}>Issue Date</div>
                <div style={{ fontWeight: 600 }}>{formatDate(formData.issueDate)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-subtle)' }}>Valid Until</div>
                <div style={{ fontWeight: 600 }}>{hasExpiry && formData.expiryDate ? formatDate(formData.expiryDate) : 'Lifetime'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-subtle)' }}>Security ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-h)' }}>CERT-PREVIEW</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
            ℹ Upon issuance, a unique verifiable QR code and server signature will be stamped on this certificate.
          </div>
        </div>
      </div>
    </div>
  );
}
