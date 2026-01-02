import csv
import os
from neo4j import GraphDatabase

# --- 1. CONFIGURATION ---
# Connect to Local Docker Database
URI = "bolt://localhost:7687"
USERNAME = "neo4j"
PASSWORD = "password123"  # Default Docker password

# Define File Paths
# (This assumes renode_nodes.csv and renode_edges.csv are in the SAME folder)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
NODES_CSV = os.path.join(CURRENT_DIR, "renode_nodes.csv")
EDGES_CSV = os.path.join(CURRENT_DIR, "renode_edges.csv")

# Connect to Driver
driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))

# --- 2. VERIFY CONNECTION ---
def test_connection(tx):
    return tx.run("RETURN '✅ Connected to Local Docker Neo4j!'").single()[0]

try:
    with driver.session() as session:
        print(session.execute_read(test_connection))
except Exception as e:
    print(f"❌ Connection Failed: {e}")
    print("👉 Make sure Docker is running and password is correct.")
    exit()

# --- 3. CLEAR OLD DATA (OPTIONAL) ---
# Uncomment the next two lines if you want to wipe the DB before loading
# with driver.session() as session:
#     session.run("MATCH (n) DETACH DELETE n")

# --- 4. CREATE CONSTRAINTS ---
# This ensures we don't create duplicate nodes with the same name
def apply_constraints(tx):
    tx.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.name IS UNIQUE")

with driver.session() as session:
    session.execute_write(apply_constraints)
    print("✅ Constraints created.")

# --- 5. LOAD NODES ---
def load_nodes(tx, file_path):
    count = 0
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Creates a node for every row in the CSV
            tx.run("MERGE (n:Entity {name: $name})", name=row["name"])
            count += 1
    print(f"✅ Loaded {count} Nodes.")

if os.path.exists(NODES_CSV):
    with driver.session() as session:
        session.execute_write(load_nodes, NODES_CSV)
else:
    print(f"❌ Error: Could not find {NODES_CSV}")

# --- 6. LOAD EDGES ---
def load_edges(tx, file_path):
    count = 0
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Connects nodes based on 'source', 'target', and 'relation' columns
            tx.run(
                """
                MATCH (a:Entity {name: $src})
                MATCH (b:Entity {name: $tgt})
                MERGE (a)-[r:RELATION {type: $rel}]->(b)
                """,
                src=row["source_name"],
                tgt=row["target_name"],
                rel=row["relation"]
            )
            count += 1
    print(f"✅ Loaded {count} Edges.")

if os.path.exists(EDGES_CSV):
    with driver.session() as session:
        session.execute_write(load_edges, EDGES_CSV)
else:
    print(f"❌ Error: Could not find {EDGES_CSV}")

print("\n🎉 Data Ingestion Complete!")
driver.close()