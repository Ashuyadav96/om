"""
MiMo AI Studio Proxy API
Converts Xiaomi MiMo AI Studio web chat into OpenAI + Anthropic compatible APIs.
Optimized for fast response times with connection pooling and streaming.
"""

import json
import uuid
import time
from typing import Optional, List, Any
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel


# ─── Persistent HTTP Client (connection pooling for speed) ────────────────────

_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    _client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0),
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        http2=True,
    )
    yield
    await _client.aclose()


app = FastAPI(
    title="MiMo AI Studio Proxy",
    description="OpenAI + Anthropic compatible API proxy for Xiaomi MiMo AI Studio. Optimized for speed.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Configuration ───────────────────────────────────────────────────────────

MIMO_API_URL = "https://aistudio.xiaomimimo.com/open-apis/bot/chat"
MIMO_CONFIG_URL = "https://aistudio.xiaomimimo.com/open-apis/bot/config"

DEFAULT_SERVICE_TOKEN = 'lBp+en8jmZclRZ3zFZn3GJyon3Me8KBPE6LWfcWDAbaFQoJV1h5c0OhVxm4S3zZ833hoJqL2993yLU/Uot6gEyAAgf0ZHeb5rW/6b3wBrlAXezBSDB2a1W2XeE8fsNObprnZ1BtARuuN5wftZhfqEc2NYwXygt8LsknLEI8EnLoAMepDaFZpSSMAMRAcl3VS4Mcx401huFS+ix7yPr9489B3/WWP7+SGtP9S01UqEsm4Y/RNsYSO6zTT6ZcDrD5TaUMT8TmU3SSY4FP332YfMUKakc2CbF+RH8CtK9brP9J+aRqB3sqHwm0hv8WqREHi9MH8gVKCkxVUB4R9Lwe7w/ItTHPPydDUGa6fnTS3WEI='
DEFAULT_USER_ID = '5696702022'
DEFAULT_XIAOMICHATBOT_PH = 'sBE3yqlR5IdRFi3m9ujOmA=='

# Only verified working models
AVAILABLE_MODELS = [
    {"id": "mimo-v2-flash", "name": "MiMo-V2-Flash", "description": "Fastest model, best for quick responses"},
    {"id": "mimo-v2-flash-studio", "name": "MiMo-V2-Flash-Studio", "description": "Studio variant with deep thinking"},
    {"id": "mimo-v2-pro", "name": "MiMo-V2-Pro", "description": "Professional model, deep thinking"},
    {"id": "mimo-v2-omni", "name": "MiMo-V2-Omni", "description": "Multimodal model"},
    {"id": "mimo-v2.5-pro", "name": "MiMo-V2.5-Pro", "description": "Latest pro model, deep thinking"},
    {"id": "mimo-v2.5", "name": "MiMo-V2.5", "description": "Latest multimodal model"},
]

VALID_MODEL_IDS = {m["id"] for m in AVAILABLE_MODELS}

# Pre-built headers (avoid re-creating each request)
MIMO_HEADERS = {
    "Accept": "*/*",
    "Content-Type": "application/json",
    "Origin": "https://aistudio.xiaomimimo.com",
    "Referer": "https://aistudio.xiaomimimo.com/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    "x-timezone": "Asia/Calcutta",
}

MIMO_COOKIES = {
    "serviceToken": DEFAULT_SERVICE_TOKEN,
    "userId": DEFAULT_USER_ID,
    "xiaomichatbot_ph": DEFAULT_XIAOMICHATBOT_PH,
}

MIMO_PARAMS = {"xiaomichatbot_ph": DEFAULT_XIAOMICHATBOT_PH}


# ─── Request Models ──────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "mimo-v2-flash"
    messages: List[Message]
    temperature: Optional[float] = 0.8
    top_p: Optional[float] = 0.95
    stream: Optional[bool] = True
    max_tokens: Optional[int] = None
    thinking: Optional[bool] = False
    web_search: Optional[str] = "disabled"


class AnthropicMessage(BaseModel):
    role: str
    content: Any

class AnthropicThinking(BaseModel):
    type: str = "enabled"
    budget_tokens: Optional[int] = 10000

class AnthropicMessagesRequest(BaseModel):
    model: str = "mimo-v2-flash"
    max_tokens: int = 4096
    messages: List[AnthropicMessage]
    system: Optional[str] = None
    temperature: Optional[float] = 0.8
    top_p: Optional[float] = 0.95
    stream: Optional[bool] = False
    stop_sequences: Optional[List[str]] = None
    thinking: Optional[AnthropicThinking] = None


# ─── Core Functions ──────────────────────────────────────────────────────────

def build_body(query: str, model: str, thinking: bool, temperature: float, top_p: float, web_search: str) -> dict:
    return {
        "msgId": uuid.uuid4().hex[:32],
        "conversationId": uuid.uuid4().hex[:32],
        "query": query,
        "modelConfig": {
            "enableThinking": thinking,
            "temperature": temperature,
            "topP": top_p,
            "webSearchStatus": web_search,
            "model": model,
        },
        "multiMedias": [],
        "attachments": [],
    }


def messages_to_query(messages: List[Message]) -> str:
    if len(messages) == 1 and messages[0].role == "user":
        return messages[0].content
    parts = []
    for msg in messages:
        if msg.role == "system":
            parts.append(f"[System]: {msg.content}")
        elif msg.role == "assistant":
            parts.append(f"[Assistant]: {msg.content}")
        else:
            parts.append(msg.content)
    return "\n\n".join(parts)


def anthropic_to_query(messages: List[AnthropicMessage], system: Optional[str] = None) -> str:
    parts = []
    if system:
        parts.append(f"[System]: {system}")
    for msg in messages:
        text = ""
        if isinstance(msg.content, str):
            text = msg.content
        elif isinstance(msg.content, list):
            text = "\n".join(
                b.get("text", "") for b in msg.content
                if isinstance(b, dict) and b.get("type") == "text"
            )
        if msg.role == "assistant":
            parts.append(f"[Assistant]: {text}")
        else:
            parts.append(text)
    if len(messages) == 1 and messages[0].role == "user" and not system:
        if isinstance(messages[0].content, str):
            return messages[0].content
    return "\n\n".join(parts)


def parse_think(full_text: str):
    text = full_text.replace("\x00", "")
    if "<think>" not in text:
        return text, ""
    start = text.find("<think>") + 7
    end = text.find("</think>")
    if end != -1:
        return text[end + 8:].strip(), text[start:end].strip()
    return "", text[start:].strip()


# ─── OpenAI Endpoints ────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "MiMo AI Studio Proxy API v2.0",
        "endpoints": {
            "openai_chat": "POST /v1/chat/completions",
            "anthropic_messages": "POST /v1/messages",
            "models": "GET /v1/models",
            "docs": "GET /docs",
        },
        "available_models": [m["id"] for m in AVAILABLE_MODELS],
    }


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {"id": m["id"], "object": "model", "created": 1700000000, "owned_by": "xiaomi", "name": m["name"], "description": m["description"]}
            for m in AVAILABLE_MODELS
        ],
    }


