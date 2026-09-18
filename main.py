from pathlib import Path
import json
import time

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="API Inspector", version="1.0.0")


class RequestPayload(BaseModel):
    method: str = Field(pattern="^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$")
    url: str
    headers: dict[str, str] = {}
    params: dict[str, str] = {}
    body: str = ""


@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.post("/api/request")
async def send_request(payload: RequestPayload):
    method = payload.method.upper()
    headers = {str(k): str(v) for k, v in payload.headers.items() if str(k).strip()}

    try:
        body = None
        if payload.body.strip() and method not in {"GET", "HEAD"}:
            body = payload.body
            if "content-type" not in {k.lower() for k in headers}:
                headers["Content-Type"] = "application/json"

        started = time.perf_counter()
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            response = await client.request(
                method,
                payload.url,
                headers=headers,
                params=payload.params,
                content=body,
            )
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)

        raw = response.text
        try:
            parsed = response.json()
            response_body = json.dumps(parsed, indent=2, ensure_ascii=False)
            response_type = "json"
        except ValueError:
            response_body = raw
            response_type = "text"

        return {
            "status": response.status_code,
            "reason": response.reason_phrase,
            "time_ms": elapsed_ms,
            "size_bytes": len(response.content),
            "content_type": response.headers.get("content-type", ""),
            "response_type": response_type,
            "body": response_body,
            "headers": dict(response.headers),
            "final_url": str(response.url),
        }
    except httpx.InvalidURL:
        raise HTTPException(status_code=400, detail="The URL is not valid.")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The request timed out after 20 seconds.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach the API: {exc.__class__.__name__}.")


@app.get("/health")
async def health():
    return {"status": "ok"}
