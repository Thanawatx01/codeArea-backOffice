const axios = require('axios');

const EXECUTOR_TYPE = process.env.EXECUTOR_TYPE || 'piston';
const EXECUTOR_URL = process.env.EXECUTOR_URL || 'http://localhost:5050';

const execute = async (req, res, next) => {
  try {
    const { language, version, files, stdin, language_id, source_code } = req.body;

    if (EXECUTOR_TYPE === 'piston') {
      // Piston execution
      const payload = {
        language: language,
        version: version || '*',
        files: files || [{ content: source_code }],
        stdin: stdin
      };
      
      const response = await axios.post(`${EXECUTOR_URL}/api/v2/execute`, payload);
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
      const response = await axios.post(`${EXECUTOR_URL}/submissions?base64_encoded=false&wait=${wait}`, payload);
      
      // If not waiting, we need to handle the token. 
      // For now, let's also proxy the GET /submissions/:token if needed.
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
    const response = await axios.get(`${EXECUTOR_URL}/submissions/${token}?base64_encoded=false`);
    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Failed to get result from Judge0' });
  }
};

module.exports = { execute, getJudge0Result };
