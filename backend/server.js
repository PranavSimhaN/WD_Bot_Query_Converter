require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { callLLM } = require('./llmClient');
const { modelA_system, modelB_system } = require('./prompts');
const { validateAndSanitize } = require('./validator');
const { runReadQuery } = require('./neo4jClient');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

// health
app.get('/_health', (req, res) => res.json({ status: 'ok' }));

// optional metadata proxy (ask backend KG team to expose a schema endpoint)
app.get('/meta/schema', async (req, res) => {
  res.json({
    labels: ['Register', 'Subsystem', 'ASIC', 'Product', 'FirmwareFunction', 'API'],
    relationships: ['(Register)-[:BELONGS_TO]->(Subsystem)', '(FirmwareFunction)-[:CALLS]->(Register)'],
    sampleNodes: { Register: [{ name: 'POWER_CTRL', address: '0x100', description: 'controls NVMe power gating' }] }
  });
});

app.post('/api/kg/query', async (req, res) => {
  const { userQuestion, schemaSnippet } = req.body;
  if (!userQuestion) return res.status(400).json({ error: 'userQuestion required' });

  try {
    const userA = `User question: "${userQuestion}"
Schema snippet: ${JSON.stringify(schemaSnippet || {})}
Return JSON only: {"cypher":"...","params":{...},"confidence_hint":"high|medium|low"}`;

    const llmA_text = await callLLM({ system: modelA_system, user: userA, temperature: 0.0, max_tokens: 800 });
    let parsedA;
    try { parsedA = JSON.parse(llmA_text); } catch (e) {
      throw new Error('Model A did not return valid JSON');
    }

    const sanitizedCypher = validateAndSanitize(parsedA.cypher);

    const rows = await runReadQuery(sanitizedCypher, parsedA.params || {});

    const userB = `Question: ${userQuestion}
Results: ${JSON.stringify(rows)}
Return JSON only: {"answer_text":"...","bullets":[..],"provenance":[..],"confidence":"high|medium|low"}`;

    const llmB_text = await callLLM({ system: modelB_system, user: userB, temperature: 0.0, max_tokens: 600 });
    let parsedB;
    try { parsedB = JSON.parse(llmB_text); } catch (e) {
      throw new Error('Model B did not return valid JSON');
    }

    logger.info({ event: 'kg_query', question: userQuestion, cypher: sanitizedCypher, params: parsedA.params, returnedRows: rows.length });

    res.json({ answer: parsedB.answer_text, bullets: parsedB.bullets, provenance: parsedB.provenance, confidence: parsedB.confidence, cypher: sanitizedCypher, params: parsedA.params, raw: rows });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`KG LLM adapter listening on ${port}`));

module.exports = app;
