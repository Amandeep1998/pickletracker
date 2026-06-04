const OpenAI = require('openai');

/**
 * Provider-agnostic LLM adapter.
 *
 * Tries providers in PROVIDER_ORDER, skipping any whose API key is absent,
 * and falls through to the next on error. All three speak the OpenAI
 * chat-completions wire format, so a single `openai` SDK client with a
 * per-provider baseURL covers them.
 *
 * Cost intent (see RALLYORA_ROADMAP Phase 2): Groq (free) primary,
 * Gemini (free) fallback, OpenAI last resort. Today only OPENAI_API_KEY is
 * set, so it runs on OpenAI — adding GROQ_API_KEY / GEMINI_API_KEY to env
 * flips the order with zero code change.
 */

const PROVIDERS = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    modelEnv: 'GROQ_MODEL',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GEMINI_API_KEY',
    apiKeyEnvAlt: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    modelEnv: 'GEMINI_MODEL',
  },
  openai: {
    baseURL: undefined, // SDK default
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    modelEnv: 'OPENAI_MODEL',
  },
};

const PROVIDER_ORDER = (process.env.LLM_PROVIDER_ORDER || 'groq,gemini,openai')
  .split(',')
  .map((s) => s.trim())
  .filter((name) => PROVIDERS[name]);

const keyFor = (cfg) =>
  process.env[cfg.apiKeyEnv] || (cfg.apiKeyEnvAlt ? process.env[cfg.apiKeyEnvAlt] : null);

const clientCache = {};
const clientFor = (name) => {
  if (!clientCache[name]) {
    const cfg = PROVIDERS[name];
    clientCache[name] = new OpenAI({ apiKey: keyFor(cfg), baseURL: cfg.baseURL });
  }
  return clientCache[name];
};

/** Which configured providers actually have a key, in order. */
const availableProviders = () => PROVIDER_ORDER.filter((name) => keyFor(PROVIDERS[name]));

/** True if at least one provider is usable. */
const isConfigured = () => availableProviders().length > 0;

/**
 * Run a JSON-mode chat completion against the first working provider.
 *
 * @returns {Promise<{ data:object, provider:string, model:string }>}
 * @throws if every available provider fails (or none is configured).
 */
const chatJSON = async ({ system, user, temperature = 0.1, maxTokens = 1200, timeout = 15000 }) => {
  const providers = availableProviders();
  if (providers.length === 0) {
    const err = new Error('No LLM provider configured');
    err.code = 'LLM_NOT_CONFIGURED';
    throw err;
  }

  let lastErr = null;
  for (const name of providers) {
    const cfg = PROVIDERS[name];
    const model = process.env[cfg.modelEnv] || cfg.defaultModel;
    try {
      const completion = await clientFor(name).chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature,
          max_tokens: maxTokens,
        },
        { timeout }
      );

      const raw = completion.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Empty completion');

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        const e = new Error('Provider returned non-JSON');
        e.code = 'LLM_BAD_JSON';
        throw e;
      }

      return { data, provider: name, model };
    } catch (err) {
      lastErr = err;
      // try next provider
    }
  }

  const err = new Error(`All LLM providers failed: ${lastErr?.message || 'unknown'}`);
  err.code = 'LLM_ALL_FAILED';
  err.cause = lastErr;
  throw err;
};

module.exports = { chatJSON, isConfigured, availableProviders };
