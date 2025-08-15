import json

# File path
MEMORY_FILE = "local_memory.json"

# Read memory
def read_memory():
    with open(MEMORY_FILE, "r") as file:
        return json.load(file)

# Write to memory
def write_memory(data):
    with open(MEMORY_FILE, "w") as file:
        json.dump(data, file, indent=4)

# Example usage
if __name__ == "__main__":
    memory = read_memory()
    memory["tasks"].append({"id": 1, "description": "Test JSON memory system", "status": "pending"})
    write_memory(memory)
    print("Memory updated successfully.")
