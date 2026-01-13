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
api_key = os.getenv("GROQ_API_KEY")
if not api_key or api_key == "mock":
    print(json.dumps({
        "answer": "🔒 MOCK MODE: Groq API Key is missing or set to 'mock'. This is a simulated response indicating the system is connected.",
        "cypher": "MATCH (n) RETURN n LIMIT 5 // Mock Query"
    }))
    sys.exit(0)

if not api_key:
    print(json.dumps({"answer": "❌ Error: Missing GROQ_API_KEY in .env file"}))
    sys.exit(1)

# 1. GET INPUT
try:
    user_question = sys.argv[1]
except IndexError:
    print(json.dumps({"error": "No question provided", "answer": "Error: No question provided"}))
    sys.exit(1)

# 2. CONFIGURATION


NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

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
        model_name=os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile"),
        temperature=0
    )

    # 5. PROMPT
    CYPHER_GENERATION_TEMPLATE = """
    Task: Generate Cypher statement to query a graph database.
    
    *** SCHEMA EXPLANATION (READ CAREFULLY) ***
    - The database uses a generic relationship label: :RELATION
    - The semantic MEANING of the connection is stored in the 'type' property of the RELATIONSHIP itself.
    - Structure: (NodeA)-[r:RELATION {{type: 'meaning'}}]->(NodeB)

    Instructions:
    1. Use ONLY the node labels present in the schema (likely :Entity).
    2. ALWAYS match relationships using the variable 'r': -[r:RELATION]-
    3. FILTER using `r.type` (NOT n.type or val.type).
       - CORRECT: WHERE r.type = 'frequency'
       - WRONG:   WHERE val.type = 'frequency'
    4. CASE INSENSITIVITY: 
       - ALWAYS use `toLower(n.name) CONTAINS toLower("user_input")` for finding nodes.
    
    Examples:
    - "What is the frequency of lpuart1?"
      MATCH (n)-[r:RELATION]-(val) 
      WHERE toLower(n.name) CONTAINS 'lpuart1' AND r.type = 'frequency' 
      RETURN val.name

    - "What is the size of sram?"
      MATCH (n)-[r:RELATION]-(val) 
      WHERE toLower(n.name) CONTAINS 'sram' AND r.type = 'size' 
      RETURN val.name

    - "What is connected to sysbus?"
      MATCH (n)-[r:RELATION]-(val) 
      WHERE toLower(n.name) CONTAINS 'sysbus' 
      RETURN val.name, r.type

    Schema: {schema}
    Question: {question}
    Cypher Query:"""

    PROMPT = PromptTemplate(
        input_variables=["schema", "question"], 
        template=CYPHER_GENERATION_TEMPLATE
    )

    # NEW: QA Prompt to ensure Markdown formatting
    QA_PROMPT_TEMPLATE = """You are a helpful AI assistant answering questions about a computer system configuration based on graph database results.

    Use the following context to answer the user's question.
    Context: {context}

    Instructions:
    1. Answer the question directly and clearly.
    2. Use **Markdown** formatting:
       - Use **bold** for component names and values.
       - Use lists (bullet points) for multiple items.
       - Use `code blocks` for technical terms like addresses (e.g., `0x8000`).
    3. If the context is empty, say you don't know based on the data.
    4. Keep the tone professional but helpful.

    User Question: {question}
    Answer:"""

    QA_PROMPT = PromptTemplate(
        input_variables=["context", "question"],
        template=QA_PROMPT_TEMPLATE
    )

    # 6. RUN CHAIN
    chain = GraphCypherQAChain.from_llm(
        llm=llm, 
        graph=graph, 
        verbose=False, 
        cypher_prompt=PROMPT,
        qa_prompt=QA_PROMPT, # <--- Added this
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