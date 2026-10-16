// ==================== SHARED CERTIFICATE EXPIRY HELPERS ====================
// Used by exams.js (auto-issue on pass) and admin.js (force-pass)

function parseExpiryPeriod(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim();
  if (s === 'never' || s === '' || s === 'none' || s === 'lifetime') return null;
  const m = s.match(/(\d+)\s*(year|years|yr|yrs|y|month|months|mo|day|days|d)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit.startsWith('y')) return { years: n };
  if (unit.startsWith('mo') || unit.startsWith('month')) return { months: n };
  if (unit.startsWith('d')) return { days: n };
  return null;
}

function calculateExpiryDate(issuedAt, period) {
  if (!period) return null;
  const d = new Date(issuedAt);
  if (period.years) d.setFullYear(d.getFullYear() + period.years);
  if (period.months) d.setMonth(d.getMonth() + period.months);
  if (period.days) d.setDate(d.getDate() + period.days);
  return d;
}

module.exports = { parseExpiryPeriod, calculateExpiryDate };
