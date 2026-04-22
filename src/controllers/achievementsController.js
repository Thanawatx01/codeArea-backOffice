const { from, TABLE_NAMES } = require('../models/index');
const { logAudit } = require('../utils/auditLogger');

const list = async (req, res) => {
  try {
    const { data, error } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .select('*, users!achievements_created_by_fkey(display_name), updater:users!achievements_updated_by_fkey(display_name)')
      .order('id', { ascending: true });

    if (error) throw error;
    const mapped = (data || []).map(item => { 
      const { users, updater, ...rest } = item; 
      return { 
        ...rest, 
        created_by_name: users?.display_name || "System", 
        updated_by_name: updater?.display_name || users?.display_name || "System" 
      }; 
    }); 
    res.status(200).json({ ok: true, data: mapped });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, icon, criteria_type, criteria_value, color } = req.body;
    const { data, error } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .insert([{ 
        name, description, icon, criteria_type, criteria_value, color,
        created_by: req.user.id 
      }])
      .select()
      .single();

    if (error) throw error;

    // Audit Log
    await logAudit({
      userId: req.user.id,
      actionType: 'ACHIEVEMENT_CREATE',
      details: { achievementId: data.id, name: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, criteria_type, criteria_value, color } = req.body;
    const { data, error } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .update({ 
        name, description, icon, criteria_type, criteria_value, color,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit Log
    await logAudit({
      userId: req.user.id,
      actionType: 'ACHIEVEMENT_UPDATE',
      details: { achievementId: id, name: name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const mapped = (data || []).map(item => { 
      const { users, updater, ...rest } = item; 
      return { 
        ...rest, 
        created_by_name: users?.display_name || "System", 
        updated_by_name: updater?.display_name || users?.display_name || "System" 
      }; 
    }); 
    res.status(200).json({ ok: true, data: mapped });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch before delete to log details
    const { data: target } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit Log
    await logAudit({
      userId: req.user.id,
      actionType: 'ACHIEVEMENT_DELETE',
      details: { achievementId: id, name: target?.name || 'Unknown' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

module.exports = { list, create, update, delete: deleteAchievement };