@app.get("/v1/models/{model_id}")
async def get_model(model_id: str):
    for m in AVAILABLE_MODELS:
        if m["id"] == model_id:
            return {"id": m["id"], "object": "model", "created": 1700000000, "owned_by": "xiaomi", "name": m["name"], "description": m["description"]}
    raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    if request.model not in VALID_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid model '{request.model}'. Available: {list(VALID_MODEL_IDS)}")

    body = build_body(
        query=messages_to_query(request.messages),
        model=request.model,
        thinking=request.thinking,
        temperature=request.temperature,
        top_p=request.top_p,
        web_search=request.web_search,
    )

    if request.stream:
        return StreamingResponse(
            openai_stream(body, request.model),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )
    return await openai_non_stream(body, request.model)


async def openai_stream(body: dict, model: str):
    chat_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())

    async with _client.stream("POST", MIMO_API_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES, json=body) as resp:
        if resp.status_code != 200:
            err = await resp.aread()
            yield f"data: {json.dumps({'id': chat_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {'content': f'Error: {err.decode()}'}, 'finish_reason': 'stop'}]})}\n\n"
            yield "data: [DONE]\n\n"
            return

        in_think = False
        async for line in resp.aiter_lines():
            if not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue

            if data.get("type") == "text":
                c = data.get("content", "").replace("\x00", "")
                if not c:
                    continue
                if "<think>" in c:
                    in_think = True
                    continue
                if "</think>" in c:
                    in_think = False
                    c = c.replace("</think>", "")
                    if not c:
                        continue
                if in_think:
                    continue
                yield f"data: {json.dumps({'id': chat_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {'content': c}, 'finish_reason': None}]})}\n\n"

            elif data.get("content") == "[DONE]":
                yield f"data: {json.dumps({'id': chat_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"

    yield "data: [DONE]\n\n"


