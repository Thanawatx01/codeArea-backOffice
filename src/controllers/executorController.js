const axios = require('axios');
const https = require('https');

const EXECUTOR_TYPE = process.env.EXECUTOR_TYPE || 'piston';
const EXECUTOR_URL = String(process.env.EXECUTOR_URL || process.env.PISTON_URL || 'http://localhost:2000').replace(/\/$/, '');

// Create axios instance with HTTPS agent that ignores self-signed certs for development
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const execute = async (req, res, next) => {
  try {
    const { language, version, files, stdin, language_id, source_code } = req.body;

    if (EXECUTOR_TYPE === 'piston') {
      // Piston execution
      const payload = {
        language: language,
        version: version || '*',
        files: files || [{ name: 'main', content: source_code }],
        stdin: stdin || ''
      };
      
      const pistonUrl = new URL('/api/v2/execute', EXECUTOR_URL).toString();
      const response = await axiosInstance.post(pistonUrl, payload);
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

      // In a real Judge0 proxy, we might need to handle polling or use wait=true
      const wait = req.query.wait === 'true';
      const response = await axiosInstance.post(`${EXECUTOR_URL}/submissions?base64_encoded=false&wait=${wait}`, payload);
      
      // If not waiting, we need to handle the token. 
      // For now, let's also proxy the GET /submissions/:token if needed.
      return res.json(response.data);
    }
  } catch (error) {
    const errMsg = error.message || String(error);
    console.error('Executor Proxy Error:', errMsg, '| code:', error.code);

    // Forward HTTP-level errors from the upstream executor (e.g. 400 unknown runtime)
    if (error.response) {
      const upstreamMsg = error.response.data?.message || JSON.stringify(error.response.data);
      console.error(`Upstream executor responded ${error.response.status}: ${upstreamMsg}`);
      return res.status(error.response.status).json({
        error: upstreamMsg,
        upstream_status: error.response.status,
      });
    }

    // Network-level failures
    if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: `Executor service is not reachable (connection refused). Is Piston running?` });
    }
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return res.status(502).json({ error: `Executor service hostname could not be resolved: ${EXECUTOR_URL}` });
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: `Executor service timed out.` });
    }

    res.status(500).json({ error: `Failed to connect to executor service: ${errMsg}` });
  }
};

const getJudge0Result = async (req, res) => {
  try {
    const { token } = req.params;
    const response = await axiosInstance.get(`${EXECUTOR_URL}/submissions/${token}?base64_encoded=false`);
    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Failed to get result from Judge0' });
  }
};

module.exports = { execute, getJudge0Result };
