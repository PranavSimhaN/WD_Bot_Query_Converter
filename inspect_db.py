from neo4j import GraphDatabase
import os
import json

# Configuration
URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "password123"

def get_db_summary():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    summary = {}
    
    with driver.session() as session:
        # 1. Total Nodes
        result = session.run("MATCH (n) RETURN count(n) as count")
        summary['total_nodes'] = result.single()['count']
        
        # 2. Total Relationships
        result = session.run("MATCH ()-[r]->() RETURN count(r) as count")
        summary['total_relationships'] = result.single()['count']
        
        # 3. Distinct Relationship Types (stored as property 'type' on RELATION relationship)
        result = session.run("""
            MATCH ()-[r:RELATION]->() 
            RETURN distinct r.type as rel_type, count(r) as count 
            ORDER BY count DESC 
            LIMIT 20
        """)
        summary['relationship_types'] = [{"type": record['rel_type'], "count": record['count']} for record in result]
        
        # 4. Sample Nodes (Entities)
        # Get nodes that have specific relationships to make better questions
        summary['interesting_nodes'] = {}
        
        # Nodes with size
        result = session.run("MATCH (n)-[r:RELATION {type: 'size'}]-() RETURN distinct n.name as name LIMIT 5")
        summary['interesting_nodes']['with_size'] = [r['name'] for r in result]
        
        # Nodes with frequency
        result = session.run("MATCH (n)-[r:RELATION {type: 'frequency'}]-() RETURN distinct n.name as name LIMIT 5")
        summary['interesting_nodes']['with_frequency'] = [r['name'] for r in result]
        
        # Nodes on sysbus
        result = session.run("MATCH (n)-[r:RELATION {type: 'sysbus'}]-() RETURN distinct n.name as name LIMIT 5")
        summary['interesting_nodes']['on_sysbus'] = [r['name'] for r in result]

    driver.close()
    return summary

if __name__ == "__main__":
    try:
        data = get_db_summary()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
