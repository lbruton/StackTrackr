#!/usr/bin/env python3
"""
MCP Memory Backup System
Exports complete MCP memory to local JSON files as backup/fallback system
"""

import json
import os
from datetime import datetime
from pathlib import Path

# File paths
BACKUP_DIR = "backups/mcp_memory"
MEMORY_BACKUP_FILE = f"{BACKUP_DIR}/mcp_memory_backup.json"
ROADMAP_BACKUP_FILE = f"{BACKUP_DIR}/roadmap_backup.json"
BUGS_BACKUP_FILE = f"{BACKUP_DIR}/bugs_backup.json"
WORKFLOWS_BACKUP_FILE = f"{BACKUP_DIR}/workflows_backup.json"
GLOSSARY_BACKUP_FILE = f"{BACKUP_DIR}/technical_glossary_backup.json"

def ensure_backup_dir():
    """Create backup directory if it doesn't exist"""
    Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)

def export_mcp_memory_to_json(mcp_graph_data):
    """
    Export complete MCP memory graph to structured JSON files
    
    Args:
        mcp_graph_data: Complete memory graph from mcp_memory_read_graph
    """
    ensure_backup_dir()
    
    # Complete backup
    complete_backup = {
        "backup_timestamp": datetime.now().isoformat(),
        "backup_version": "1.0",
        "source": "MCP Memory Graph",
        "entities": mcp_graph_data.get("entities", []),
        "relations": mcp_graph_data.get("relations", [])
    }
    
    with open(MEMORY_BACKUP_FILE, 'w', encoding='utf-8') as f:
        json.dump(complete_backup, f, indent=2, ensure_ascii=False)
    
    # Extract and backup by category
    entities = mcp_graph_data.get("entities", [])
    
    # Roadmap categories backup
    roadmap_entities = [e for e in entities if e.get("entityType") == "RoadmapCategory"]
    roadmap_backup = {
        "backup_timestamp": datetime.now().isoformat(),
        "categories": {entity["name"]: entity["observations"] for entity in roadmap_entities}
    }
    
    with open(ROADMAP_BACKUP_FILE, 'w', encoding='utf-8') as f:
        json.dump(roadmap_backup, f, indent=2, ensure_ascii=False)
    
    # Bugs backup
    bug_entities = [e for e in entities if e.get("entityType") == "Bug"]
    bugs_backup = {
        "backup_timestamp": datetime.now().isoformat(),
        "bugs": {entity["name"]: entity["observations"] for entity in bug_entities}
    }
    
    with open(BUGS_BACKUP_FILE, 'w', encoding='utf-8') as f:
        json.dump(bugs_backup, f, indent=2, ensure_ascii=False)
    
    # Workflows backup
    workflow_entities = [e for e in entities if e.get("entityType") == "WorkflowProtocol"]
    workflows_backup = {
        "backup_timestamp": datetime.now().isoformat(),
        "workflows": {entity["name"]: entity["observations"] for entity in workflow_entities}
    }
    
    with open(WORKFLOWS_BACKUP_FILE, 'w', encoding='utf-8') as f:
        json.dump(workflows_backup, f, indent=2, ensure_ascii=False)
    
    # Technical glossary backup
    glossary_entities = [e for e in entities if e.get("entityType") == "Glossary"]
    glossary_backup = {
        "backup_timestamp": datetime.now().isoformat(),
        "glossary": {entity["name"]: entity["observations"] for entity in glossary_entities}
    }
    
    with open(GLOSSARY_BACKUP_FILE, 'w', encoding='utf-8') as f:
        json.dump(glossary_backup, f, indent=2, ensure_ascii=False)
    
    return {
        "complete_backup": MEMORY_BACKUP_FILE,
        "roadmap_backup": ROADMAP_BACKUP_FILE,
        "bugs_backup": BUGS_BACKUP_FILE,
        "workflows_backup": WORKFLOWS_BACKUP_FILE,
        "glossary_backup": GLOSSARY_BACKUP_FILE,
        "backup_timestamp": datetime.now().isoformat()
    }

