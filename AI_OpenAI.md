# AI Guidelines: OpenAI SDK Handling

Rules for using the OpenAI Python SDK in this project.
Cross-referenced with lessons learned from `../rss-ai-curator/`.

---

## SDK Version

- **Minimum required**: `openai>=1.12.0`
- **Recommended**: `openai>=2.14.0` for native GPT-5 support without workarounds
- In SDK v2.x: `max_tokens` is deprecated — use `max_completion_tokens` instead

---

## API: Always Use Chat Completions

Always use the **Chat Completions API** for text generation. Do **not** use the Responses API
(`client.responses.create()`) — it is model-gated and returns a different response structure
(`response.output_text` vs `choices[0].message.content`), which breaks cross-model compatibility.

```python
# CORRECT
response = client.chat.completions.create(
    model=self.model,
    messages=[...],
    max_completion_tokens=1000,
)
result = response.choices[0].message.content.strip()

# WRONG — Responses API is not cross-model compatible
response = client.responses.create(model=..., input=...)
result = response.output_text
```

---

## Model Family Detection

Before building API params, detect the model family:

```python
def _is_reasoning_model(model: str) -> bool:
    """GPT-5, o1, o3 families are reasoning models with restricted parameters."""
    return (
        model.startswith("gpt-5") or
        model.startswith("o1") or
        model.startswith("o3")
    )
```

**Reasoning model families** (as of 2026):
- `gpt-5`, `gpt-5-mini`, `gpt-5-nano`
- `o1`, `o1-mini`, `o1-preview`
- `o3`, `o3-mini`

**Standard model families**:
- `gpt-4`, `gpt-4o`, `gpt-4o-mini`
- `gpt-4-turbo`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- `gpt-3.5-turbo`

---

## Parameters: GPT-4 vs GPT-5 Differences

| Parameter | GPT-4 family | GPT-5 / o1 / o3 (reasoning) |
|-----------|:------------:|:---------------------------:|
| `temperature` | ✅ supported (0.0–2.0) | ❌ NOT supported (omit or use default 1) |
| `top_p` | ✅ supported | ❌ NOT supported |
| `logprobs` | ✅ supported | ❌ NOT supported |
| `max_tokens` | ✅ works (deprecated in v2) | ❌ use `max_completion_tokens` |
| `max_completion_tokens` | ✅ works (v2+) | ✅ required |

### Token Budget

Reasoning models consume tokens for **internal reasoning steps** before producing visible output.
Setting too low a limit causes the model to return an **empty string** — the API call succeeds but
`choices[0].message.content` is `""`.

```python
# Error symptom in logs:
# "Failed to generate summary: returned ''"

# Rule: use higher token budget for reasoning models
default_tokens = 2000 if _is_reasoning_model(model) else 800
```

---

## Building Params Safely

Always build params as a dict and conditionally add restricted parameters:

```python
params = {
    "model": self.model,
    "messages": messages,
    "max_completion_tokens": max_tokens,   # use max_completion_tokens, not max_tokens
}

# Only add sampling params for non-reasoning models
if not _is_reasoning_model(self.model):
    params["temperature"] = 0.3
    # params["top_p"] = 0.9  # also gated — only add if needed

response = self.client.chat.completions.create(**params)
```

**Never** pass `temperature`, `top_p`, or `logprobs` to a reasoning model — the API returns:
```
Unsupported value: 'temperature' does not support 0.3 with this model.
Only the default (1) value is supported.
```

---

## Client Initialization

```python
from openai import OpenAI

# With optional custom base_url (e.g. OpenRouter, Azure, local proxies)
if base_url:
    client = OpenAI(api_key=api_key, base_url=base_url)
else:
    client = OpenAI(api_key=api_key)
```

- API key must come from env vars (`OPENAI_API_KEY`) — never hard-coded.
- `base_url` enables OpenAI-compatible providers (OpenRouter, Azure, local LLMs).

---

## Response Parsing

```python
# Chat Completions — always use this path
content = response.choices[0].message.content

if content is None:
    raise ValueError("Model returned empty content (check max_completion_tokens budget)")

return content.strip()
```

Always check for `None` or empty string, especially with reasoning models at low token limits.

---

## System Messages

Both GPT-4 and GPT-5 families support `role: "system"` in the Chat Completions API.

```python
messages = [
    {"role": "system", "content": "You are a professional translator."},
    {"role": "user",   "content": text},
]
```

Note: The Anthropic API handles this differently (system is a top-level parameter, not a message).
When writing dual-provider code, do not mix the two patterns.

---

## Error Handling

```python
import openai

try:
    response = client.chat.completions.create(**params)
    content = response.choices[0].message.content
    if not content:
        raise ValueError(f"Empty response from {self.model} — increase max_completion_tokens")
    return content.strip()

except openai.APIStatusError as e:
    # Catches 400/401/429/500 errors with structured body
    logger.error(f"OpenAI API error {e.status_code}: {e.message}")
    raise
except openai.APIConnectionError as e:
    logger.error(f"OpenAI connection error: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error calling OpenAI ({self.model}): {e}")
    raise
```

Prefer catching specific `openai.*` exceptions over bare `except Exception` so errors are
actionable in logs (e.g. rate limit vs. invalid param vs. network failure).

---

## Configuration

Store all model and API settings in `.env` or `config.yaml`, never in source code:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=                  # optional: e.g. https://openrouter.ai/api/v1
```

Default model: `gpt-4o-mini` — good balance of cost and quality for most tasks.

---

## Checklist When Adding a New OpenAI Call

- [ ] Client initialized with `api_key` from env (not hard-coded)
- [ ] Using `client.chat.completions.create()` (not Responses API)
- [ ] Using `max_completion_tokens` (not deprecated `max_tokens`)
- [ ] `temperature` is conditionally omitted for reasoning models (`gpt-5*`, `o1*`, `o3*`)
- [ ] Token budget is higher for reasoning models (≥ 2000 recommended)
- [ ] Response parsed via `choices[0].message.content` with empty-string guard
- [ ] Errors caught with specific `openai.*` exception types
- [ ] Model name comes from config, not hard-coded
