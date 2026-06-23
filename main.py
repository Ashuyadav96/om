"""
MiMo AI Studio Proxy API v3.0 — Advanced Multi-Language Edition
================================================================
A production-grade, OpenAI + Anthropic + Google Gemini compatible API proxy
for Xiaomi MiMo AI Studio. Features multi-language support, conversation
management, web search, rate limiting, caching, and more.

Supported API formats:
- OpenAI Chat Completions (/v1/chat/completions)
- OpenAI Responses (/v1/responses)
- Anthropic Messages (/v1/messages)
- Google Gemini (/v1/gemini/generateContent)
- Custom endpoints for advanced features
"""

import json
import uuid
import time
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Any, Dict
from contextlib import asynccontextmanager
from collections import OrderedDict

import httpx
from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
# CACHING & RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

class LRUCache:
    """Simple LRU cache for response caching."""
    def __init__(self, maxsize: int = 200):
        self._cache: OrderedDict = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> Optional[dict]:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def set(self, key: str, value: dict):
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
        self._cache[key] = value

    def clear(self):
        self._cache.clear()

    @property
    def size(self) -> int:
        return len(self._cache)


class RateLimiter:
    """Token bucket rate limiter."""
    def __init__(self, requests_per_minute: int = 60):
        self._rpm = requests_per_minute
        self._tokens = requests_per_minute
        self._last_refill = time.time()

    def allow(self) -> bool:
        now = time.time()
        elapsed = now - self._last_refill
        self._tokens = min(self._rpm, self._tokens + elapsed * (self._rpm / 60.0))
        self._last_refill = now
        if self._tokens >= 1:
            self._tokens -= 1
            return True
        return False

    @property
    def remaining(self) -> int:
        return int(self._tokens)


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSATION MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

