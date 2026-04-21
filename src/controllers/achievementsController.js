const { from, TABLE_NAMES } = require('../models/index');

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
    const { error } = await from(TABLE_NAMES.ACHIEVEMENTS)
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

module.exports = { list, create, update, delete: deleteAchievement };
