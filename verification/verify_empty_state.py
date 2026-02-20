from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    print("Navigating to app...")
    page.goto("http://localhost:8080/")

    print("Forcing empty inventory...")
    page.evaluate("""
        inventory = [];
        saveInventory();
        renderTable();
        // Also clear active filters to show 'empty stack' message
        clearAllFilters();
    """)

    print("Checking for empty state...")
    try:
        # Check for the empty state container
        page.wait_for_selector(".empty-state", timeout=5000)

        # Verify text content
        text = page.inner_text(".empty-state")
        print(f"Empty state text: {text}")

        if "Your stack is empty" in text:
            print("SUCCESS: 'Your stack is empty' message visible.")
        else:
            print("FAILURE: 'Your stack is empty' message NOT found.")

    except Exception as e:
        print(f"FAILURE: Empty state selector not found. {e}")

    page.screenshot(path="verification/empty_stack.png")

    # ---------------------------------------------------------
    # Test Filter Empty State
    # ---------------------------------------------------------
    print("\nAdding test item...")
    page.evaluate("""
        inventory = [{
            metal: "Silver",
            type: "Coin",
            name: "Test Coin",
            qty: 1,
            weight: 1,
            weightUnit: "oz",
            purity: 1,
            price: 30,
            date: "2024-01-01",
            uuid: "test-uuid"
        }];
        saveInventory();
        renderTable();
    """)

    print("Filtering for non-existent item...")
    page.fill("#searchInput", "NonExistentItem")

    # Wait for debounce and render
    page.wait_for_timeout(1000)

    try:
        page.wait_for_selector(".empty-state", timeout=5000)
        text = page.inner_text(".empty-state")
        print(f"Filter empty state text: {text}")

        if "No matching items found" in text:
            print("SUCCESS: 'No matching items found' message visible.")
        else:
            print("FAILURE: 'No matching items found' message NOT found.")

    except Exception as e:
        print(f"FAILURE: Filter empty state selector not found. {e}")

    page.screenshot(path="verification/filter_empty.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
