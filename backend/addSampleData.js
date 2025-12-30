const neo4j = require('neo4j-driver');
require('dotenv').config();

async function addSampleData() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password123'),
    { encryption: 'ENCRYPTION_OFF' }
  );

  const session = driver.session();

  try {
    console.log('Adding sample data to Neo4j...');
    
    // Create nodes and relationships
    await session.run(`
      CREATE (s:Subsystem {name: 'PowerManagement', description: 'Power management subsystem'})
      CREATE (r1:Register {name: 'POWER_CTRL', address: '0x100', description: 'controls NVMe power gating'})
      CREATE (r2:Register {name: 'THERMAL_MON', address: '0x200', description: 'monitors temperature'})
      CREATE (r3:Register {name: 'VOLTAGE_REG', address: '0x300', description: 'regulates output voltage'})
      CREATE (r1)-[:BELONGS_TO]->(s)
      CREATE (r2)-[:BELONGS_TO]->(s)
      CREATE (r3)-[:BELONGS_TO]->(s)
      RETURN *
    `);

    console.log('✅ Sample data added successfully!');
    
    // Verify the data
    const result = await session.run(`
      MATCH (r:Register)-[:BELONGS_TO]->(s:Subsystem)
      WHERE s.name = 'PowerManagement'
      RETURN r.name, r.address, r.description
    `);

    console.log('\n✅ Registers in PowerManagement:');
    result.records.forEach(record => {
      console.log(`  - ${record.get('r.name')} (${record.get('r.address')}): ${record.get('r.description')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

addSampleData();
