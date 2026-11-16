import os
import subprocess

print("=== 1. SCAN FRONTEND CODE FOR SECRETS / API KEYS ===")
suspicious = []
for root, dirs, files in os.walk("frontend/src"):
    for f in files:
        if f.endswith((".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".json")):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
                if "AIza" in content or "sk-" in content or "GEMINI_API_KEY" in content:
                    suspicious.append(p)
if suspicious:
    print("WARNING: Secrets found in:", suspicious)
else:
    print("PASS: Zero API keys or secrets detected in frontend/src")

print("\n=== 2. GIT CHECK-IGNORE FOR .env FILES ===")
res = subprocess.run(["git", "check-ignore", "backend/.env", ".env", "frontend/.env"], capture_output=True, text=True)
print("Ignored files:\n" + res.stdout.strip())

print("\n=== 3. CHECK TRACKED FILES FOR .env ===")
res = subprocess.run(["git", "ls-files"], capture_output=True, text=True)
tracked = res.stdout.splitlines()
tracked_env = [f for f in tracked if ".env" in f and not f.endswith(".example")]
print("Tracked .env files:", tracked_env if tracked_env else "NONE (PASS: No .env tracked)")

print("\n=== 4. CHECK FOR RECORDINGS IN REPO (.webm, .mp4, .wav) ===")
media_files = [f for f in tracked if f.endswith((".webm", ".mp4", ".wav", ".mp3", ".ogg", ".m4a"))]
print("Tracked media recordings in repo:", media_files if media_files else "NONE (PASS: Zero recordings in repo)")