class ConversationStore:
    """In-memory conversation history manager."""
    def __init__(self, max_conversations: int = 500, max_messages_per_conv: int = 100):
        self._store: Dict[str, Dict] = {}
        self._max_conversations = max_conversations
        self._max_messages = max_messages_per_conv

    def create(self, conv_id: Optional[str] = None, title: str = "New Chat") -> str:
        cid = conv_id or uuid.uuid4().hex[:32]
        self._store[cid] = {
            "id": cid,
            "title": title,
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "model": "mimo-v2-flash",
            "language": "en",
        }
        if len(self._store) > self._max_conversations:
            oldest = next(iter(self._store))
            del self._store[oldest]
        return cid

    def add_message(self, conv_id: str, role: str, content: str):
        if conv_id not in self._store:
            self.create(conv_id)
        msgs = self._store[conv_id]["messages"]
        msgs.append({"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()})
        if len(msgs) > self._max_messages:
            self._store[conv_id]["messages"] = msgs[-self._max_messages:]
        self._store[conv_id]["updated_at"] = datetime.now(timezone.utc).isoformat()

    def get(self, conv_id: str) -> Optional[Dict]:
        return self._store.get(conv_id)

    def list_all(self) -> List[Dict]:
        return [{"id": v["id"], "title": v["title"], "created_at": v["created_at"], "updated_at": v["updated_at"], "message_count": len(v["messages"])} for v in self._store.values()]

    def delete(self, conv_id: str) -> bool:
        if conv_id in self._store:
            del self._store[conv_id]
            return True
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-LANGUAGE SUPPORT
# ═══════════════════════════════════════════════════════════════════════════════

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English", "system_prompt": "Respond in English."},
    "hi": {"name": "Hindi", "native": "हिन्दी", "system_prompt": "हिन्दी में उत्तर दें।"},
    "zh": {"name": "Chinese", "native": "中文", "system_prompt": "请用中文回答。"},
    "ja": {"name": "Japanese", "native": "日本語", "system_prompt": "日本語で回答してください。"},
    "ko": {"name": "Korean", "native": "한국어", "system_prompt": "한국어로 답변해 주세요."},
    "es": {"name": "Spanish", "native": "Español", "system_prompt": "Responde en español."},
    "fr": {"name": "French", "native": "Français", "system_prompt": "Répondez en français."},
    "de": {"name": "German", "native": "Deutsch", "system_prompt": "Antworten Sie auf Deutsch."},
    "pt": {"name": "Portuguese", "native": "Português", "system_prompt": "Responda em português."},
    "ru": {"name": "Russian", "native": "Русский", "system_prompt": "Отвечайте на русском языке."},
    "ar": {"name": "Arabic", "native": "العربية", "system_prompt": "أجب باللغة العربية."},
    "it": {"name": "Italian", "native": "Italiano", "system_prompt": "Rispondi in italiano."},
    "nl": {"name": "Dutch", "native": "Nederlands", "system_prompt": "Antwoord in het Nederlands."},
    "pl": {"name": "Polish", "native": "Polski", "system_prompt": "Odpowiedz po polsku."},
    "tr": {"name": "Turkish", "native": "Türkçe", "system_prompt": "Türkçe cevap verin."},
    "vi": {"name": "Vietnamese", "native": "Tiếng Việt", "system_prompt": "Trả lời bằng tiếng Việt."},
    "th": {"name": "Thai", "native": "ไทย", "system_prompt": "ตอบเป็นภาษาไทย"},
    "id": {"name": "Indonesian", "native": "Bahasa Indonesia", "system_prompt": "Jawab dalam Bahasa Indonesia."},
    "ms": {"name": "Malay", "native": "Bahasa Melayu", "system_prompt": "Jawab dalam Bahasa Melayu."},
    "bn": {"name": "Bengali", "native": "বাংলা", "system_prompt": "বাংলায় উত্তর দিন।"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "system_prompt": "தமிழில் பதிலளிக்கவும்."},
    "te": {"name": "Telugu", "native": "తెలుగు", "system_prompt": "తెలుగులో సమాధానం ఇవ్వండి."},
    "mr": {"name": "Marathi", "native": "मराठी", "system_prompt": "मराठीत उत्तर द्या."},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "system_prompt": "ગુજરાતીમાં જવાબ આપો."},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "system_prompt": "ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ."},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "system_prompt": "മലയാളത്തിൽ ഉത്തരം നൽകുക."},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "system_prompt": "ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।"},
    "ur": {"name": "Urdu", "native": "اردو", "system_prompt": "اردو میں جواب دیں۔"},
    "sw": {"name": "Swahili", "native": "Kiswahili", "system_prompt": "Jibu kwa Kiswahili."},
    "uk": {"name": "Ukrainian", "native": "Українська", "system_prompt": "Відповідайте українською."},
    "cs": {"name": "Czech", "native": "Čeština", "system_prompt": "Odpovězte česky."},
    "ro": {"name": "Romanian", "native": "Română", "system_prompt": "Răspundeți în română."},
    "hu": {"name": "Hungarian", "native": "Magyar", "system_prompt": "Válaszoljon magyarul."},
    "el": {"name": "Greek", "native": "Ελληνικά", "system_prompt": "Απαντήστε στα ελληνικά."},
    "sv": {"name": "Swedish", "native": "Svenska", "system_prompt": "Svara på svenska."},
    "da": {"name": "Danish", "native": "Dansk", "system_prompt": "Svar på dansk."},
    "fi": {"name": "Finnish", "native": "Suomi", "system_prompt": "Vastaa suomeksi."},
    "no": {"name": "Norwegian", "native": "Norsk", "system_prompt": "Svar på norsk."},
    "he": {"name": "Hebrew", "native": "עברית", "system_prompt": "ענה בעברית."},
    "fa": {"name": "Persian", "native": "فارسی", "system_prompt": "به فارسی پاسخ دهید."},
    "fil": {"name": "Filipino", "native": "Filipino", "system_prompt": "Sumagot sa Filipino."},
    "ne": {"name": "Nepali", "native": "नेपाली", "system_prompt": "नेपालीमा जवाफ दिनुहोस्।"},
    "si": {"name": "Sinhala", "native": "සිංහල", "system_prompt": "සිංහලෙන් පිළිතුරු දෙන්න."},
    "my": {"name": "Burmese", "native": "မြန်မာ", "system_prompt": "မြန်မာဘာသာဖြင့် ဖြေပါ။"},
    "km": {"name": "Khmer", "native": "ខ្មែរ", "system_prompt": "ឆ្លើយជាភាសាខ្មែរ។"},
    "lo": {"name": "Lao", "native": "ລາວ", "system_prompt": "ຕອບເປັນພາສາລາວ."},
    "am": {"name": "Amharic", "native": "አማርኛ", "system_prompt": "በአማርኛ መልስ ስጥ።"},
    "zu": {"name": "Zulu", "native": "isiZulu", "system_prompt": "Phendula ngesiZulu."},
    "af": {"name": "Afrikaans", "native": "Afrikaans", "system_prompt": "Antwoord in Afrikaans."},
    "ca": {"name": "Catalan", "native": "Català", "system_prompt": "Respon en català."},
    "hr": {"name": "Croatian", "native": "Hrvatski", "system_prompt": "Odgovorite na hrvatskom."},
    "sk": {"name": "Slovak", "native": "Slovenčina", "system_prompt": "Odpovedzte po slovensky."},
    "bg": {"name": "Bulgarian", "native": "Български", "system_prompt": "Отговорете на български."},
    "sr": {"name": "Serbian", "native": "Српски", "system_prompt": "Одговорите на српском."},
    "lt": {"name": "Lithuanian", "native": "Lietuvių", "system_prompt": "Atsakykite lietuviškai."},
    "lv": {"name": "Latvian", "native": "Latviešu", "system_prompt": "Atbildiet latviešu valodā."},
    "et": {"name": "Estonian", "native": "Eesti", "system_prompt": "Vastake eesti keeles."},
    "sl": {"name": "Slovenian", "native": "Slovenščina", "system_prompt": "Odgovorite v slovenščini."},
    "is": {"name": "Icelandic", "native": "Íslenska", "system_prompt": "Svaraðu á íslensku."},
    "ga": {"name": "Irish", "native": "Gaeilge", "system_prompt": "Freagair i nGaeilge."},
    "mt": {"name": "Maltese", "native": "Malti", "system_prompt": "Wieġeb bil-Malti."},
    "cy": {"name": "Welsh", "native": "Cymraeg", "system_prompt": "Atebwch yn Gymraeg."},
    "sq": {"name": "Albanian", "native": "Shqip", "system_prompt": "Përgjigju në shqip."},
    "mk": {"name": "Macedonian", "native": "Македонски", "system_prompt": "Одговорете на македонски."},
    "bs": {"name": "Bosnian", "native": "Bosanski", "system_prompt": "Odgovorite na bosanskom."},
    "ka": {"name": "Georgian", "native": "ქართული", "system_prompt": "უპასუხეთ ქართულად."},
    "hy": {"name": "Armenian", "native": "Հայերեն", "system_prompt": "Պատասխանեք հայերենով."},
    "az": {"name": "Azerbaijani", "native": "Azərbaycan", "system_prompt": "Azərbaycan dilində cavab verin."},
    "uz": {"name": "Uzbek", "native": "O'zbek", "system_prompt": "O'zbek tilida javob bering."},
    "kk": {"name": "Kazakh", "native": "Қазақ", "system_prompt": "Қazağşa jawap beriñiz."},
    "mn": {"name": "Mongolian", "native": "Монгол", "system_prompt": "Монгол хэлээр хариулна уу."},
    "tg": {"name": "Tajik", "native": "Тоҷикӣ", "system_prompt": "Ба забони тоҷикӣ ҷавоб диҳед."},
    "ky": {"name": "Kyrgyz", "native": "Кыргыз", "system_prompt": "Кыргызча жооп бериңиз."},
    "tk": {"name": "Turkmen", "native": "Türkmen", "system_prompt": "Türkmen dilinde jogap beriň."},
    "ps": {"name": "Pashto", "native": "پښتو", "system_prompt": "په پښتو ځواب ورکړئ."},
    "sd": {"name": "Sindhi", "native": "سنڌي", "system_prompt": "سنڌيءَ ۾ جواب ڏيو."},
    "ha": {"name": "Hausa", "native": "Hausa", "system_prompt": "Amsa da Hausa."},
    "yo": {"name": "Yoruba", "native": "Yorùbá", "system_prompt": "Dahun ni Yorùbá."},
    "ig": {"name": "Igbo", "native": "Igbo", "system_prompt": "Zaa n'Igbo."},
    "so": {"name": "Somali", "native": "Soomaali", "system_prompt": "Ku jawaab Soomaali."},
    "mg": {"name": "Malagasy", "native": "Malagasy", "system_prompt": "Valio amin'ny teny Malagasy."},
    "la": {"name": "Latin", "native": "Latina", "system_prompt": "Responde Latine."},
    "eo": {"name": "Esperanto", "native": "Esperanto", "system_prompt": "Respondu en Esperanto."},
    "jv": {"name": "Javanese", "native": "Basa Jawa", "system_prompt": "Wangsulana nganggo Basa Jawa."},
    "su": {"name": "Sundanese", "native": "Basa Sunda", "system_prompt": "Jawab dina Basa Sunda."},
    "ceb": {"name": "Cebuano", "native": "Cebuano", "system_prompt": "Tubaga sa Cebuano."},
    "ny": {"name": "Chichewa", "native": "Chichewa", "system_prompt": "Yankhani mu Chichewa."},
    "mi": {"name": "Maori", "native": "Te Reo Māori", "system_prompt": "Whakautu mai i te Reo Māori."},
    "haw": {"name": "Hawaiian", "native": "ʻŌlelo Hawaiʻi", "system_prompt": "E pane mai ma ka ʻŌlelo Hawaiʻi."},
    "sm": {"name": "Samoan", "native": "Gagana Sāmoa", "system_prompt": "Tali mai i le Gagana Sāmoa."},
    "gl": {"name": "Galician", "native": "Galego", "system_prompt": "Responde en galego."},
    "eu": {"name": "Basque", "native": "Euskara", "system_prompt": "Erantzun euskaraz."},
    "co": {"name": "Corsican", "native": "Corsu", "system_prompt": "Rispondi in corsu."},
    "fy": {"name": "Frisian", "native": "Frysk", "system_prompt": "Antwurdzje yn it Frysk."},
    "gd": {"name": "Scots Gaelic", "native": "Gàidhlig", "system_prompt": "Freagair ann an Gàidhlig."},
    "lb": {"name": "Luxembourgish", "native": "Lëtzebuergesch", "system_prompt": "Äntwert op Lëtzebuergesch."},
    "xh": {"name": "Xhosa", "native": "isiXhosa", "system_prompt": "Phendula ngesiXhosa."},
    "st": {"name": "Sesotho", "native": "Sesotho", "system_prompt": "Araba ka Sesotho."},
    "sn": {"name": "Shona", "native": "chiShona", "system_prompt": "Pindura nechiShona."},
    "rw": {"name": "Kinyarwanda", "native": "Ikinyarwanda", "system_prompt": "Subiza mu Kinyarwanda."},
}


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATION SETUP
# ═══════════════════════════════════════════════════════════════════════════════