def load_backup_memory():
    """
    Load memory from backup files when MCP is unavailable
    
    Returns:
        dict: Combined memory data from all backup files
    """
    memory_data = {
        "timestamp": datetime.now().isoformat(),
        "source": "JSON Backup Files",
        "roadmap": {},
        "bugs": {},
        "workflows": {},
        "glossary": {},
        "complete_graph": {}
    }
    
    # Load roadmap backup
    if os.path.exists(ROADMAP_BACKUP_FILE):
        with open(ROADMAP_BACKUP_FILE, 'r', encoding='utf-8') as f:
            memory_data["roadmap"] = json.load(f)
    
    # Load bugs backup
    if os.path.exists(BUGS_BACKUP_FILE):
        with open(BUGS_BACKUP_FILE, 'r', encoding='utf-8') as f:
            memory_data["bugs"] = json.load(f)
    
    # Load workflows backup
    if os.path.exists(WORKFLOWS_BACKUP_FILE):
        with open(WORKFLOWS_BACKUP_FILE, 'r', encoding='utf-8') as f:
            memory_data["workflows"] = json.load(f)
    
    # Load glossary backup
    if os.path.exists(GLOSSARY_BACKUP_FILE):
        with open(GLOSSARY_BACKUP_FILE, 'r', encoding='utf-8') as f:
            memory_data["glossary"] = json.load(f)
    
    # Load complete backup
    if os.path.exists(MEMORY_BACKUP_FILE):
        with open(MEMORY_BACKUP_FILE, 'r', encoding='utf-8') as f:
            memory_data["complete_graph"] = json.load(f)
    
    return memory_data

def get_available_tasks_from_backup():
    """
    Extract available tasks from backup files for agent queries
    """
    try:
        backup_data = load_backup_memory()
        
        tasks = {
            "critical_bugs": [],
            "bug_fixes": [],
            "feature_enhancements": [],
            "new_features": [],
            "current_sprint": [],
            "backend_architecture": [],
            "testing_qa": []
        }
        
        # Extract from roadmap backup
        roadmap = backup_data.get("roadmap", {}).get("categories", {})
        
        if "critical-bugs" in roadmap:
            tasks["critical_bugs"] = roadmap["critical-bugs"]
        
        if "bug-fixes-non-critical" in roadmap:
            tasks["bug_fixes"] = roadmap["bug-fixes-non-critical"]
        
        if "feature-enhancements" in roadmap:
            tasks["feature_enhancements"] = roadmap["feature-enhancements"]
        
        if "new-features" in roadmap:
            tasks["new_features"] = roadmap["new-features"]
        
        if "current-sprint" in roadmap:
            tasks["current_sprint"] = roadmap["current-sprint"]
        
        if "backend-architecture" in roadmap:
            tasks["backend_architecture"] = roadmap["backend-architecture"]
        
        if "testing-qa" in roadmap:
            tasks["testing_qa"] = roadmap["testing-qa"]
        
        return tasks
        
    except Exception as e:
        print(f"Error loading tasks from backup: {e}")
        return {}

def search_backup_memory(query):
    """
    Search backup memory for relevant information
    
    Args:
        query (str): Search query
        
    Returns:
        list: Matching entities/observations
    """
    results = []
    
    try:
        backup_data = load_backup_memory()
        query_lower = query.lower()
        
        # Search roadmap categories
        for category, observations in backup_data.get("roadmap", {}).get("categories", {}).items():
            if query_lower in category.lower():
                results.append({
                    "type": "roadmap_category",
                    "name": category,
                    "observations": observations
                })
            else:
                # Search within observations
                for obs in observations:
                    if query_lower in obs.lower():
                        results.append({
                            "type": "roadmap_item",
                            "category": category,
                            "observation": obs
                        })
        
        # Search bugs
        for bug_name, observations in backup_data.get("bugs", {}).get("bugs", {}).items():
            if query_lower in bug_name.lower():
                results.append({
                    "type": "bug",
                    "name": bug_name,
                    "observations": observations
                })
            else:
                for obs in observations:
                    if query_lower in obs.lower():
                        results.append({
                            "type": "bug_detail",
                            "bug": bug_name,
                            "observation": obs
                        })
        
        # Search workflows
        for workflow_name, observations in backup_data.get("workflows", {}).get("workflows", {}).items():
            if query_lower in workflow_name.lower():
                results.append({
                    "type": "workflow",
                    "name": workflow_name,
                    "observations": observations
                })
        
        return results
        
    except Exception as e:
        print(f"Error searching backup memory: {e}")
        return []

if __name__ == "__main__":
    # Example usage - would typically be called by agents when MCP unavailable
    print("MCP Memory Backup System")
    print("Loading from backup files...")
    
    tasks = get_available_tasks_from_backup()
    
    if tasks:
        print(f"Found {len(tasks['critical_bugs'])} critical bugs")
        print(f"Found {len(tasks['bug_fixes'])} bug fixes")  
        print(f"Found {len(tasks['feature_enhancements'])} feature enhancements")
        print(f"Found {len(tasks['current_sprint'])} current sprint items")
    else:
        print("No backup data found. Run export_mcp_memory_to_json() first.")
