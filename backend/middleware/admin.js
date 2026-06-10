const constants = require('../utils/constants');

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== constants.USER_ROLES.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = requireAdmin;
