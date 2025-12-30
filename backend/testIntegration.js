require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

async function testFlow() {
  console.log('🧪 Testing KG LLM Adapter...\n');

  // Test 1: Text to Cypher
  console.log('Test 1: Text → Cypher conversion');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/kg/query`, {
      userQuestion: 'What registers belong to PowerManagement?',
      schemaSnippet: {
        labels: ['Register', 'Subsystem'],
        relationships: ['(Register)-[:BELONGS_TO]->(Subsystem)'],
        sampleSubsystems: ['PowerManagement'],
        sampleRegisters: ['POWER_CTRL', 'THERMAL_MON', 'VOLTAGE_REG']
      }
    });

    console.log('✅ Success!');
    console.log('Generated Cypher:', response.data.cypher);
    console.log('Parameters:', response.data.params);
    console.log('Raw results from DB:', response.data.raw);
    console.log('\nTest 2: Results → Human Text (Model B)');
    console.log('Answer:', response.data.answer);
    console.log('Bullets:', response.data.bullets);
    console.log('Confidence:', response.data.confidence);
    console.log('\n✅ Full flow working!\n');
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }

  // Test 3: Health check
  console.log('Test 3: Health check');
  try {
    const health = await axios.get(`${BACKEND_URL}/_health`);
    console.log('✅ Backend is running:', health.data);
  } catch (err) {
    console.error('❌ Backend not running:', err.message);
  }
}

testFlow();
