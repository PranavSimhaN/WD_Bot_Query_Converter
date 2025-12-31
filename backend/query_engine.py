import sys
import json
import os
import traceback # Added to catch detailed errors
from langchain_neo4j import Neo4jGraph, GraphCypherQAChain
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv # <--- NEW IMPORT

# Load the secret .env file
load_dotenv()

# Check if key exists
if not os.getenv("GROQ_API_KEY"):
    print(json.dumps({"answer": "❌ Error: Missing GROQ_API_KEY in .env file"}))
    sys.exit(1)

# 1. GET INPUT
try:
    user_question = sys.argv[1]
except IndexError:
    print(json.dumps({"error": "No question provided", "answer": "Error: No question provided"}))
    sys.exit(1)

# 2. CONFIGURATION


NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password123"

try:
    # 3. SETUP GRAPH
    try:
        graph = Neo4jGraph(url=NEO4J_URI, username=NEO4J_USER, password=NEO4J_PASSWORD)
    except Exception as e:
        raise Exception(f"Database Connection Failed: {str(e)}. Is Docker running?")

    # 4. SETUP LLM
    if os.environ["GROQ_API_KEY"].startswith("YOUR_"):
        raise Exception("Invalid API Key: You forgot to replace 'YOUR_GROQ_API_KEY_HERE' with your real key.")

    llm = ChatGroq(
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        model_name="llama-3.3-70b-versatile",
        temperature=0
    )

    # 5. PROMPT
    CYPHER_GENERATION_TEMPLATE = """
    Task: Generate Cypher statement to query a graph database.
    Instructions:
    - Use only the node labels and relationship types present in the schema.
    - MATCH relationships in ANY direction: (a)-[r]-(b)
    - CRITICAL: Do NOT use exact string matching. 
    - ALWAYS use 'toLower(n.name) CONTAINS toLower("value")' for names.
      Example: Instead of {{name: 'NVIC'}}, use toLower(n.name) CONTAINS 'nvic'
    - Return ONLY the Cypher query.
    
    Schema: {schema}
    Question: {question}
    Cypher Query:"""

    PROMPT = PromptTemplate(
        input_variables=["schema", "question"], 
        template=CYPHER_GENERATION_TEMPLATE
    )

    # 6. RUN CHAIN
    chain = GraphCypherQAChain.from_llm(
        llm=llm, 
        graph=graph, 
        verbose=False, 
        cypher_prompt=PROMPT, 
        allow_dangerous_requests=True,
        return_intermediate_steps=True 
    )

    response = chain.invoke(user_question)
    
    # 7. EXTRACT QUERY
    generated_cypher = "No query generated"
    if "intermediate_steps" in response:
        for step in response["intermediate_steps"]:
            if "query" in step:
                 generated_cypher = step["query"]

    # 8. PRINT RESULT
    result = {
        "answer": response['result'],
        "cypher": generated_cypher 
    }
    print(json.dumps(result))

except Exception as e:
    # ERROR HANDLING: Print the ACTUAL error to the website
    error_message = str(e)
    # If it's a connection error, give a hint
    if "Connection refused" in error_message:
        error_message += " (Check if Docker is running!)"
    
    print(json.dumps({
        "answer": f"❌ ERROR: {error_message}", 
        "cypher": "Error - No Query"
    }))