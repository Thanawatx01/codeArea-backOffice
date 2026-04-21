const axios = require('axios');
const { from } = require('../models');
const { logAudit } = require('../utils/auditLogger');

/**
 * Get AI configuration from the database
 */
async function getAIConfig() {
  const { data, error } = await from('system_settings')
    .select('value')
    .eq('key', 'ai_config')
    .single();
  
  if (error || !data) {
    // Fallback if not set in DB
    return { url: process.env.AI_CONNECTOR_URL || 'http://localhost:8080' };
  }
  return data.value;
}

/**
 * Proxy Hint requests (JSON)
 */
const proxyHint = async (req, res) => {
  try {
    const config = await getAIConfig();
    const targetUrl = config.url?.trim().replace(/\/$/, "");
    
    if (!targetUrl) {
      return res.status(400).json({ 
        error: "AI Connector URL is not configured. Please set it in the Dashboard." 
      });
    }
    
    // Set headers for streaming response (Hints are now streamed in v2)
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const response = await axios({
      method: 'post',
      url: `${targetUrl}/api/ai/hint`,
      data: req.body,
      responseType: 'stream',
      timeout: 30000
    });

    // Audit Log
    await logAudit({
      userId: req.user?.id,
      actionType: 'OLLAMA_REQ',
      details: { type: 'hint', body: req.body },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('AI Hint Stream Error:', err.message);
      if (!res.headersSent) {
        res.status(500).end('Streaming error');
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error('AI Proxy Hint Error:', error.message);
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      return res.status(status).json({
        error: 'Failed to reach AI Tutor service',
        details: error.message 
      });
    }
    res.end();
  }
};

/**
 * Proxy Compare requests (Streaming)
 */
const proxyCompare = async (req, res) => {
  try {
    const config = await getAIConfig();
    const targetUrl = config.url?.trim().replace(/\/$/, "");
    
    if (!targetUrl) {
      return res.status(400).json({ 
        error: "AI Connector URL is not configured. Please set it in the Dashboard." 
      });
    }
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const response = await axios({
      method: 'post',
      url: `${targetUrl}/api/ai/compare`,
      data: req.body,
      responseType: 'stream',
      timeout: 60000 // Comparison might take longer
    });

    // Audit Log
    await logAudit({
      userId: req.user?.id,
      actionType: 'OLLAMA_REQ',
      details: { type: 'compare', body: req.body },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Pipe the AI service stream directly to our response
    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('AI Stream Error:', err.message);
      if (!res.headersSent) {
        res.status(500).end('Streaming error');
      } else {
        res.end();
      }
    });

  } catch (error) {
    console.error('AI Proxy Compare Error:', error.message);
    // If headers were already sent (streaming started), we can't send a JSON error
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      return res.status(status).json({
        error: 'Failed to connect to AI Tutor service',
        details: error.message
      });
    }
    res.end();
  }
};


const proxyAnalyze = async (req, res) => {
  try {
    const config = await getAIConfig();
    const targetUrl = config.url?.trim().replace(/\/$/, "");
    
    if (!targetUrl) {
      return res.status(400).json({ 
        error: "AI Connector URL is not configured. Please set it in the Dashboard." 
      });
    }
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const response = await axios({
      method: 'post',
      url: `${targetUrl}/api/ai/analyze`,
      data: req.body,
      responseType: 'stream',
      timeout: 60000
    });

    // Audit Log
    await logAudit({
      userId: req.user?.id,
      actionType: 'OLLAMA_REQ',
      details: { type: 'analyze', body: req.body },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Pipe the AI service stream directly to our response
    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('AI Analyze Stream Error:', err.message);
      if (!res.headersSent) {
        res.status(500).end('Streaming error');
      } else {
        res.end();
      }
    });

  } catch (error) {
    console.error('AI Proxy Analyze Error:', error.message);
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      return res.status(status).json({
        error: 'Failed to connect to AI Tutor service',
        details: error.message
      });
    }
    res.end();
  }
};

module.exports = {
  proxyHint,
  proxyCompare,
  proxyAnalyze
};
