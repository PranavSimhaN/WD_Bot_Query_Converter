const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { encryption: 'ENCRYPTION_OFF' }
);

async function runReadQuery(cypher, params = {}, timeoutMs = 30000) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const tx = await session.beginTransaction({ timeout: timeoutMs });
    const res = await tx.run(cypher, params);
    await tx.commit();
    const rows = res.records.map(r => {
      const obj = {};
      r.keys.forEach(k => {
        const v = r.get(k);
        if (typeof v === 'object' && v !== null && v.identity) {
          obj[k] = {
            id: v.identity?.toString(),
            labels: v.labels,
            properties: v.properties
          };
        } else {
          obj[k] = v;
        }
      });
      return obj;
    });
    return rows;
  } finally {
    await session.close();
  }
}

module.exports = { runReadQuery, driver };
