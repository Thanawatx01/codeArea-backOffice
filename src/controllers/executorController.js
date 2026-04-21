const axios = require('axios');
const { from } = require('../models/index');
const { logAudit } = require('../utils/auditLogger');

const EXECUTOR_TYPE = process.env.EXECUTOR_TYPE || 'piston';
const EXECUTOR_URL = process.env.EXECUTOR_URL || 'http://localhost:5050';

const execute = async (req, res, next) => {
  try {
    const { language, version, files, stdin, language_id, source_code, executor_url: bodyUrl } = req.body;
    
    let targetUrl = bodyUrl || EXECUTOR_URL;
    let targetType = EXECUTOR_TYPE;

    // Check DB for config if not explicitly provided in body
    if (!bodyUrl) {
      const { data } = await from('system_settings').select('value').eq('key', 'executor_config').single();
      if (data && data.value) {
        targetUrl = data.value.url || targetUrl;
        targetType = data.value.type || targetType;
      }
    }

    targetUrl = targetUrl.replace(/\/$/, "");

    if (targetType === 'piston') {
      // Piston execution
      const payload = {
        language: language,
        version: version || '*',
        files: files || [{ content: source_code }],
        stdin: stdin
      };
      
      const response = await axios.post(`${targetUrl}/api/v2/execute`, payload);
      
      // Audit Log
      await logAudit({
        userId: req.user?.id,
        actionType: 'PISTON_REQ',
        details: { language, version },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json(response.data);
    } else {
      // Judge0 execution
      const payload = {
        source_code: source_code,
        language_id: language_id,
        stdin: stdin,
        // Optional Judge0 specifics
        expected_output: req.body.expected_output,
        cpu_time_limit: req.body.cpu_time_limit,
        memory_limit: req.body.memory_limit,
      };

      const wait = req.query.wait === 'true';
      const response = await axios.post(`${targetUrl}/submissions?base64_encoded=false&wait=${wait}`, payload);
      
      // Audit Log
      await logAudit({
        userId: req.user?.id,
        actionType: 'JUDGE0_REQ',
        details: { language_id },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json(response.data);
    }
  } catch (error) {
    console.error('Executor Proxy Error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Failed to connect to executor service' });
  }
};

const getJudge0Result = async (req, res) => {
  try {
    const { token } = req.params;
    // For GETs, fallback to env since we can't easily pass body in GET.
    // If dynamic Judge0 is fully needed, frontend should pass ?executor_url=...
    const dynamicUrl = req.query.executor_url ? req.query.executor_url.replace(/\/$/, "") : EXECUTOR_URL;
    const response = await axios.get(`${dynamicUrl}/submissions/${token}?base64_encoded=false`);
    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Failed to get result from Judge0' });
  }
};

const testConnection = async (req, res) => {
  try {
    const { executor_url, type } = req.body;
    const targetUrl = (executor_url || EXECUTOR_URL).replace(/\/$/, "");
    
    let testPath = type === 'piston' ? '/api/v2/runtimes' : '/languages';
    const response = await axios.get(`${targetUrl}${testPath}`);
    
    return res.json({ success: true, message: 'Connection successful', data: response.data });
  } catch (error) {
    console.error('Executor Test Error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to connect', 
      details: error.message 
    });
  }
};

module.exports = { execute, getJudge0Result, testConnection };
