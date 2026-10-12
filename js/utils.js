(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRupiah(value) {
    if (value == null || value === '') return '-';
    return 'Rp ' + Number(value).toLocaleString('id-ID');
  }

  function formatNumber(value) {
    if (value == null || value === '') return '-';
    return Number(value).toLocaleString('id-ID');
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  global.Utils = {
    escapeHtml: escapeHtml,
    formatRupiah: formatRupiah,
    formatNumber: formatNumber,
    formatDate: formatDate
  };
})(window);
