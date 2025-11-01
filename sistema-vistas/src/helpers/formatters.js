/**
 * Formatters - Helper functions for data formatting in views
 */

/**
 * Format a number as currency (ARS)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseFloat(amount));
}

/**
 * Format a number as simple currency (for tests)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrencySimple(amount) {
  if (amount === null || amount === undefined) return '0.00';
  
  return parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
}

/**
 * Format a date and time for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted datetime string
 */
function formatDateTime(date) {
  if (!date) return '';
  
  // Asegurar que la fecha se interprete como UTC
  let dateObj;
  if (typeof date === 'string') {
    // Si es string sin 'Z', agregarlo para indicar UTC
    const dateStr = date.includes('Z') || date.includes('+') || date.includes('-') ? date : date + 'Z';
    dateObj = new Date(dateStr);
  } else {
    dateObj = new Date(date);
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
}

/**
 * Format a number with thousands separators
 * @param {number} number - Number to format
 * @returns {string} - Formatted number string
 */
function formatNumber(number) {
  if (number === null || number === undefined) return '0';
  
  return new Intl.NumberFormat('es-AR').format(parseFloat(number));
}

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Formatted percentage string
 */
function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  
  return (parseFloat(value)).toFixed(decimals) + '%';
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length (default: 50)
 * @returns {string} - Truncated text
 */
function truncateText(text, length = 50) {
  if (!text) return '';
  
  if (text.length <= length) return text;
  
  return text.substring(0, length) + '...';
}

/**
 * Get badge class for invoice status
 * @param {number} status - Status number
 * @returns {string} - Bootstrap badge class
 */
function getStatusBadgeClass(status) {
  const statusClasses = {
    1: 'bg-warning',      // Pendiente
    2: 'bg-info',         // Pagada Parcial
    3: 'bg-success',      // Pagada
    4: 'bg-primary',      // En Proceso
    5: 'bg-danger'        // Anulada
  };
  
  return statusClasses[status] || 'bg-secondary';
}

/**
 * Get status name from number
 * @param {number} status - Status number
 * @returns {string} - Status name
 */
function getStatusName(status) {
  const statusNames = {
    1: 'Pendiente',
    2: 'Pagada Parcial',
    3: 'Pagada',
    4: 'En Proceso',
    5: 'Anulada'
  };
  
  return statusNames[status] || 'Desconocido';
}

/**
 * Calculate days between dates
 * @param {Date|string} fromDate - Start date
 * @param {Date|string} toDate - End date (default: today)
 * @returns {number} - Number of days
 */
function daysBetween(fromDate, toDate = new Date()) {
  if (!fromDate) return 0;
  
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a date is overdue
 * @param {Date|string} dueDate - Due date to check
 * @returns {boolean} - True if overdue
 */
function isOverdue(dueDate) {
  if (!dueDate) return false;
  
  const due = new Date(dueDate);
  const today = new Date();
  
  return due < today;
}

/**
 * Get relative time (e.g., "hace 2 días")
 * @param {Date|string} date - Date to calculate from
 * @returns {string} - Relative time string
 */
function getRelativeTime(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffMinutes > 0) {
    return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else {
    return 'hace un momento';
  }
}

/**
 * Serialize object to query string
 * @param {Object} obj - Object to serialize
 * @returns {string} - Query string
 */
function serialize(obj) {
  if (!obj) return '';
  
  const params = new URLSearchParams();
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      params.append(key, obj[key]);
    }
  });
  
  return params.toString();
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  truncateText,
  getStatusBadgeClass,
  getStatusName,
  daysBetween,
  isOverdue,
  getRelativeTime,
  serialize
};
