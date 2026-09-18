# API Inspector

A lightweight API request workbench built with FastAPI and vanilla JavaScript.

## Features

- GET, POST, PUT, PATCH and DELETE requests
- Headers, query parameters and JSON body
- Request history stored locally in the browser
- JSON response formatting
- cURL command generation
- JWT payload inspection
- Response status, timing and size metrics
- Environment variables such as `{{BASE_URL}}` and `{{TOKEN}}`
- Responsive developer-focused interface

## Run locally

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000.

## Stack

FastAPI · Python · httpx · HTML · CSS · JavaScript