_client: Optional[httpx.AsyncClient] = None
_cache = LRUCache(maxsize=500)
_rate_limiter = RateLimiter(requests_per_minute=120)
_conversations = ConversationStore()
_request_count = 0
_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    _client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=3.0, read=120.0, write=5.0, pool=3.0),
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=40),
        http2=True,
    )
    yield
    await _client.aclose()


app = FastAPI(
    title="MiMo AI Studio Proxy API",
    description="Advanced multi-language OpenAI + Anthropic + Gemini compatible proxy for Xiaomi MiMo AI Studio",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

MIMO_API_URL = "https://aistudio.xiaomimimo.com/open-apis/bot/chat"
MIMO_CONFIG_URL = "https://aistudio.xiaomimimo.com/open-apis/bot/config"

DEFAULT_SERVICE_TOKEN = 'lBp+en8jmZclRZ3zFZn3GJyon3Me8KBPE6LWfcWDAbaFQoJV1h5c0OhVxm4S3zZ833hoJqL2993yLU/Uot6gEyAAgf0ZHeb5rW/6b3wBrlAXezBSDB2a1W2XeE8fsNObprnZ1BtARuuN5wftZhfqEc2NYwXygt8LsknLEI8EnLoAMepDaFZpSSMAMRAcl3VS4Mcx401huFS+ix7yPr9489B3/WWP7+SGtP9S01UqEsm4Y/RNsYSO6zTT6ZcDrD5TaUMT8TmU3SSY4FP332YfMUKakc2CbF+RH8CtK9brP9J+aRqB3sqHwm0hv8WqREHi9MH8gVKCkxVUB4R9Lwe7w/ItTHPPydDUGa6fnTS3WEI='
DEFAULT_USER_ID = '5696702022'
DEFAULT_XIAOMICHATBOT_PH = 'sBE3yqlR5IdRFi3m9ujOmA=='

AVAILABLE_MODELS = [
    {"id": "mimo-v2-flash", "name": "MiMo-V2-Flash", "description": "Fastest model (~4s), best for quick responses", "context_length": 32768, "capabilities": ["chat", "code", "reasoning"]},
    {"id": "mimo-v2-flash-studio", "name": "MiMo-V2-Flash-Studio", "description": "Studio variant with enhanced reasoning", "context_length": 32768, "capabilities": ["chat", "code", "reasoning", "deep-thinking"]},
    {"id": "mimo-v2-pro", "name": "MiMo-V2-Pro", "description": "Professional model for complex tasks", "context_length": 65536, "capabilities": ["chat", "code", "reasoning", "deep-thinking", "analysis"]},
    {"id": "mimo-v2-omni", "name": "MiMo-V2-Omni", "description": "Multimodal model with vision support", "context_length": 65536, "capabilities": ["chat", "code", "reasoning", "vision", "multimodal"]},
    {"id": "mimo-v2.5-pro", "name": "MiMo-V2.5-Pro", "description": "Latest flagship with superior reasoning", "context_length": 131072, "capabilities": ["chat", "code", "reasoning", "deep-thinking", "analysis", "math"]},
    {"id": "mimo-v2.5", "name": "MiMo-V2.5", "description": "Latest multimodal with extended context", "context_length": 131072, "capabilities": ["chat", "code", "reasoning", "vision", "multimodal"]},
]

VALID_MODEL_IDS = {m["id"] for m in AVAILABLE_MODELS}

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


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class Message(BaseModel):
    role: str
    content: Any  # str or list of content blocks


class ChatCompletionRequest(BaseModel):
    model: str = "mimo-v2-flash"
    messages: List[Message]
    temperature: Optional[float] = 0.8
    top_p: Optional[float] = 0.95
    stream: Optional[bool] = True
    max_tokens: Optional[int] = None
    thinking: Optional[bool] = False
    web_search: Optional[str] = "disabled"
    language: Optional[str] = None  # ISO 639 code
    conversation_id: Optional[str] = None  # For conversation memory
    cache: Optional[bool] = False  # Enable response caching
    system: Optional[str] = None  # System prompt override


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
    language: Optional[str] = None


class GeminiContent(BaseModel):
    role: Optional[str] = "user"
    parts: List[Dict[str, Any]]

class GeminiRequest(BaseModel):
    contents: List[GeminiContent]
    generationConfig: Optional[Dict[str, Any]] = None
    model: Optional[str] = "mimo-v2.5-pro"
    language: Optional[str] = None


class TranslateRequest(BaseModel):
    text: str
    source_language: Optional[str] = "auto"
    target_language: str = "en"
    model: Optional[str] = "mimo-v2-flash"


class SummarizeRequest(BaseModel):
    text: str
    language: Optional[str] = "en"
    max_length: Optional[str] = "medium"  # short, medium, long
    model: Optional[str] = "mimo-v2-flash"


class CodeRequest(BaseModel):
    prompt: str
    language: Optional[str] = "python"  # programming language
    task: Optional[str] = "generate"  # generate, explain, fix, optimize, review
    model: Optional[str] = "mimo-v2.5-pro"


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New Chat"
    model: Optional[str] = "mimo-v2-flash"
    language: Optional[str] = "en"


# ═══════════════════════════════════════════════════════════════════════════════
# CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

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


def messages_to_query(messages: List[Message], system: Optional[str] = None, language: Optional[str] = None) -> str:
    parts = []
    # Add language instruction
    if language and language in SUPPORTED_LANGUAGES:
        parts.append(f"[System]: {SUPPORTED_LANGUAGES[language]['system_prompt']}")
    # Add custom system prompt
    if system:
        parts.append(f"[System]: {system}")

    for msg in messages:
        content_text = ""
        if isinstance(msg.content, str):
            content_text = msg.content
        elif isinstance(msg.content, list):
            text_parts = []
            for block in msg.content:
                if isinstance(block, dict):
                    if block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                    elif block.get("type") == "image_url":
                        text_parts.append("[image]")
            content_text = "\n".join(text_parts)

        if msg.role == "system":
            parts.append(f"[System]: {content_text}")
        elif msg.role == "assistant":
            parts.append(f"[Assistant]: {content_text}")
        else:
            parts.append(content_text)

    if len(messages) == 1 and messages[0].role == "user" and not system and not language:
        if isinstance(messages[0].content, str):
            return messages[0].content
    return "\n\n".join(parts)


def parse_think(full_text: str):
    text = full_text.replace("\x00", "")
    if "<think>" not in text:
        return text, ""
    think_start = text.find("<think>")
    before = text[:think_start]
    inner_start = think_start + 7
    end = text.find("</think>")
    if end != -1:
        think_content = text[inner_start:end].strip()
        after = text[end + 8:]
        return (before + after).strip(), think_content
    return before.strip(), text[inner_start:].strip()


def cache_key(model: str, query: str, temperature: float = 0.8, top_p: float = 0.95, thinking: bool = False, web_search: str = "disabled") -> str:
    raw = f"{model}:{query}:{temperature}:{top_p}:{thinking}:{web_search}"
    return hashlib.md5(raw.encode()).hexdigest()


async def call_mimo_stream(body: dict):
    """Core streaming call to MiMo API."""
    async with _client.stream("POST", MIMO_API_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES, json=body) as resp:
        if resp.status_code != 200:
            err = await resp.aread()
            yield {"error": err.decode()}
            return
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
            if isinstance(data, dict):
                yield data


async def call_mimo_full(body: dict) -> tuple:
    """Full (non-streaming) call to MiMo API. Returns (content, thinking, usage)."""
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
    return content, thinking, usage


# ═══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    global _request_count
    _request_count += 1

    # Skip rate limiting for health/docs/static
    if request.url.path in ("/health", "/docs", "/openapi.json", "/", "/v1/models"):
        return await call_next(request)

    if not _rate_limiter.allow():
        return JSONResponse(
            status_code=429,
            content={"error": {"type": "rate_limit_error", "message": "Rate limit exceeded. Max 120 requests/minute."}},
        )
    return await call_next(request)


# ═══════════════════════════════════════════════════════════════════════════════
# ROOT & INFO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/", response_class=HTMLResponse)
async def root():
    return """<!DOCTYPE html>
<html><head><title>MiMo AI Proxy v3.0</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:2rem;background:#0d1117;color:#c9d1d9}
h1{color:#58a6ff}h2{color:#79c0ff;border-bottom:1px solid #21262d;padding-bottom:0.5rem}
a{color:#58a6ff;text-decoration:none}a:hover{text-decoration:underline}
code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre{background:#161b22;padding:1rem;border-radius:8px;overflow-x:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
.card{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:1rem}
.badge{display:inline-block;background:#1f6feb;color:white;padding:2px 8px;border-radius:12px;font-size:0.75em;margin:2px}
</style></head><body>
<h1>MiMo AI Studio Proxy API v3.0</h1>
<p>Advanced multi-language OpenAI + Anthropic + Gemini compatible proxy with 100+ languages.</p>

<h2>API Endpoints</h2>
<div class="grid">
<div class="card"><h3>OpenAI Compatible</h3>
<code>POST /v1/chat/completions</code><br>
<code>GET /v1/models</code></div>
<div class="card"><h3>Anthropic Compatible</h3>
<code>POST /v1/messages</code></div>
<div class="card"><h3>Gemini Compatible</h3>
<code>POST /v1/gemini/generateContent</code></div>
<div class="card"><h3>Advanced</h3>
<code>POST /v1/translate</code><br>
<code>POST /v1/summarize</code><br>
<code>POST /v1/code</code></div>
<div class="card"><h3>Conversations</h3>
<code>GET /v1/conversations</code><br>
<code>POST /v1/conversations</code><br>
<code>GET /v1/conversations/{id}</code></div>
<div class="card"><h3>Utilities</h3>
<code>GET /v1/languages</code><br>
<code>GET /v1/stats</code><br>
<code>GET /health</code><br>
<code>GET /docs</code></div>
</div>

<h2>Models</h2>
<div class="grid">
<div class="card"><strong>mimo-v2-flash</strong><br>Fastest ~4s<br><span class="badge">chat</span><span class="badge">code</span></div>
<div class="card"><strong>mimo-v2.5-pro</strong><br>Best quality<br><span class="badge">reasoning</span><span class="badge">math</span></div>
<div class="card"><strong>mimo-v2-omni</strong><br>Multimodal<br><span class="badge">vision</span><span class="badge">multimodal</span></div>
<div class="card"><strong>mimo-v2.5</strong><br>Latest multi<br><span class="badge">vision</span><span class="badge">extended</span></div>
</div>

<h2>Quick Start</h2>
<pre>curl -N /v1/chat/completions -H "Content-Type: application/json" \\
  -d '{"model":"mimo-v2-flash","messages":[{"role":"user","content":"Hello!"}],"language":"hi"}'</pre>

<p><a href="/docs">Interactive Swagger Docs →</a> | <a href="/v1/languages">100+ Supported Languages →</a></p>
</body></html>"""


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": m["id"],
                "object": "model",
                "created": 1700000000,
                "owned_by": "xiaomi-mimo",
                "name": m["name"],
                "description": m["description"],
                "context_length": m["context_length"],
                "capabilities": m["capabilities"],
            }
            for m in AVAILABLE_MODELS
        ],
    }


