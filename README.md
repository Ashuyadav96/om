# MiMo AI Studio Proxy API v3.0

Advanced multi-language OpenAI + Anthropic + Google Gemini compatible API proxy for Xiaomi MiMo AI Studio. Features 100+ languages, conversation memory, caching, rate limiting, translation, summarization, code assistant, and more.

## Features

- **4 API Formats**: OpenAI, Anthropic, Google Gemini, and Custom endpoints
- **100+ Languages**: Full multi-language support with native prompting
- **6 AI Models**: Flash, Pro, Omni, Studio variants
- **Conversation Memory**: Create, manage, and continue conversations
- **Response Caching**: LRU cache for repeated queries
- **Rate Limiting**: Token bucket (120 req/min)
- **Translation**: Translate between any supported languages
- **Summarization**: Summarize text in any language
- **Code Assistant**: Generate, explain, fix, optimize, review code
- **Streaming**: Real-time token streaming for all formats
- **Connection Pooling**: HTTP/2 with persistent connections

## Models

| Model | Speed | Context | Capabilities |
|-------|-------|---------|--------------|
| `mimo-v2-flash` | ~4s | 32K | chat, code, reasoning |
| `mimo-v2-flash-studio` | ~5s | 32K | + deep-thinking |
| `mimo-v2-pro` | ~6s | 64K | + analysis |
| `mimo-v2-omni` | ~6s | 64K | + vision, multimodal |
| `mimo-v2.5-pro` | ~10s | 128K | + math, flagship |
| `mimo-v2.5` | ~6s | 128K | + extended context |

## Quick Start

```bash
pip install -e .
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Core Chat APIs

#### OpenAI Format
```bash
curl -N http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2-flash",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true,
    "language": "hi"
  }'
```

#### Anthropic Format
```bash
curl http://localhost:8000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}],
    "language": "ja"
  }'
```

#### Gemini Format
```bash
curl http://localhost:8000/v1/gemini/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "contents": [{"role": "user", "parts": [{"text": "Hello!"}]}],
    "language": "zh"
  }'
```

### Advanced Endpoints

#### Translation
```bash
curl http://localhost:8000/v1/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "target_language": "hi"}'
```

#### Summarization
```bash
curl http://localhost:8000/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Long text here...", "language": "en", "max_length": "short"}'
```

#### Code Assistant
```bash
curl http://localhost:8000/v1/code \
  -H "Content-Type: application/json" \
  -d '{"prompt": "binary search in python", "task": "generate", "language": "python"}'
```

### Conversation Management
```bash
# Create conversation
curl -X POST http://localhost:8000/v1/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "My Chat", "language": "en"}'

# Chat within conversation
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hi"}], "conversation_id": "CONV_ID"}'

# Get conversation history
curl http://localhost:8000/v1/conversations/CONV_ID
```

### Utilities
```bash
# List all 100+ languages
curl http://localhost:8000/v1/languages

# API stats
curl http://localhost:8000/v1/stats

# List models
curl http://localhost:8000/v1/models

# Health check
curl http://localhost:8000/health
```

## Supported Languages (100+)

English, Hindi, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, Russian, Arabic, Italian, Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Swahili, Ukrainian, Czech, Romanian, Hungarian, Greek, Swedish, Danish, Finnish, Norwegian, Hebrew, Persian, Filipino, Nepali, Sinhala, Burmese, Khmer, Lao, Amharic, Zulu, Afrikaans, Catalan, Croatian, Slovak, Bulgarian, Serbian, Lithuanian, Latvian, Estonian, Slovenian, Icelandic, Irish, Welsh, Albanian, Macedonian, Bosnian, Georgian, Armenian, Azerbaijani, Uzbek, Kazakh, Mongolian, Tajik, Kyrgyz, Turkmen, Pashto, Sindhi, Hausa, Yoruba, Igbo, Somali, Malagasy, Latin, Esperanto, Javanese, Sundanese, Cebuano, Maori, Hawaiian, Samoan, Galician, Basque, Corsican, Frisian, Scots Gaelic, Luxembourgish, Xhosa, Sesotho, Shona, Kinyarwanda, and more.

## Configuration

Update credentials in `main.py`:
- `DEFAULT_SERVICE_TOKEN` - MiMo service token
- `DEFAULT_USER_ID` - MiMo user ID
- `DEFAULT_XIAOMICHATBOT_PH` - Session cookie

## Tech Stack

- FastAPI + Uvicorn (4 workers)
- httpx with HTTP/2 + connection pooling
- Pydantic v2
- LRU Cache + Rate Limiter
- In-memory conversation store
