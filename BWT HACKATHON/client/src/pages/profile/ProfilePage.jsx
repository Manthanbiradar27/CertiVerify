import { useState, useEffect } from 'react';
import { orgAPI, authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();

  // Profile Form
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    description: '',
    website: '',
    contactPhone: '',
    address: '',
    createdAt: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await orgAPI.getProfile();
      if (res.data?.success && res.data.organization) {
        const org = res.data.organization;
        setProfile({
          name: org.name || '',
          email: org.email || '',
          description: org.description || '',
          website: org.website || '',
          contactPhone: org.contactPhone || '',
          address: org.address || '',
          createdAt: org.createdAt || '',
        });
      }
    } catch (err) {
      toast.error('Failed to load profile: ' + getErrorMessage(err));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await orgAPI.updateProfile({
        name: profile.name,
        description: profile.description,
        website: profile.website,
        contactPhone: profile.contactPhone,
        address: profile.address,
      });
      toast.success('Organization profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPass(true);
      await authAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPass(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>Profile & Settings</h2>
        <p>Manage your organization details, verification identity, and security credentials.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Profile Card */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Organization Details</h3>

          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Organization Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Email (Read-Only)</label>
              <input
                type="email"
                disabled
                className="form-input"
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
                value={profile.email}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.edu"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-input"
                placeholder="+1 (555) 000-0000"
                value={profile.contactPhone}
                onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Mission</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Brief summary of your institution or training program..."
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address / Location</label>
              <input
                type="text"
                className="form-input"
                placeholder="City, State, Country"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Organization Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Account Security</h3>

          <div
            style={{
              padding: '16px',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
              fontSize: '0.85rem',
            }}
          >
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Role:</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
              <span className="badge badge-active">{user?.status || 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Member Since:</span>
              <span>{formatDate(profile.createdAt)}</span>
            </div>
          </div>

          <h4 style={{ marginBottom: '14px' }}>Change Password</h4>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                required
                className="form-input"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                className="form-input"
                placeholder="At least 8 characters"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                className="form-input"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-secondary" disabled={changingPass}>
                {changingPass ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
