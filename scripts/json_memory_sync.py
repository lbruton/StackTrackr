import json
from collections import deque

# File path
MEMORY_FILE = "local_memory.json"

# Initialize message history (max 10 messages)
message_history = deque(maxlen=10)

# Read memory
def read_memory():
    with open(MEMORY_FILE, "r") as file:
        return json.load(file)

# Write to memory
def write_memory(data):
    with open(MEMORY_FILE, "w") as file:
        json.dump(data, file, indent=4)

# Add a message to the history
def add_message_to_history(sender, message):
    message_history.append({"sender": sender, "message": message})
    print(f"Message added to history: {sender}: {message}")

# Sync with MCP memory if available
def sync_with_mcp_memory(mcp_memory):
    try:
        # Fetch MCP memory if available
        if mcp_memory:
            mcp_data = mcp_memory.read()
            write_memory(mcp_data)
            print("Memory synchronized with MCP.")
        else:
            print("MCP memory not available. Using JSON as the primary source.")
    except Exception as e:
        print(f"Error syncing with MCP memory: {e}")

# Example usage
if __name__ == "__main__":
    memory = read_memory()
    memory["tasks"].append({"id": 1, "description": "Test JSON memory system", "status": "pending"})
    write_memory(memory)
    add_message_to_history("User", "Test message from user.")
    add_message_to_history("Agent", "Test message from agent.")
    print("Memory updated successfully.")
