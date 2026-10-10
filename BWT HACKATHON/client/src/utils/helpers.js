/**
 * Extract a user-friendly error message from an Axios error response.
 */
export const getErrorMessage = (err) => {
  if (!err.response) return 'Network error. Please check your connection.';
  const { data, status } = err.response;
  if (data?.message) return data.message;
  if (status === 401) return 'Authentication required. Please log in.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'Resource not found.';
  if (status === 429) return 'Too many requests. Please wait and try again.';
  if (status >= 500) return 'Server error. Please try again later.';
  return 'An unexpected error occurred.';
};

/**
 * Format a date string or Date object for display.
 */
export const formatDate = (date, opts = {}) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
};

/**
 * Format a date with time.
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Map certificate status to CSS class suffix.
 */
export const statusClass = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace('_', '-');
};

/**
 * Compute certificate status client-side for display hints
 * (authoritative status always comes from the server).
 */
export const computeStatus = (cert) => {
  if (cert.isRevoked) return 'REVOKED';
  if (cert.expiryDate && new Date() > new Date(cert.expiryDate)) return 'EXPIRED';
  return 'VALID';
};

/**
 * Trigger a file download from a Blob response.
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard.
 */
export const copyToClipboard = async (text) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
};
