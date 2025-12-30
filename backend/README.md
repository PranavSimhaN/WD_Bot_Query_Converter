Backend for kg-llm-adapter

1. copy .env.example -> .env and fill values
2. npm install
3. npm start

The server exposes:
- GET /_health
- GET /meta/schema (mocked; replace with backend KG schema endpoint)
- POST /api/kg/query { userQuestion, schemaSnippet? }

Unit tests: npm test
