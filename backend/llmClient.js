const axios = require('axios');
require('dotenv').config();

const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const USE_MOCK = process.env.LLM_MOCK === 'true';
let API_URL = process.env.LLM_API_URL;
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL || (PROVIDER === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

// If no explicit API URL provided, use sensible provider defaults
if (!API_URL && !USE_MOCK) {
  if (PROVIDER === 'groq') {
    API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  } else {
    API_URL = 'https://api.openai.com/v1/chat/completions';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock implementations for local development (no API key needed)
function mockModelA() {
  // Model A returns a Cypher query suggestion
  return JSON.stringify({
    cypher: 'MATCH (r:Register)-[:BELONGS_TO]->(s:Subsystem) WHERE s.name = $subsystemName RETURN r.name, r.address, r.description',
    params: { subsystemName: 'PowerManagement' },
    confidence_hint: 'high'
  });
}

function mockModelB() {
  // Model B returns a natural language answer
  return JSON.stringify({
    answer_text: 'The PowerManagement subsystem contains three registers: POWER_CTRL (0x100), THERMAL_MON (0x200), and VOLTAGE_REG (0x300).',
    bullets: [
      'POWER_CTRL (0x100): controls NVMe power gating',
      'THERMAL_MON (0x200): monitors temperature',
      'VOLTAGE_REG (0x300): regulates output voltage'
    ],
    provenance: ['Neo4j Knowledge Graph'],
    confidence: 'high'
  });
}

async function callLLM({ system, user, temperature = 0.0, max_tokens = 800 }) {
  if (USE_MOCK) {
    // eslint-disable-next-line no-console
    console.log('[MOCK LLM] Using mock mode for local development');
    if (system.includes('Text → Cypher') || user.includes('Schema')) {
      return mockModelA();
    }
    return mockModelB();
  }

  if (!API_KEY) throw new Error('LLM_API_KEY not set');

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature,
    max_tokens
  };

  const maxRetries = 3;
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const resp = await axios.post(API_URL, payload, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });

      const text = resp.data.choices?.[0]?.message?.content;
      if (!text) throw new Error('LLM returned no content');
      return text;

    } catch (err) {
      const status = err.response?.status;
      const respBody = err.response?.data;

      // If rate limited, honor Retry-After header when provided and retry with backoff
      if (status === 429 && attempt <= maxRetries) {
        const retryAfter = parseInt(err.response.headers?.['retry-after'] || '0', 10);
        const backoffMs = Math.max(1000 * Math.pow(2, attempt - 1), (retryAfter || 1) * 1000);
        // eslint-disable-next-line no-console
        console.warn(`LLM request rate-limited (429). Attempt ${attempt}/${maxRetries}. Retrying in ${backoffMs}ms.`);
        await sleep(backoffMs);
        continue;
      }

      // For other errors or exhausted retries, throw a clearer message including status and body
      let msg = err.message || 'LLM request failed';
      if (status) msg = `LLM request failed with status ${status}`;
      if (respBody) {
        try {
          msg += `: ${JSON.stringify(respBody)}`;
        } catch (e) {
          msg += `: (response body)`;
        }
      }
      const e = new Error(msg);
      e.original = err;
      throw e;
    }
  }
}

module.exports = { callLLM };
