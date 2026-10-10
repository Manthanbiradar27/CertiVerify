import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recipientsAPI } from '../../api';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', studentId: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchRecipients = async (currentPage = 1, searchQuery = '') => {
    try {
      setLoading(true);
      const res = await recipientsAPI.list({ page: currentPage, limit: 10, search: searchQuery });
      if (res.data?.success) {
        setRecipients(res.data.recipients || []);
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
    fetchRecipients(1, search);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecipients(1, search);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', studentId: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (rec) => {
    setEditingId(rec._id);
    setFormData({
      name: rec.name || '',
      email: rec.email || '',
      studentId: rec.studentId || '',
      notes: rec.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await recipientsAPI.update(editingId, formData);
        toast.success('Recipient updated successfully');
      } else {
        await recipientsAPI.create(formData);
        toast.success('Recipient registered successfully');
      }
      setShowModal(false);
      fetchRecipients(page, search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? Certificates linked to this recipient may still exist.`)) {
      return;
    }
    try {
      await recipientsAPI.delete(id);
      toast.success('Recipient removed');
      fetchRecipients(page, search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Recipients Directory</h2>
          <p>Register and manage candidates eligible for credential issuance.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          ✚ Add New Recipient
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search recipients by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                fetchRecipients(1, '');
              }}
            >
              Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> recipients
          </div>
        </form>

        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : recipients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No recipients found</h3>
            <p>Add candidate profiles before issuing certificates.</p>
            <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
              Add Recipient
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recipient Name</th>
                  <th>Email</th>
                  <th>Student / Identifier ID</th>
                  <th>Added On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((rec) => (
                  <tr key={rec._id}>
                    <td style={{ fontWeight: 600 }}>{rec.name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{rec.email}</td>
                    <td>
                      {rec.studentId ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{rec.studentId}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td>{formatDate(rec.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2 justify-end" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/certificates/issue?recipientId=${rec._id}`}
                          className="btn btn-secondary btn-sm"
                          title="Issue certificate for this recipient"
                        >
                          ✚ Issue Cert
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(rec)}
                          title="Edit recipient"
                        >
                          ✎ Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(rec._id, rec.name)}
                          title="Delete recipient"
                        >
                          ✕
                        </button>
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
              onClick={() => fetchRecipients(page - 1, search)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => fetchRecipients(page + 1, search)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Recipient Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingId ? 'Edit Recipient' : 'Add New Recipient'}</h3>
            <p className="modal-desc">
              {editingId
                ? 'Update candidate information and credentials.'
                : 'Enter the details of the student or participant.'}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="alex.morgan@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student / Candidate Identifier (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. STU-2024-8841"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Internal Notes (Optional)</label>
                <textarea
                  className="form-input"
                  placeholder="e.g. Batch 2024, Honors Program"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Recipient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
