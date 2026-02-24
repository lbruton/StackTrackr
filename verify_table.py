from playwright.sync_api import sync_playwright
import time

def verify_table():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 1200})

        # Go to local server
        page.goto("http://localhost:8080")

        # Handle Ack Modal
        try:
            page.wait_for_selector("#ackModal", timeout=5000)
            if page.is_visible("#ackModal"):
                print("Dismissing ack modal...")
                page.click("#ackAcceptBtn")
                page.wait_for_selector("#ackModal", state="hidden")
        except:
            print("No ack modal found or timed out waiting for it")

        # Scroll to table
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

        print("Waiting for table...")
        try:
            page.wait_for_selector("#inventoryTable tbody tr", timeout=5000)
            print("Table found!")
        except:
            print("Table row wait timed out. Taking screenshot.")
            page.screenshot(path="timeout_state_2.png")
            raise

        # Click on a header to trigger sort (and renderTable)
        print("Clicking header...")
        page.click("th[data-column='name']")
        time.sleep(1) # Wait for render

        # Take screenshot
        page.screenshot(path="verification_final.png")
        print("Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_table()
