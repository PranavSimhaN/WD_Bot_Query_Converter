require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

async function testVariations() {
  console.log('🧪 Testing question phrasing variations...\n');

  const questions = [
    'What registers belong to the PowerManagement subsystem?',
    'What registers belong to PowerManagement?',
    'Show me registers in PowerManagement',
    'List all PowerManagement registers'
  ];

  for (const q of questions) {
    console.log(`\n📝 Question: "${q}"`);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/kg/query`, {
        userQuestion: q,
        schemaSnippet: {
          labels: ['Register', 'Subsystem'],
          relationships: ['(Register)-[:BELONGS_TO]->(Subsystem)'],
          sampleSubsystems: ['PowerManagement'],
          sampleRegisters: ['POWER_CTRL', 'THERMAL_MON', 'VOLTAGE_REG']
        }
      });

      const uniqueRegisters = [...new Set(response.data.raw.map(r => r.registerName || r.r_name))];
      if (uniqueRegisters.length > 0) {
        console.log(`✅ Found ${uniqueRegisters.length} registers: ${uniqueRegisters.join(', ')}`);
      } else {
        console.log(`❌ No results found`);
      }
      console.log(`   Cypher: ${response.data.cypher}`);
      console.log(`   Params: ${JSON.stringify(response.data.params)}`);
    } catch (err) {
      console.log(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  }
}

testVariations();