async def openai_non_stream(body: dict, model: str):
    chat_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    full_text = ""
    usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    async with _client.stream("POST", MIMO_API_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES, json=body) as resp:
        if resp.status_code != 200:
            err = await resp.aread()
            raise HTTPException(status_code=resp.status_code, detail=err.decode())
        async for line in resp.aiter_lines():
            if not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue
            if data.get("type") == "text":
                full_text += data.get("content", "")
            if "promptTokens" in data:
                usage = {"prompt_tokens": data.get("promptTokens", 0), "completion_tokens": data.get("completionTokens", 0), "total_tokens": data.get("totalTokens", 0)}

    content, thinking = parse_think(full_text)
    msg = {"role": "assistant", "content": content}
    if thinking:
        msg["thinking"] = thinking

    return JSONResponse(content={
        "id": chat_id, "object": "chat.completion", "created": created, "model": model,
        "choices": [{"index": 0, "message": msg, "finish_reason": "stop"}],
        "usage": usage,
    })


# ─── Anthropic Messages API ─────────────────────────────────────────────────

@app.post("/v1/messages")
async def anthropic_messages(request: AnthropicMessagesRequest):
    if request.model not in VALID_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid model '{request.model}'. Available: {list(VALID_MODEL_IDS)}")

    enable_thinking = request.thinking and request.thinking.type == "enabled"

    body = build_body(
        query=anthropic_to_query(request.messages, request.system),
        model=request.model,
        thinking=enable_thinking,
        temperature=request.temperature,
        top_p=request.top_p,
        web_search="disabled",
    )

    if request.stream:
        return StreamingResponse(
            anthropic_stream(body, request.model),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )
    return await anthropic_non_stream(body, request.model)


async def anthropic_stream(body: dict, model: str):
    msg_id = f"msg_{uuid.uuid4().hex[:24]}"

    yield f"event: message_start\ndata: {json.dumps({'type': 'message_start', 'message': {'id': msg_id, 'type': 'message', 'role': 'assistant', 'content': [], 'model': model, 'stop_reason': None, 'stop_sequence': None, 'usage': {'input_tokens': 0, 'output_tokens': 0}}})}\n\n"
    yield f"event: content_block_start\ndata: {json.dumps({'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'text', 'text': ''}})}\n\n"

    output_tokens = 0
    async with _client.stream("POST", MIMO_API_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES, json=body) as resp:
        if resp.status_code != 200:
            err = await resp.aread()
            yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': f'Error: {err.decode()}'}})}\n\n"
        else:
            in_think = False
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if not raw:
                    continue
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if not isinstance(data, dict):
                    continue
                if data.get("type") == "text":
                    c = data.get("content", "").replace("\x00", "")
                    if not c:
                        continue
                    if "<think>" in c:
                        in_think = True
                        continue
                    if "</think>" in c:
                        in_think = False
                        c = c.replace("</think>", "")
                        if not c:
                            continue
                    if in_think:
                        continue
                    if c:
                        yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': c}})}\n\n"
                if "completionTokens" in data:
                    output_tokens = data.get("completionTokens", 0)

    yield f"event: content_block_stop\ndata: {json.dumps({'type': 'content_block_stop', 'index': 0})}\n\n"
    yield f"event: message_delta\ndata: {json.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn', 'stop_sequence': None}, 'usage': {'output_tokens': output_tokens}})}\n\n"
    yield f"event: message_stop\ndata: {{\"type\": \"message_stop\"}}\n\n"


async def anthropic_non_stream(body: dict, model: str):
    msg_id = f"msg_{uuid.uuid4().hex[:24]}"
    full_text = ""
    input_tokens = 0
    output_tokens = 0

    async with _client.stream("POST", MIMO_API_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES, json=body) as resp:
        if resp.status_code != 200:
            err = await resp.aread()
            raise HTTPException(status_code=resp.status_code, detail=err.decode())
        async for line in resp.aiter_lines():
            if not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue
            if data.get("type") == "text":
                full_text += data.get("content", "")
            if "promptTokens" in data:
                input_tokens = data.get("promptTokens", 0)
                output_tokens = data.get("completionTokens", 0)

    content, thinking = parse_think(full_text)
    blocks = []
    if thinking:
        blocks.append({"type": "thinking", "thinking": thinking})
    blocks.append({"type": "text", "text": content})

    return JSONResponse(content={
        "id": msg_id, "type": "message", "role": "assistant", "content": blocks,
        "model": model, "stop_reason": "end_turn", "stop_sequence": None,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    })


# ─── Utility Endpoints ───────────────────────────────────────────────────────

@app.get("/v1/config")
async def get_config():
    resp = await _client.get(MIMO_CONFIG_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch config")
    return resp.json()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
