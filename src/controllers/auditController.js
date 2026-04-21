const { from, TABLE_NAMES, supabaseAdmin } = require('../models/index');

/**
 * Get audit logs with pagination and filters
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action_type, 
      user_id, 
      search 
    } = req.query;

    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + parseInt(limit) - 1;

    let query = from(TABLE_NAMES.AUDIT_LOGS)
      .select(`
        *,
        users!audit_logs_user_id_fkey (
          id,
          display_name,
          email
        )
      `, { count: 'exact' });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (search) {
      query = query.or(`action_details->>payload.ilike.%${search}%,ip_address.ilike.%${search}%,action_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        total_pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * Get distinct action types for filter dropdown
 */
exports.getActionTypes = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_distinct_audit_action_types');

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await from(TABLE_NAMES.AUDIT_LOGS)
        .select('action_type');
      
      if (fallbackError) throw fallbackError;
      
      const distinctTypes = [...new Set(fallbackData.map(item => item.action_type))];
      return res.status(200).json({ ok: true, data: distinctTypes });
    }

    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('Error fetching action types:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
