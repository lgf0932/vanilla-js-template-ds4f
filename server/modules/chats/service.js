import { HttpError, json } from '../../core/middleware.js';
import { decryptText, encryptText, getEncryptionKey } from '../../core/crypto.js';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'openai', name: 'OpenAI', kind: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'ollama', name: 'Ollama', kind: 'openai', baseUrl: 'http://localhost:11434/v1' },
];
const PROVIDER_KEY = 'llm:providers';
const DEFAULTS_KEY = 'llm:defaults';
const KEYS_KEY = 'accounts:llm:keys';

function parse(value, fallback) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function catalog(app) {
  const custom = parse(app.settings.get(PROVIDER_KEY, '[]'), []);
  const all = [...PROVIDERS, ...(Array.isArray(custom) ? custom : [])];
  return all.filter((provider, index, list) => provider?.id && list.findIndex((item) => item.id === provider.id) === index).map((provider) => ({
    id: String(provider.id),
    name: String(provider.name || provider.id),
    kind: provider.kind === 'anthropic' ? 'anthropic' : 'openai',
    baseUrl: String(provider.baseUrl || '').replace(/\/+$/, ''),
    models: Array.isArray(provider.models) ? provider.models.map(String).slice(0, 100) : [],
    custom: !PROVIDERS.some((item) => item.id === provider.id),
  }));
}

async function readKeys(app) {
  const raw = app.settings.get(KEYS_KEY, '');
  if (!raw) return {};
  try {
    const value = await decryptText(getEncryptionKey(app.env), raw);
    const keys = JSON.parse(value);
    return keys && typeof keys === 'object' ? keys : {};
  } catch {
    return {};
  }
}

function cleanProvider(provider) {
  if (!provider || typeof provider !== 'object') return null;
  const id = String(provider.id || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const name = String(provider.name || id).trim().slice(0, 80);
  const baseUrl = String(provider.baseUrl || '').trim().replace(/\/+$/, '').slice(0, 300);
  if (!id || !name || !baseUrl) return null;
  return { id, name, baseUrl, kind: provider.kind === 'anthropic' ? 'anthropic' : 'openai', models: Array.isArray(provider.models) ? provider.models.map(String).slice(0, 100) : [] };
}

export async function getConfig(app) {
  const keys = await readKeys(app);
  const providers = catalog(app).map((provider) => ({ ...provider, hasKey: Boolean(keys[provider.id]) }));
  const defaults = parse(app.settings.get(DEFAULTS_KEY, '{}'), {});
  return { providers, defaults: { providerId: String(defaults.providerId || providers[0]?.id || 'openrouter'), model: String(defaults.model || ''), temperature: Number.isFinite(Number(defaults.temperature)) ? Number(defaults.temperature) : 0.7, topP: Number.isFinite(Number(defaults.topP)) ? Number(defaults.topP) : 1, maxTokens: Number.isFinite(Number(defaults.maxTokens)) ? Number(defaults.maxTokens) : 4096, thinking: ['none', 'low', 'medium', 'high'].includes(defaults.thinking) ? defaults.thinking : 'none', webSearch: Boolean(defaults.webSearch) } };
}

export async function saveConfig(app, { providers = [], defaults = {}, keys = {} } = {}) {
  const cleaned = Array.isArray(providers) ? providers.map(cleanProvider).filter(Boolean) : [];
  const existingKeys = await readKeys(app);
  const nextKeys = { ...existingKeys };
  if (keys && typeof keys === 'object') {
    for (const [id, value] of Object.entries(keys)) {
      if (typeof value === 'string' && value.trim()) nextKeys[String(id).slice(0, 64)] = value.trim().slice(0, 512);
    }
  }
  const nextDefaults = {
    providerId: String(defaults.providerId || 'openrouter').slice(0, 64),
    model: String(defaults.model || '').slice(0, 160),
    temperature: Math.min(2, Math.max(0, Number(defaults.temperature) || 0.7)),
    topP: Math.min(1, Math.max(0, Number(defaults.topP) || 1)),
    maxTokens: Math.min(200000, Math.max(1, Math.floor(Number(defaults.maxTokens) || 4096))),
    thinking: ['none', 'low', 'medium', 'high'].includes(defaults.thinking) ? defaults.thinking : 'none',
    webSearch: Boolean(defaults.webSearch),
  };
  await app.settings.set(PROVIDER_KEY, JSON.stringify(cleaned));
  await app.settings.set(DEFAULTS_KEY, JSON.stringify(nextDefaults));
  await app.settings.set(KEYS_KEY, await encryptText(getEncryptionKey(app.env), JSON.stringify(nextKeys)));
  return getConfig(app);
}

function resolveProvider(app, providerId) {
  return catalog(app).find((provider) => provider.id === providerId) || null;
}

function messagePayload(messages) {
  return (Array.isArray(messages) ? messages : []).filter((message) => message && ['system', 'user', 'assistant'].includes(message.role)).slice(-50).map((message) => ({ role: message.role, content: typeof message.content === 'string' ? message.content.slice(0, 20000) : String(message.content || '') }));
}

export async function streamChat(app, payload, request) {
  const config = await getConfig(app);
  const provider = resolveProvider(app, String(payload.providerId || config.defaults.providerId));
  if (!provider) throw new HttpError(400, 'LLM_PROVIDER_NOT_FOUND');
  const keys = await readKeys(app);
  const apiKey = keys[provider.id] || '';
  if (!apiKey && provider.id !== 'ollama') throw new HttpError(400, 'LLM_API_KEY_MISSING');
  const model = String(payload.model || config.defaults.model || provider.models[0] || '').trim();
  if (!model) throw new HttpError(400, 'LLM_MODEL_MISSING');
  const params = payload.params && typeof payload.params === 'object' ? payload.params : config.defaults;
  const body = { model, messages: messagePayload(payload.messages), stream: true, temperature: Math.min(2, Math.max(0, Number(params.temperature) || 0.7)), top_p: Math.min(1, Math.max(0, Number(params.topP) || 1)), max_tokens: Math.min(200000, Math.max(1, Math.floor(Number(params.maxTokens) || 4096))) };
  const headers = { accept: 'text/event-stream', 'content-type': 'application/json' };
  if (provider.kind === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body.max_tokens = body.max_tokens || 4096;
  } else if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  const upstream = await fetch(`${provider.baseUrl}/${provider.kind === 'anthropic' ? 'messages' : 'chat/completions'}`, { method: 'POST', headers, body: JSON.stringify(body), signal: request?.signal });
  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 500);
    throw new HttpError(502, detail || 'LLM_UPSTREAM_FAILED');
  }
  if (!upstream.body) throw new HttpError(502, 'LLM_STREAM_UNAVAILABLE');

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = '';
      const emit = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      emit({ type: 'start', provider: provider.id, model });
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline).replace(/\r$/, '');
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || '';
              if (text) emit({ type: 'delta', text });
            } catch {
              // 忽略上游非 JSON 心跳行。
            }
          }
        }
        emit({ type: 'done' });
        controller.close();
      } catch (error) {
        emit({ type: 'error', message: error?.message || 'LLM_STREAM_FAILED' });
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
}

export function providers(app) {
  return { providers: catalog(app) };
}