#!/usr/bin/env python3
"""Fresh end-to-end verification of the WARP generator (re-dispatches the workflow)."""
import json, re, subprocess, sys, time

R = "MrRooobooot/warp-keygen"
S = "/Users/aidin/.hermes/profiles/daily/cache/scratch/warpgh"


def sh(cmd, timeout=600):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout, cwd=S)
    return (p.stdout + p.stderr).strip()


print("=== 1. repo state (git)")
print(sh("git log --oneline -3 && git status --porcelain | head -3"))

print("\n=== 2. dispatch verify.yml")
before = sh(f"gh run list -R {R} --workflow verify.yml --limit 1 --json databaseId --jq '.[0].databaseId'")
sh(f"gh workflow run verify.yml -R {R}")

run_id = None
for _ in range(40):
    time.sleep(5)
    cur = sh(f"gh run list -R {R} --workflow verify.yml --limit 1 --json databaseId,status,conclusion --jq '.[0]'")
    d = json.loads(cur)
    if str(d["databaseId"]) != before and d["status"] == "completed":
        run_id = d["databaseId"]
        print("run_id:", run_id, "conclusion:", d["conclusion"])
        break
if not run_id:
    print("TIMEOUT waiting for run"); sys.exit(1)

print("\n=== 3. live proof from runner log")
log = sh(f"gh run view {run_id} -R {R} --log 2>&1")
log = re.sub(r"^.*?Z  *", "", log, flags=re.M)
for line in log.splitlines():
    if re.search(r"LICENSE=|WARP_PLUS=|ENDPOINT=|latest handshake|interface: wg0|warp=on|^ip=|^loc=", line):
        print(line.strip())
