"""Wait for the production Vercel API to be the new same-origin build.

This intentionally checks a JSON identity marker, not a generic HTTP 200 that
might come from the previous SPA's HTML fallback.
"""
import os
import sys
import time

import requests

BASE = os.environ.get("RAG_API_URL", "https://sourcelens-rag.vercel.app").rstrip("/")
TIMEOUT = int(os.environ.get("READY_TIMEOUT_SECONDS", "420"))
INTERVAL = 12


def main():
    start = time.monotonic()
    attempt = 0
    while time.monotonic() - start < TIMEOUT:
        attempt += 1
        try:
            response = requests.get(BASE + "/api/index", timeout=12)
            data = response.json()
            if (
                response.status_code == 200
                and data.get("status") == "ok"
                and data.get("service") == "sourcelens-index"
                and data.get("embedding_model") == "local-hashed-lexical-v1"
            ):
                print(f"READY after attempt {attempt}: {BASE}", flush=True)
                return 0
            print(f"Attempt {attempt}: new API not ready (HTTP {response.status_code})", flush=True)
        except (ValueError, requests.RequestException) as exc:
            print(f"Attempt {attempt}: {type(exc).__name__}", flush=True)
        time.sleep(INTERVAL)
    print("FAIL: Production API did not become ready before timeout.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
