import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Organization name is required.';
    if (!form.email) errs.email = 'Email is required.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(form.password)) errs.password = 'Password must contain a number.';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Organization registered! Welcome to CertiVerify.');
      navigate('/dashboard');
    } catch (err) {
      // Extract server validation errors if available
      const data = err.response?.data;
      if (data?.errors?.length) {
        const serverErrs = {};
        data.errors.forEach((e) => { serverErrs[e.field] = e.message; });
        setFieldErrors(serverErrs);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <div className="auth-logo-icon">C</div>
          <span className="auth-logo-name">Certi<span>Verify</span></span>
        </div>

        <h1 className="auth-title">Register Organization</h1>
        <p className="auth-subtitle">Create an account to start issuing digital certificates</p>

        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}><span>⚠</span> {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Organization Name', id: 'name', type: 'text', placeholder: 'Acme University', autoComplete: 'organization' },
              { label: 'Email Address', id: 'email', type: 'email', placeholder: 'admin@org.com', autoComplete: 'email' },
              { label: 'Password', id: 'password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password', hint: 'Min 8 chars, 1 uppercase, 1 number' },
              { label: 'Confirm Password', id: 'confirm', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
            ].map(({ label, id, type, placeholder, autoComplete, hint }) => (
              <div className="form-group" key={id}>
                <label className="form-label" htmlFor={id}>{label}</label>
                <input
                  id={id}
                  name={id}
                  type={type}
                  className={`form-input ${fieldErrors[id] ? 'error' : ''}`}
                  placeholder={placeholder}
                  value={form[id]}
                  onChange={handleChange}
                  autoComplete={autoComplete}
                />
                {fieldErrors[id] && <span className="form-error">{fieldErrors[id]}</span>}
                {hint && !fieldErrors[id] && <span className="form-hint">{hint}</span>}
              </div>
            ))}

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} id="register-submit">
              {loading ? <><span className="spinner" /> Registering…</> : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
