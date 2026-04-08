const { from } = require('../models/index');

const getExecutorConfig = async (req, res) => {
  try {
    const { data, error } = await from('system_settings')
      .select('value')
      .eq('key', 'executor_config')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Settings Fetch Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถดึงการตั้งค่าได้' });
    }

    if (!data) {
      // Default fallback if not defined in DB
      return res.json({
        type: process.env.EXECUTOR_TYPE || 'piston',
        url: process.env.EXECUTOR_URL || 'http://localhost:5000/api/executor'
      });
    }

    return res.json(data.value);
  } catch (error) {
    console.error('Settings Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch executor config' });
  }
};

const updateExecutorConfig = async (req, res) => {
  try {
    const { type, url } = req.body;
    
    // Authorization Check: Must be admin (role 2)
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'Forbidden. Admins only.' });
    }

    const { error } = await from('system_settings')
      .upsert({
        key: 'executor_config',
        value: { type, url },
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('Settings Update Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถบันทึกการตั้งค่าได้', details: error.message });
    }

    return res.json({ success: true, message: 'บันทึกการตั้งค่าระบบเรียบร้อย' });
  } catch (error) {
    console.error('Settings Update Error:', error.message);
    res.status(500).json({ error: 'Failed to update executor config' });
  }
};

module.exports = { getExecutorConfig, updateExecutorConfig };
