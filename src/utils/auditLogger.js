const { from, TABLE_NAMES } = require('../models/index');

/**
 * Logs an action to the audit_logs table.
 * @param {Object} params
 * @param {number|null} params.userId - The ID of the user performing the action.
 * @param {string} params.actionType - Type of action (e.g., 'SYSTEM_CONFIG', 'SUBMISSION').
 * @param {Object} [params.details] - Additional details about the action.
 * @param {string} [params.ip] - IP address of the user.
 * @param {string} [params.userAgent] - User agent string.
 */
const logAudit = async ({ userId, actionType, details = {}, ip, userAgent }) => {
  try {
    const { error } = await from(TABLE_NAMES.AUDIT_LOGS).insert([{
      user_id: userId,
      action_type: actionType,
      action_details: details,
      ip_address: ip,
      user_agent: userAgent
    }]);

    if (error) {
      console.error('[AuditLogger] Error inserting log:', error);
    }
  } catch (err) {
    console.error('[AuditLogger] Fatal error:', err);
  }
};

module.exports = { logAudit };
