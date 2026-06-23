# MiMo AI Studio Proxy API

OpenAI + Anthropic compatible API proxy for Xiaomi MiMo AI Studio. Converts MiMo web chat into standard API endpoints with connection pooling and streaming support.

## Available Models

| Model ID | Description |
|----------|-------------|
| `mimo-v2-flash` | Fastest model, best for quick responses |
| `mimo-v2-flash-studio` | Studio variant with deep thinking |
| `mimo-v2-pro` | Professional model |
| `mimo-v2-omni` | Multimodal model |
| `mimo-v2.5-pro` | Latest pro model |
| `mimo-v2.5` | Latest multimodal model |

## API Endpoints

| Endpoint | Format | Description |
|----------|--------|-------------|
| `POST /v1/chat/completions` | OpenAI | Chat completions (stream + non-stream) |
| `POST /v1/messages` | Anthropic | Messages API (stream + non-stream + thinking) |
| `GET /v1/models` | OpenAI | List all models |
| `GET /v1/config` | Raw | MiMo Studio config |
| `GET /docs` | Swagger | Interactive API docs |
| `GET /health` | JSON | Health check |

## Quick Start

```bash
pip install -e .
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Usage Examples

### OpenAI Format (Streaming)
```bash
curl -N http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2-flash",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### OpenAI Format (Non-streaming)
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Anthropic Format
```bash
curl http://localhost:8000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false,
    "thinking": {"type": "enabled", "budget_tokens": 5000}
  }'
```

## Configuration

Update the credentials in `main.py`:
- `DEFAULT_SERVICE_TOKEN` - Your MiMo service token (from cookies)
- `DEFAULT_USER_ID` - Your MiMo user ID
- `DEFAULT_XIAOMICHATBOT_PH` - Your xiaomichatbot_ph cookie value

## Performance Optimizations

- HTTP/2 persistent connection pooling
- 4 worker processes for parallel handling
- Pre-built headers (zero per-request allocation)
- Thinking disabled by default (saves reasoning time)
- Default model: `mimo-v2-flash` (fastest)
- Streaming enabled by default

## Tech Stack

- FastAPI + Uvicorn
- httpx with HTTP/2
- Pydantic v2
