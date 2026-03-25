import os
import subprocess
import sys
import webbrowser
import time

def run():
    # 1. Determine paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # If we are in the root, look for api folder
    if os.path.exists(os.path.join(current_dir, "api")):
        api_dir = os.path.join(current_dir, "api")
        requirements_path = os.path.join(api_dir, "requirements.txt")
    else:
        # We might already be in the api folder
        api_dir = current_dir
        requirements_path = os.path.join(api_dir, "requirements.txt")
    
    # 2. Install dependencies
    print("--- [Checking/Installing Dependencies] ---")
    if os.path.exists(requirements_path):
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path])
        except Exception as e:
            print(f"Error installing dependencies: {e}")
            sys.exit(1)
    else:
        print(f"requirements.txt not found at {requirements_path}!")
        sys.exit(1)

    # 3. Start Server
    print("--- [Starting Meme-Swings Backend Server] ---")
    print("The app will open automatically in your browser in a few seconds...")
    
    # Start browser after a short delay
    def open_browser():
        time.sleep(3)
        webbrowser.open("http://127.0.0.1:8000")
        
    import threading
    threading.Thread(target=open_browser).start()

    # Run Uvicorn from the api directory to ensure imports work
    os.chdir(api_dir)
    try:
        # Run uvicorn index:app (since we are now in the api dir)
        subprocess.check_call([sys.executable, "-m", "uvicorn", "index:app", "--reload", "--port", "8000"])
    except KeyboardInterrupt:
        print("\nStopping application...")
    except Exception as e:
        print(f"Error running uvicorn: {e}")

if __name__ == "__main__":
    run()
