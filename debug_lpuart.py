from neo4j import GraphDatabase
import os

URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "password123"

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def check_lpuart1():
    with driver.session() as session:
        # Check direct connections from lpuart1
        print("Checking lpuart1 connections:")
        result = session.run("""
            MATCH (n {name: 'lpuart1'})-[r]-(m)
            RETURN type(r) as rel_label, r.type as rel_type, m.name as neighbor_name
        """)
        for record in result:
            print(f" - -[{record['rel_label']} {{type: '{record['rel_type']}'}}]-> {record['neighbor_name']}")

check_lpuart1()
driver.close()