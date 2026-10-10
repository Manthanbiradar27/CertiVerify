import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrgs = async (currentPage = 1, currentSearch = search, currentStatus = statusFilter) => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 15 };
      if (currentSearch) params.search = currentSearch;
      if (currentStatus) params.status = currentStatus;

      const res = await adminAPI.listOrgs(params);
      if (res.data?.success) {
        setOrgs(res.data.organizations || []);
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
    fetchOrgs(1, search, statusFilter);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrgs(1, search, statusFilter);
  };

  const handleStatusToggle = async (org) => {
    const nextStatus = org.status === 'active' ? 'suspended' : 'active';
    const actionVerb = nextStatus === 'active' ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionVerb} "${org.name}"?`)) {
      return;
    }

    try {
      await adminAPI.setOrgStatus(org._id, nextStatus);
      toast.success(`Organization ${nextStatus === 'active' ? 'activated' : 'suspended'}`);
      fetchOrgs(page, search, statusFilter);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>Organizations Governance</h2>
        <p>Review registered institutions and control issuing privileges.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by organization name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchOrgs(1, search, e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Total: <strong>{total}</strong> institutions
          </div>
        </form>

        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : orgs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏛</div>
            <h3>No organizations found</h3>
            <p>No institutions match your search criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Contact Email</th>
                  <th>Website / Details</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{org.name}</div>
                      {org.address && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                          📍 {org.address}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{org.email}</td>
                    <td>
                      {org.website ? (
                        <a
                          href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.85rem' }}
                        >
                          {org.website} ↗
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td>{formatDate(org.createdAt)}</td>
                    <td>
                      <span className={`badge ${org.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>
                        {org.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${org.status === 'active' ? 'btn-ghost' : 'btn-secondary'}`}
                        style={{ color: org.status === 'active' ? 'var(--color-danger)' : 'var(--color-success)' }}
                        onClick={() => handleStatusToggle(org)}
                      >
                        {org.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
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
              onClick={() => fetchOrgs(page - 1, search, statusFilter)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => fetchOrgs(page + 1, search, statusFilter)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
