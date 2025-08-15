import json
import os
from datetime import datetime

# File paths
ROADMAP_FILE = "docs/roadmap.md"
MEMORY_EXPORT_FILE = "memory_export.json"

# Function to read tasks from MCP memory (mocked for now)
def fetch_tasks_from_memory():
    # Replace this with actual MCP memory API calls
    try:
        with open(MEMORY_EXPORT_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []

# Function to update roadmap.md
def update_roadmap(tasks):
    if not tasks:
        print("No tasks found in memory.")
        return

    with open(ROADMAP_FILE, "w") as roadmap:
        roadmap.write(f"# Roadmap (Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})\n\n")
        for task in tasks:
            roadmap.write(f"- [ ] {task['description']}\n")

    print(f"Updated {ROADMAP_FILE} with tasks from memory.")

# Function to sync tasks to memory (mocked for now)
def sync_tasks_to_memory():
    # Replace this with actual MCP memory API calls
    try:
        with open(ROADMAP_FILE, "r") as roadmap:
            tasks = [line.strip("- [ ] ") for line in roadmap if line.startswith("- [ ]")]
        with open(MEMORY_EXPORT_FILE, "w") as file:
            json.dump([{"description": task} for task in tasks], file)
        print("Synced tasks to memory.")
    except FileNotFoundError:
        print(f"{ROADMAP_FILE} not found.")

if __name__ == "__main__":
    print("1. Fetching tasks from memory...")
    tasks = fetch_tasks_from_memory()

    print("2. Updating roadmap.md...")
    update_roadmap(tasks)

    print("3. Syncing tasks to memory...")
    sync_tasks_to_memory()

    print("Task synchronization complete.")
