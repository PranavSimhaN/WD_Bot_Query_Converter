This repo implements a minimal end-to-end KG LLM adapter + simple React UI.

Quick run steps (frontend → backend → Neo4j)

Prerequisites
- Node.js v14+ and npm
- Docker & Docker Compose

1) Frontend (start first to see UI quickly)

```bash
cd frontend
npm install
npm start
```

The React app will open at http://localhost:3000 (or visit that URL manually).

2) Backend

Copy the example environment file and set your LLM and Neo4j credentials:

```bash
cd backend
cp .env.example .env
# Edit backend/.env and set LLM_API_KEY and any overrides (LLM_MOCK=true for local testing)
npm install
node server.js
```

The backend listens on the port defined by `PORT` in `backend/.env` (default 3001).

3) Neo4j (database)

Start Neo4j using Docker Compose from the project root:

```bash
docker-compose up neo4j
```

Access the Neo4j Browser at http://localhost:7474 (default creds in examples: `neo4j` / `secret`).

4) Load sample test data (Neo4j Browser)

Open http://localhost:7474 and run the following Cypher script to add sample nodes used by the demo:

```cypher
CREATE (p:Subsystem {name: 'PowerManagement'});
CREATE (r1:Register {name: 'POWER_CTRL', address: '0x100', description: 'controls NVMe power gating'});
CREATE (r2:Register {name: 'THERMAL_MON', address: '0x200', description: 'monitors temperature'});
CREATE (r3:Register {name: 'FAN_SPEED', address: '0x300', description: 'controls fan speed'});
CREATE (r1)-[:BELONGS_TO]->(p);
CREATE (r2)-[:BELONGS_TO]->(p);
CREATE (r3)-[:BELONGS_TO]->(p);

CREATE (s:Subsystem {name: 'Storage'});
CREATE (r4:Register {name: 'NVME_CTRL', address: '0x400', description: 'NVMe controller'});
CREATE (r4)-[:BELONGS_TO]->(s);
```

5) Test the system

- Using the frontend: open http://localhost:3000 and ask questions such as:
   - "What registers belong to the PowerManagement subsystem?"
   - "List all registers"

- Using curl to test the backend directly:

```bash
curl -X POST http://localhost:3001/api/kg/query \
   -H "Content-Type: application/json" \
   -d '{"userQuestion":"What registers belong to the PowerManagement subsystem?","schemaSnippet":{}}'
```

Expected behavior
- Model A (LLM) converts the user question into a Cypher query
- Backend executes the Cypher against Neo4j
- Model B (LLM) formats results into human-readable text returned to the frontend

Security notes
- DO NOT commit your real `backend/.env` file to Git. Use `backend/.env.example` as a template.
- `LLM_API_KEY` and any secret credentials must only live in your local `backend/.env` or in CI secrets.

If you want, I can paste these same run steps into `TESTING_GUIDE.md` as well.

Integration notes -> see `backend/README.md` for backend-specific details and prompts customization.