@app.get("/v1/models/{model_id}")
async def get_model(model_id: str):
    for m in AVAILABLE_MODELS:
        if m["id"] == model_id:
            return {"id": m["id"], "object": "model", "created": 1700000000, "owned_by": "xiaomi-mimo", **m}
    raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")


@app.get("/v1/languages")
async def list_languages():
    """List all 100+ supported languages."""
    return {
        "total": len(SUPPORTED_LANGUAGES),
        "languages": [
            {"code": code, "name": info["name"], "native_name": info["native"]}
            for code, info in SUPPORTED_LANGUAGES.items()
        ],
    }


@app.get("/v1/stats")
async def get_stats():
    """API usage statistics."""
    uptime = time.time() - _start_time
    return {
        "version": "3.0.0",
        "uptime_seconds": int(uptime),
        "total_requests": _request_count,
        "cache_size": _cache.size,
        "cache_max": 500,
        "rate_limit_remaining": _rate_limiter.remaining,
        "active_conversations": len(_conversations._store),
        "supported_languages": len(SUPPORTED_LANGUAGES),
        "available_models": len(AVAILABLE_MODELS),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0", "models": len(AVAILABLE_MODELS), "languages": len(SUPPORTED_LANGUAGES)}


# ═══════════════════════════════════════════════════════════════════════════════
# OPENAI CHAT COMPLETIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    if request.model not in VALID_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid model '{request.model}'. Available: {list(VALID_MODEL_IDS)}")

    query = messages_to_query(request.messages, request.system, request.language)

    # Check cache
    if request.cache and not request.stream:
        ck = cache_key(request.model, query, request.temperature, request.top_p, request.thinking, request.web_search)
        cached = _cache.get(ck)
        if cached:
            cached = {**cached}
            cached["id"] = f"chatcmpl-{uuid.uuid4().hex[:12]}"
            cached["cached"] = True
            return JSONResponse(content=cached)

    body = build_body(query=query, model=request.model, thinking=request.thinking, temperature=request.temperature, top_p=request.top_p, web_search=request.web_search)

    # Save to conversation
    if request.conversation_id:
        user_content = request.messages[-1].content if request.messages else ""
        if isinstance(user_content, list):
            user_content = " ".join(b.get("text", "") for b in user_content if isinstance(b, dict))
        _conversations.add_message(request.conversation_id, "user", user_content)

    if request.stream:
        return StreamingResponse(
            openai_stream(body, request.model, request.conversation_id),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    content, thinking, usage = await call_mimo_full(body)

    # Save assistant response to conversation
    if request.conversation_id:
        _conversations.add_message(request.conversation_id, "assistant", content)

    result = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": request.model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content, **({"thinking": thinking} if thinking else {})}, "finish_reason": "stop"}],
        "usage": usage,
    }

    # Cache result
    if request.cache:
        _cache.set(cache_key(request.model, query, request.temperature, request.top_p, request.thinking, request.web_search), result)

    return JSONResponse(content=result)


async def openai_stream(body: dict, model: str, conversation_id: Optional[str] = None):
    chat_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    full_content = ""
    in_think = False

    async for data in call_mimo_stream(body):
        if "error" in data:
            err_msg = f"Error: {data['error']}"
            chunk = {"id": chat_id, "object": "chat.completion.chunk", "created": created, "model": model, "choices": [{"index": 0, "delta": {"content": err_msg}, "finish_reason": "stop"}]}
            yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"
            return

        if data.get("type") == "text":
            c = data.get("content", "").replace("\x00", "")
            if not c:
                continue
            output = ""
            if "<think>" in c:
                output += c[:c.find("<think>")]
                in_think = True
            if "</think>" in c:
                in_think = False
                output += c[c.find("</think>") + 8:]
            elif not in_think and "<think>" not in c:
                output = c
            if not output:
                continue
            full_content += output
            yield f"data: {json.dumps({'id': chat_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {'content': output}, 'finish_reason': None}]})}\n\n"

        elif data.get("content") == "[DONE]":
            yield f"data: {json.dumps({'id': chat_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"

    if conversation_id and full_content:
        _conversations.add_message(conversation_id, "assistant", full_content)

    yield "data: [DONE]\n\n"


# ═══════════════════════════════════════════════════════════════════════════════
# ANTHROPIC MESSAGES API
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/messages")
async def anthropic_messages(request: AnthropicMessagesRequest):
    if request.model not in VALID_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid model '{request.model}'. Available: {list(VALID_MODEL_IDS)}")

    enable_thinking = request.thinking and request.thinking.type == "enabled"

    # Build query with language support
    parts = []
    if request.language and request.language in SUPPORTED_LANGUAGES:
        parts.append(f"[System]: {SUPPORTED_LANGUAGES[request.language]['system_prompt']}")
    if request.system:
        parts.append(f"[System]: {request.system}")
    for msg in request.messages:
        text = msg.content if isinstance(msg.content, str) else "\n".join(b.get("text", "") for b in msg.content if isinstance(b, dict) and b.get("type") == "text")
        if msg.role == "assistant":
            parts.append(f"[Assistant]: {text}")
        else:
            parts.append(text)
    query = "\n\n".join(parts) if parts else ""

    body = build_body(query=query, model=request.model, thinking=enable_thinking, temperature=request.temperature, top_p=request.top_p, web_search="disabled")

    if request.stream:
        return StreamingResponse(anthropic_stream(body, request.model), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})

    content, thinking, usage = await call_mimo_full(body)
    blocks = []
    if thinking:
        blocks.append({"type": "thinking", "thinking": thinking})
    blocks.append({"type": "text", "text": content})

    return JSONResponse(content={
        "id": f"msg_{uuid.uuid4().hex[:24]}", "type": "message", "role": "assistant", "content": blocks,
        "model": request.model, "stop_reason": "end_turn", "stop_sequence": None,
        "usage": {"input_tokens": usage["prompt_tokens"], "output_tokens": usage["completion_tokens"]},
    })


