const { from } = require('../models/index');
const axios = require('axios');

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
      // No config in DB yet — return empty so frontend falls back to its own defaults
      return res.json(null);
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

const deleteExecutorConfig = async (req, res) => {
  try {
    // Authorization Check: Must be admin (role 2)
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'Forbidden. Admins only.' });
    }

    const { error } = await from('system_settings')
      .delete()
      .eq('key', 'executor_config');

    if (error) {
      console.error('Settings Delete Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถลบการตั้งค่าได้', details: error.message });
    }

    return res.json({ success: true, message: 'ลบการตั้งค่าระบบเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Settings Delete Error:', error.message);
    res.status(500).json({ error: 'Failed to delete executor config' });
  }
};

const testAIConnector = async (req, res) => {
  try {
    const { url } = req.body;
    const targetUrl = url.replace(/\/$/, "");
    
    // Test the AI service root or a known endpoint
    const response = await axios.get(targetUrl + "/", { timeout: 5000 });
    
    if (response.status === 200 || response.status === 404) {
      return res.json({ success: true, message: 'Connected to AI Connector' });
    } else {
      throw new Error('AI Connector returned status: ' + response.status);
    }
  } catch (error) {
    console.error('AI Connector Test Error:', error.message, error.stack);
    res.status(error.response?.status || 500).json({ 
      success: false,
      message: 'Failed to connect to AI Connector', 
      details: error.message 
    });
  }
};

const getAIConfig = async (req, res) => {
  try {
    const { data, error } = await from('system_settings')
      .select('value')
      .eq('key', 'ai_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('AI Settings Fetch Error:', error.message, 'Code:', error.code);
      return res.status(500).json({ 
        message: 'ไม่สามารถดึงการตั้งค่า AI ได้', 
        details: error.message 
      });
    }

    if (!data) return res.json(null);
    return res.json(data.value);
  } catch (error) {
    console.error('AI Settings Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
};

const updateAIConfig = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'Forbidden. Admins only.' });
    }

    const { error } = await from('system_settings')
      .upsert({
        key: 'ai_config',
        value: { url },
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('AI Settings Update Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถบันทึกการตั้งค่า AI ได้', details: error.message });
    }

    return res.json({ success: true, message: 'บันทึกการตั้งค่า AI เรียบร้อย' });
  } catch (error) {
    console.error('AI Settings Update Handler Error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update AI config', details: error.message });
  }
};

const deleteAIConfig = async (req, res) => {
  try {
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'Forbidden. Admins only.' });
    }

    const { error } = await from('system_settings')
      .delete()
      .eq('key', 'ai_config');

    if (error) {
      console.error('AI Settings Delete Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถลบการตั้งค่า AI ได้', details: error.message });
    }

    return res.json({ success: true, message: 'ลบการตั้งค่า AI เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('AI Settings Delete Error:', error.message);
    res.status(500).json({ error: 'Failed to delete AI config' });
  }
};

const getOllamaConfig = async (req, res) => {
  try {
    const { data, error } = await from('system_settings')
      .select('value')
      .eq('key', 'ollama_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Ollama Settings Fetch Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถดึงการตั้งค่า Ollama ได้' });
    }

    if (!data) return res.json(null);
    return res.json(data.value);
  } catch (error) {
    console.error('Ollama Settings Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Ollama config' });
  }
};

const updateOllamaConfig = async (req, res) => {
  try {
    const { url, model } = req.body;
    
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'Forbidden. Admins only.' });
    }

    const { error } = await from('system_settings')
      .upsert({
        key: 'ollama_config',
        value: { url, model },
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('Ollama Settings Update Error:', error.message);
      return res.status(500).json({ message: 'ไม่สามารถบันทึกการตั้งค่า Ollama ได้', details: error.message });
    }

    return res.json({ success: true, message: 'บันทึกการตั้งค่า Ollama เรียบร้อย' });
  } catch (error) {
    console.error('Ollama Settings Update Error:', error.message);
    res.status(500).json({ error: 'Failed to update Ollama config' });
  }
};

const testOllama = async (req, res) => {
  try {
    const { url, model } = req.body;
    const targetUrl = url.replace(/\/$/, "");
    
    // Testing Ollama by asking for model tags or a tiny generation
    const response = await axios.post(`${targetUrl}/api/generate`, {
      model: model,
      prompt: "hi",
      stream: false
    }, { timeout: 30000 });
    
    if (response.status === 200) {
      return res.json({ success: true, message: 'Connected to model: ' + model });
    } else {
      throw new Error('Ollama returned status: ' + response.status);
    }
  } catch (error) {
    console.error('Ollama Test Error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false,
      message: 'Failed to connect to Ollama', 
      details: error.response?.data?.error || error.message 
    });
  }
};

const getOllamaModels = async (req, res) => {
  try {
    // 1. Get AI Connector URL from settings
    const { data: aiConfig, error: aiError } = await from('system_settings')
      .select('value')
      .eq('key', 'ai_config')
      .single();

    if (aiError || !aiConfig) {
      return res.status(404).json({ message: 'AI Connector is not configured' });
    }

    const aiUrl = aiConfig.value.url.replace(/\/$/, "");

    // 2. Call AI service /api/models
    const response = await axios.get(`${aiUrl}/api/models`, { timeout: 10000 });
    
    if (response.status === 200) {
      return res.json(response.data.models || []);
    } else {
      throw new Error('AI service returned status: ' + response.status);
    }
  } catch (error) {
    console.error('Fetch Ollama Models Error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch Ollama models from AI service', 
      details: error.message 
    });
  }
};

module.exports = { 
  getExecutorConfig, 
  updateExecutorConfig, 
  deleteExecutorConfig,
  getAIConfig,
  updateAIConfig,
  deleteAIConfig,
  testAIConnector,
  getOllamaConfig,
  updateOllamaConfig,
  testOllama,
  getOllamaModels
};
