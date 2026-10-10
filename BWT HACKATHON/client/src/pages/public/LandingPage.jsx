import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';

const features = [
  { icon: '🔐', title: 'Cryptographically Secured', desc: 'Every certificate gets a unique, server-generated ID. Authenticity is always verified against our live database.' },
  { icon: '📱', title: 'QR Code Verification', desc: 'Each certificate includes a QR code linking directly to the live verification page — verifiable by anyone, anywhere.' },
  { icon: '⚡', title: 'Instant Verification', desc: 'Verify any certificate in seconds. No account required. Just enter the certificate ID or scan the QR code.' },
  { icon: '🏛', title: 'Organization Managed', desc: 'Authorized organizations issue, manage, and revoke certificates. Admins ensure platform integrity.' },
  { icon: '📊', title: 'Full Audit Trail', desc: 'Every issuance, revocation, and verification is logged for accountability and compliance.' },
  { icon: '🛡', title: 'Revocation in Real Time', desc: 'Revoked certificates immediately show as invalid in public verification — no stale cached results.' },
];

export default function LandingPage() {
  return (
    <div>
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <div className="hero-badge">🔒 Trusted Certificate Verification</div>
          <h1>Issue & Verify Digital Certificates With Confidence</h1>
          <p>
            CertiVerify is a secure platform for organizations to issue verifiable digital certificates
            and for anyone to instantly check their authenticity — with no account required.
          </p>
          <div className="hero-actions">
            <Link to="/verify" className="btn btn-primary btn-xl">🔍 Verify a Certificate</Link>
            <Link to="/register" className="btn btn-secondary btn-xl">Get Started Free →</Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '32px 0', background: 'var(--color-surface)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
            {[['Instant', 'Verification'], ['Zero', 'Account Needed'], ['100%', 'Server Verified'], ['Real-time', 'Revocation']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)' }}>{v}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <h2>Why CertiVerify?</h2>
            <p style={{ marginTop: '12px', maxWidth: '500px', margin: '12px auto 0' }}>
              Built on security-first principles so certificates mean something.
            </p>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p style={{ marginTop: '8px', fontSize: '0.875rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 0', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
        <div className="container text-center">
          <h2>Ready to issue your first certificate?</h2>
          <p style={{ marginTop: '12px', marginBottom: '32px' }}>Register your organization and start issuing verifiable digital credentials today.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-xl">Register Organization</Link>
            <Link to="/verify" className="btn btn-secondary btn-xl">Verify a Certificate</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
          © 2025 CertiVerify. Authenticity verified on-chain against live database records.
        </p>
      </footer>
    </div>
  );
}