async def anthropic_stream(body: dict, model: str):
    msg_id = f"msg_{uuid.uuid4().hex[:24]}"
    yield f"event: message_start\ndata: {json.dumps({'type': 'message_start', 'message': {'id': msg_id, 'type': 'message', 'role': 'assistant', 'content': [], 'model': model, 'stop_reason': None, 'stop_sequence': None, 'usage': {'input_tokens': 0, 'output_tokens': 0}}})}\n\n"
    yield f"event: content_block_start\ndata: {json.dumps({'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'text', 'text': ''}})}\n\n"

    output_tokens = 0
    in_think = False

    async for data in call_mimo_stream(body):
        if "error" in data:
            err_msg = f"Error: {data['error']}"
            yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': err_msg}})}\n\n"
            break
        if data.get("type") == "text":
            c = data.get("content", "").replace("\x00", "")
            if not c:
                continue
            output = ""
            if "<think>" in c:
                output += c[:c.find("<think>")]
                in_think = True
            if "</think>" in c:
                in_think = False
                output += c[c.find("</think>") + 8:]
            elif not in_think and "<think>" not in c:
                output = c
            if not output:
                continue
            yield f"event: content_block_delta\ndata: {json.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': output}})}\n\n"
        if "completionTokens" in data:
            output_tokens = data.get("completionTokens", 0)

    yield f"event: content_block_stop\ndata: {json.dumps({'type': 'content_block_stop', 'index': 0})}\n\n"
    yield f"event: message_delta\ndata: {json.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn', 'stop_sequence': None}, 'usage': {'output_tokens': output_tokens}})}\n\n"
    yield f"event: message_stop\ndata: {{\"type\": \"message_stop\"}}\n\n"


# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE GEMINI COMPATIBLE API
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/gemini/generateContent")
async def gemini_generate(request: GeminiRequest):
    """Google Gemini API compatible endpoint."""
    model = request.model or "mimo-v2.5-pro"
    if model not in VALID_MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid model '{model}'")

    # Convert Gemini format to query
    parts = []
    if request.language and request.language in SUPPORTED_LANGUAGES:
        parts.append(f"[System]: {SUPPORTED_LANGUAGES[request.language]['system_prompt']}")
    for content in request.contents:
        text_parts = [p.get("text", "") for p in content.parts if "text" in p]
        text = "\n".join(text_parts)
        if content.role == "model":
            parts.append(f"[Assistant]: {text}")
        else:
            parts.append(text)
    query = "\n\n".join(parts)

    temp = 0.8
    top_p = 0.95
    if request.generationConfig:
        temp = request.generationConfig.get("temperature", 0.8)
        top_p = request.generationConfig.get("topP", 0.95)

    body = build_body(query=query, model=model, thinking=False, temperature=temp, top_p=top_p, web_search="disabled")
    content, thinking, usage = await call_mimo_full(body)

    return JSONResponse(content={
        "candidates": [{
            "content": {"parts": [{"text": content}], "role": "model"},
            "finishReason": "STOP",
            "index": 0,
        }],
        "usageMetadata": {
            "promptTokenCount": usage["prompt_tokens"],
            "candidatesTokenCount": usage["completion_tokens"],
            "totalTokenCount": usage["total_tokens"],
        },
        "modelVersion": model,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSLATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/translate")
async def translate(request: TranslateRequest):
    """Translate text between any supported languages."""
    target = SUPPORTED_LANGUAGES.get(request.target_language, {}).get("name", request.target_language)
    source = SUPPORTED_LANGUAGES.get(request.source_language, {}).get("name", "auto-detect") if request.source_language != "auto" else "auto-detect"

    if request.source_language == "auto":
        prompt = f"Translate the following text to {target}. Only output the translation, nothing else:\n\n{request.text}"
    else:
        prompt = f"Translate the following text from {source} to {target}. Only output the translation, nothing else:\n\n{request.text}"

    body = build_body(query=prompt, model=request.model, thinking=False, temperature=0.3, top_p=0.9, web_search="disabled")
    content, _, usage = await call_mimo_full(body)

    return JSONResponse(content={
        "translated_text": content,
        "source_language": request.source_language,
        "target_language": request.target_language,
        "model": request.model,
        "usage": usage,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARIZATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/summarize")
async def summarize(request: SummarizeRequest):
    """Summarize text in any language."""
    length_map = {"short": "1-2 sentences", "medium": "a short paragraph", "long": "a detailed paragraph"}
    length_desc = length_map.get(request.max_length, "a short paragraph")

    lang_instruction = ""
    if request.language and request.language in SUPPORTED_LANGUAGES:
        lang_instruction = f" Respond in {SUPPORTED_LANGUAGES[request.language]['name']}."

    prompt = f"Summarize the following text in {length_desc}.{lang_instruction} Only output the summary:\n\n{request.text}"

    body = build_body(query=prompt, model=request.model, thinking=False, temperature=0.4, top_p=0.9, web_search="disabled")
    content, _, usage = await call_mimo_full(body)

    return JSONResponse(content={
        "summary": content,
        "language": request.language,
        "length": request.max_length,
        "model": request.model,
        "usage": usage,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# CODE GENERATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/code")
async def code_assistant(request: CodeRequest):
    """Code generation, explanation, fixing, optimization, and review."""
    task_prompts = {
        "generate": f"Write {request.language} code for the following. Only output the code with brief comments:\n\n{request.prompt}",
        "explain": f"Explain this {request.language} code clearly and concisely:\n\n{request.prompt}",
        "fix": f"Fix the bugs in this {request.language} code. Show the corrected code and briefly explain what was wrong:\n\n{request.prompt}",
        "optimize": f"Optimize this {request.language} code for better performance. Show the optimized version and explain improvements:\n\n{request.prompt}",
        "review": f"Review this {request.language} code. Point out issues, suggest improvements, and rate it 1-10:\n\n{request.prompt}",
    }

    prompt = task_prompts.get(request.task, task_prompts["generate"])
    body = build_body(query=prompt, model=request.model, thinking=True, temperature=0.5, top_p=0.95, web_search="disabled")
    content, thinking, usage = await call_mimo_full(body)

    return JSONResponse(content={
        "result": content,
        "thinking": thinking if thinking else None,
        "task": request.task,
        "language": request.language,
        "model": request.model,
        "usage": usage,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# CONVERSATION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/v1/conversations")
async def list_conversations():
    """List all conversations."""
    return {"conversations": _conversations.list_all()}


@app.post("/v1/conversations")
async def create_conversation(request: ConversationCreateRequest):
    """Create a new conversation."""
    conv_id = _conversations.create(title=request.title)
    conv = _conversations.get(conv_id)
    conv["model"] = request.model
    conv["language"] = request.language
    return JSONResponse(content={"conversation": conv})


@app.get("/v1/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    """Get conversation history."""
    conv = _conversations.get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return JSONResponse(content={"conversation": conv})


@app.delete("/v1/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """Delete a conversation."""
    if _conversations.delete(conv_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Conversation not found")


# ═══════════════════════════════════════════════════════════════════════════════
# CACHE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/v1/cache/stats")
async def cache_stats():
    return {"size": _cache.size, "max_size": 500}


@app.delete("/v1/cache")
async def clear_cache():
    _cache.clear()
    return {"status": "cleared"}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/v1/config")
async def get_config():
    resp = await _client.get(MIMO_CONFIG_URL, params=MIMO_PARAMS, headers=MIMO_HEADERS, cookies=MIMO_COOKIES)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch config")
    return resp.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
