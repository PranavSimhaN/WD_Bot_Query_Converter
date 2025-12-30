# Testing Guide: KG LLM Adapter

## 📖 Complete Setup and Testing Guide
This guide walks you through setting up and testing the KG LLM Adapter from scratch.

## What's Working
### Prerequisites
- Node.js v14+ installed
- Docker and Docker Compose
- Groq API key (free at https://console.groq.com/keys)

### ✅ Setup Complete
1. **LLM API Configuration** - You've added your LLM provider and API key to `.env` (recommended: set `LLM_PROVIDER=groq` and `LLM_API_KEY=gsk_xxxx`)
2. **Frontend** - React app running on `http://localhost:3000`
3. **Backend Dependencies** - All npm packages installed

---

## Two Core Flows to Test

### 1️⃣ **Text → Cypher (Model A)**
**What it does:** Converts human language to Neo4j Cypher queries

**Example:**
```
User Input: "What registers belong to the power subsystem?"
↓
Model A (LLM) converts to:
MATCH (r:Register)-[:BELONGS_TO]->(s:Subsystem)
WHERE s.name = $subsystemName
RETURN r.name, r.address
↓
Executes on Neo4j database
```

**File:** `backend/prompts.js` - `modelA_system` defines the rules

---

### 2️⃣ **Cypher Results → Human Text (Model B)**
**What it does:** Formats database results as readable answers

**Example:**
```
Database Results:
[
  { "name": "POWER_CTRL", "address": "0x100" },
  { "name": "THERMAL_MON", "address": "0x200" }
]
↓
Model B (LLM) converts to:
"The power subsystem has 2 registers: POWER_CTRL at 0x100 controls NVMe power gating, and THERMAL_MON at 0x200 monitors temperature."
↓
Returns JSON with answer_text, bullets, confidence
```

**File:** `backend/prompts.js` - `modelB_system` defines the rules

---

## How to Test End-to-End

### Step 1: Start all services
```powershell
# Terminal 1 - Backend
cd backend
npm install
node server.js

# Terminal 2 - Frontend (already running on :3000)

# Terminal 3 - Neo4j (via Docker)
docker-compose up neo4j
# Access at http://localhost:7474 (credentials: neo4j / secret)
```

### Step 2: Add sample data to Neo4j
Go to `http://localhost:7474` and run:
```cypher
CREATE (p:Subsystem {name: 'PowerManagement'})
CREATE (r1:Register {name: 'POWER_CTRL', address: '0x100', description: 'controls NVMe power gating'})
CREATE (r2:Register {name: 'THERMAL_MON', address: '0x200', description: 'monitors temperature'})
CREATE (r1)-[:BELONGS_TO]->(p)
CREATE (r2)-[:BELONGS_TO]->(p)
```

### Step 3: Test via Frontend
1. Visit `http://localhost:3000`
2. Ask: "What registers belong to the PowerManagement subsystem?"
3. Watch the flow:
   - Question sent to backend
   - Model A converts → Cypher query
   - Query executed on Neo4j
   - Model B formats results → Human text
   - Answer displayed on UI

### Step 4: Verify both conversions in logs
Backend logs will show:
```
{
  event: 'kg_query',
  question: '...',
  cypher: 'MATCH (r:Register)-[:BELONGS_TO]...',
  params: {...},
  returnedRows: 2
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | Main API endpoint `/api/kg/query` |
| `backend/llmClient.js` | Calls configured LLM provider (default: Groq) |
| `backend/prompts.js` | System prompts for Model A & B |
| `backend/neo4jClient.js` | Executes Cypher on database |
| `backend/validator.js` | Sanitizes Cypher (prevents SQL injection) |
| `frontend/src/components/QueryBox.js` | React UI component |

---

## Troubleshooting

**"Connection refused" error:**
- Ensure Neo4j is running: `docker-compose up neo4j`

**"Model A did not return valid JSON":**
- Check `LLM_PROVIDER` and `LLM_API_KEY` are valid in `.env`
- If you set `LLM_API_URL`, ensure it points to your provider's endpoint (leave empty to use provider default)

**"No matching data found" answer:**
- Your Neo4j database might be empty
- Add sample nodes/relationships via Neo4j console

