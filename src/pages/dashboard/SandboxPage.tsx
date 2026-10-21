import { useState } from 'react';
import { Activity, Clock3, FlaskConical, Play, Trash2 } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestEntry {
  id: number;
  method: HttpMethod;
  path: string;
  url: string;
  startedAt: string;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody: string;
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  error?: string;
  truncated?: boolean;
  credentials: 'include' | 'omit';
  pending?: boolean;
}

const API_PREFIX = '/api/v1';
const MAX_RESPONSE_BYTES = 1024 * 1024;
const newRequestId = () => Date.now() + Math.random();

async function readResponse(response: Response): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: '', truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const remaining = MAX_RESPONSE_BYTES - byteLength;
    if (value.byteLength > remaining) {
      chunks.push(value.slice(0, remaining));
      byteLength += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }

    chunks.push(value);
    byteLength += value.byteLength;
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: new TextDecoder().decode(bytes), truncated };
}

function formatBody(body: string | undefined): string {
  if (!body) return '(empty response)';
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function methodColor(method: HttpMethod): string {
  if (method === 'GET') return 'text-emerald-400';
  if (method === 'POST') return 'text-blue-400';
  if (method === 'DELETE') return 'text-red-400';
  return 'text-amber-400';
}

export default function SandboxPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/user');
  const [body, setBody] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [history, setHistory] = useState<RequestEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const selected = history.find((entry) => entry.id === selectedId);

  const sendRequest = async () => {
    const cleanPath = path.trim();
    if (!cleanPath.startsWith('/') || cleanPath.startsWith('//')) {
      const id = newRequestId();
      setHistory((items) => [{
        id,
        method,
        path: cleanPath,
        url: '',
        startedAt: new Date().toISOString(),
        durationMs: 0,
        requestHeaders: {},
        requestBody: '',
        error: 'Enter a path beginning with /, for example /user or /files.',
        credentials: 'include' as const,
      }, ...items].slice(0, 50));
      setSelectedId(id);
      return;
    }

    const url = new URL(`${API_PREFIX}${cleanPath}`, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(`${API_PREFIX}/`)) {
      const id = newRequestId();
      setHistory((items) => [{
        id,
        method,
        path: cleanPath,
        url: url.toString(),
        startedAt: new Date().toISOString(),
        durationMs: 0,
        requestHeaders: {},
        requestBody: '',
        error: 'Requests must stay under /api/v1.',
        credentials: 'include' as const,
      }, ...items].slice(0, 50));
      setSelectedId(id);
      return;
    }

    const hasBody = method !== 'GET' && body.trim().length > 0;
    if (hasBody) {
      try {
        JSON.parse(body);
      } catch {
        const id = newRequestId();
        setHistory((items) => [{
          id,
          method,
          path: cleanPath,
          url: url.toString(),
          startedAt: new Date().toISOString(),
          durationMs: 0,
          requestHeaders: {},
          requestBody: body,
          error: 'Request body must be valid JSON.',
          credentials: 'include' as const,
        }, ...items].slice(0, 50));
        setSelectedId(id);
        return;
      }
    }

    const id = newRequestId();
    const startedAt = new Date();
    const credentials: RequestEntry['credentials'] = apiKey.trim() ? 'omit' : 'include';
    const headers: Record<string, string> = {};
    const fetchHeaders: Record<string, string> = {};
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
      fetchHeaders['Content-Type'] = 'application/json';
    }
    if (apiKey.trim()) {
      headers.Authorization = 'Bearer [REDACTED]';
      fetchHeaders.Authorization = `Bearer ${apiKey.trim()}`;
    }

    setSending(true);
    setSelectedId(id);
    setHistory((items) => [{
      id,
      method,
      path: cleanPath,
      url: url.toString(),
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      requestHeaders: headers,
      requestBody: hasBody ? body : '',
      credentials,
      pending: true,
    }, ...items].slice(0, 50));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: hasBody ? body : undefined,
        credentials,
        signal: controller.signal,
      });
      const result = await readResponse(response);
      setHistory((items) => items.map((entry) => entry.id === id ? {
        ...entry,
        pending: false,
        durationMs: Date.now() - startedAt.getTime(),
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: result.body,
        truncated: result.truncated,
      } : entry));
    } catch (error) {
      setHistory((items) => items.map((entry) => entry.id === id ? {
        ...entry,
        pending: false,
        durationMs: Date.now() - startedAt.getTime(),
        error: error instanceof Error
          ? (error.name === 'AbortError' ? 'Request timed out after 30 seconds.' : error.message)
          : 'Network request failed.',
      } : entry));
    } finally {
      window.clearTimeout(timeout);
      setSending(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setSelectedId(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#aaa]" />
            <h1 className="text-base font-semibold text-[#ededed]">API Sandbox</h1>
          </div>
          <p className="text-xs text-[#666] mt-1">
            Send real requests through this deployment’s API proxy. Requests use your signed-in session.
          </p>
        </div>
        <span className="badge-blue font-mono">{window.location.origin}{API_PREFIX}</span>
      </div>

      <div className="card border-amber-500/20 bg-amber-500/[0.03] p-3 text-xs text-amber-200/80">
        This is a live environment, not a mock. POST, PUT, PATCH, and DELETE requests can change or remove real account data.
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#ccc]">Request</h2>
            <span className="text-[10px] text-[#555]">Same-origin proxy · credentials included</span>
          </div>

          <div className="flex gap-2">
            <select
              className="select w-28 shrink-0 font-mono text-xs"
              value={method}
              onChange={(event) => setMethod(event.target.value as HttpMethod)}
              aria-label="HTTP method"
            >
              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-[#333] bg-[#0a0a0a] px-3">
              <span className="text-xs text-[#555]">{API_PREFIX}</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-xs text-[#ededed] outline-none"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !sending) void sendRequest();
                }}
                placeholder="/user"
                aria-label="API path"
              />
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#666]">API key (optional)</span>
            <input
              className="input font-mono text-xs"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Defaults to your signed-in browser session"
              autoComplete="off"
            />
            <span className="block text-[10px] text-[#555]">Key is only sent with this request and is redacted from the history.</span>
          </label>

          {method !== 'GET' && (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#666]">JSON body (optional)</span>
              <textarea
                className="input min-h-40 resize-y font-mono text-xs leading-relaxed"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={'{\n  "name": "Example"\n}'}
                spellCheck={false}
              />
            </label>
          )}

          <button className="btn-primary w-full justify-center" onClick={() => void sendRequest()} disabled={sending}>
            <Play className="w-3.5 h-3.5" />
            {sending ? 'Sending request…' : 'Send request'}
          </button>
        </section>

        <section className="card min-h-[360px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#777]" />
              <h2 className="text-xs font-semibold text-[#ccc]">Request history</h2>
              <span className="text-[10px] text-[#555]">{history.length}/50</span>
            </div>
            <button className="btn-ghost btn-sm" onClick={clearHistory} disabled={!history.length}>
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          {history.length ? (
            <div className="max-h-[540px] divide-y divide-[#1a1a1a] overflow-y-auto">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  className={`block w-full px-4 py-3 text-left transition-colors hover:bg-[#151515] ${selectedId === entry.id ? 'bg-[#151515]' : ''}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-14 font-mono text-[10px] font-bold ${methodColor(entry.method)}`}>{entry.method}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#bbb]">{entry.path}</span>
                    <span className={`text-[10px] ${entry.error ? 'text-red-400' : entry.status && entry.status < 400 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {entry.pending ? '…' : entry.error ? 'ERR' : entry.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 pl-16 text-[10px] text-[#555]">
                    <Clock3 className="w-3 h-3" />
                    <span>{new Date(entry.startedAt).toLocaleTimeString()}</span>
                    <span>·</span>
                    <span>{entry.durationMs} ms</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 text-center">
              <Activity className="w-7 h-7 text-[#333]" />
              <p className="text-xs text-[#666]">Requests will appear here after you send them.</p>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold ${methodColor(selected.method)}`}>{selected.method}</span>
              <span className="break-all font-mono text-xs text-[#bbb]">{selected.url || selected.path}</span>
            </div>
            <span className={`badge ${selected.pending ? 'badge-amber' : selected.error ? 'badge-red' : selected.status && selected.status < 400 ? 'badge-green' : 'badge-amber'}`}>
              {selected.pending ? 'Request in progress' : selected.error ? 'Request error' : `${selected.status} ${selected.statusText ?? ''}`}
            </span>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#666]">Request headers sent</h3>
                <pre className="code-block whitespace-pre-wrap break-all">{JSON.stringify(selected.requestHeaders, null, 2) || '{}'}</pre>
                <p className="mt-1 text-[10px] text-[#555]">
                  Browser credentials: {selected.credentials === 'include' ? 'session cookies included' : 'omitted (API key only)'}
                </p>
              </div>
              {selected.requestBody && (
                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#666]">Request body</h3>
                  <pre className="code-block max-h-64 overflow-auto whitespace-pre-wrap break-words">{formatBody(selected.requestBody)}</pre>
                </div>
              )}
              {selected.error && <p className="text-xs text-red-400">{selected.error}</p>}
            </div>
            <div className="space-y-3">
              {selected.responseHeaders && (
                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#666]">Response headers</h3>
                  <pre className="code-block max-h-32 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selected.responseHeaders, null, 2)}</pre>
                </div>
              )}
              {selected.responseBody !== undefined && (
                <div>
                  <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#666]">Response body</h3>
                  <pre className="code-block max-h-[420px] overflow-auto whitespace-pre-wrap break-words">
                    {formatBody(selected.responseBody)}
                    {selected.truncated ? '\n\n[Response truncated at 1 MiB]' : ''}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
