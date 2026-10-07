import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const BASE = 'https://your-domain.com';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      <nav className="sticky top-0 z-40 h-16 border-b border-[#1a1a1a] bg-black px-6">
        <div className="flex h-full items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link to="/" aria-label="Free Store home" className="flex shrink-0 items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white">
                <Shield className="h-3.5 w-3.5 text-black" />
              </div>
              <span className="text-sm font-semibold text-white">Free Store</span>
            </Link>
            <span className="hidden text-[#333] sm:inline">/</span>
            <span className="hidden text-sm font-medium text-[#888] sm:inline">Docs</span>
            <div className="hidden items-center gap-5 pl-2 text-xs text-[#777] md:flex">
              <a href="#endpoints" className="transition-colors hover:text-white">API reference</a>
              <a href="#authentication" className="transition-colors hover:text-white">Authentication</a>
              <a href="#error-format" className="transition-colors hover:text-white">Errors</a>
            </div>
          </div>
          <Link to="/dashboard" className="btn-secondary btn-sm shrink-0">Dashboard</Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_200px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-[#1a1a1a] px-5 py-8 lg:block">
          <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#555]">API reference</p>
          <nav aria-label="Documentation sections" className="space-y-1">
            <DocNavLink href="#overview" label="Overview" />
            <DocNavLink href="#api-basics" label="Getting started" />
            <DocNavLink href="#authentication" label="Authentication" />
            <DocNavLink href="#endpoints" label="Endpoints" />
            <DocNavLink href="#error-format" label="Errors" />
          </nav>
          <div className="mt-8 border-t border-[#1a1a1a] pt-5">
            <p className="px-3 text-xs leading-5 text-[#555]">Encrypted file storage, backed by GitHub.</p>
          </div>
        </aside>

        <main className="min-w-0 px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
        <div id="overview" className="mb-12 scroll-mt-24">
          <div className="mb-8 flex items-center gap-2 text-xs text-[#777]">
            <span className="text-[#555]">APIs &amp; SDKs</span>
            <span className="text-[#444]">/</span>
            <span>Free Store API</span>
          </div>
          <h1 className="text-4xl font-semibold mb-6 tracking-tight text-white sm:text-5xl">Using the Free Store API</h1>
          <p className="text-[#666]">
            All API endpoints require authentication via session cookie or Bearer API key.
            Files are encrypted server-side before being stored in GitHub.
          </p>
        </div>

        <section id="api-basics" className="mb-12 scroll-mt-24">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white">API basics</h2>
          <p className="text-sm leading-6 text-[#aaa]">
            All endpoints are served under <code className="rounded border border-[#333] bg-[#151515] px-1.5 py-0.5 font-mono text-xs text-[#ddd]">{BASE}/api/v1</code> and return JSON unless an endpoint streams file content.
          </p>
        </section>

        {/* Authentication */}
        <Section title="Authentication">
          <p className="text-[#888] text-sm mb-4">
            Use <code className="text-white">Authorization: Bearer sk_live_...</code> header or
            a valid session cookie obtained via GitHub OAuth.
          </p>
          <CodeBlock>{`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</CodeBlock>
        </Section>

        {/* Endpoints */}
        <Section title="Endpoints">
          <div className="space-y-8">
            <Endpoint
              method="GET"
              path="/api/v1/user"
              description="Get current authenticated user profile and storage stats."
              response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "githubUsername": "octocat",
    "email": "octocat@github.com",
    "repositoryName": "encrypted-store-827391",
    "repositoryOwner": "octocat",
    "stats": {
      "fileCount": 12,
      "totalBytes": 4823040
    }
  }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/files"
              description="List all files. Supports ?search=, ?mimeType=, ?limit=, ?offset=, ?sortBy=, ?sortOrder="
              response={`{
  "success": true,
  "data": {
    "files": [
      {
        "id": "f_8f92kd71",
        "filename": "photo.png",
        "mimeType": "image/png",
        "size": 183920,
        "status": "ACTIVE",
        "createdAt": "2026-09-24T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/files"
              description="Upload a file. Multipart/form-data with field name 'file'."
              request={`curl -X POST ${BASE}/api/v1/files \\
  -H "Authorization: Bearer sk_live_xxxx" \\
  -F "file=@photo.png"`}
              response={`{
  "success": true,
  "data": {
    "file": {
      "id": "f_8f92kd71",
      "filename": "photo.png",
      "size": 183920,
      "mimeType": "image/png",
      "url": "${BASE}/api/v1/images/f_8f92kd71"
    }
  }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/files/:id"
              description="Download and decrypt a file. Returns the original file with its Content-Type. Add ?inline=1 to display a PDF inline; other files are returned as attachments. File content routes require an authenticated session cookie."
              request={`curl -b "connect.sid=<session-cookie>" -o photo.png \\
  ${BASE}/api/v1/files/f_8f92kd71

// To preview a PDF, fetch it with the signed-in browser session:
fetch("${BASE}/api/v1/files/f_8f92kd71?inline=1", {
  credentials: "include"
})
  .then((response) => {
    if (!response.ok) throw new Error("File request failed");
    return response.blob();
  })
  .then((blob) => {
    const previewUrl = URL.createObjectURL(blob);
    document.querySelector("iframe").src = previewUrl;
    // Revoke previewUrl when the preview is closed.
  });`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/images/:id"
              description="Serve decrypted image bytes. This route requires an authenticated session cookie. A direct <img> URL works only when the browser sends that cookie to this API origin; otherwise, fetch the image with credentials and display a temporary object URL."
              request={`fetch("${BASE}/api/v1/images/f_8f92kd71", {
  credentials: "include"
})
  .then((response) => {
    if (!response.ok) throw new Error("Image request failed");
    return response.blob();
  })
  .then((blob) => {
    const imageUrl = URL.createObjectURL(blob);
    document.querySelector("img").src = imageUrl;
    // Revoke imageUrl when the image is no longer needed.
  });`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/files/:id"
              description="Delete a file from GitHub and the database."
              request={`curl -X DELETE \\
  -H "Authorization: Bearer sk_live_xxxx" \\
  ${BASE}/api/v1/files/f_8f92kd71`}
              response={`{ "success": true }`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/api-keys"
              description="List your API keys (hashes and raw keys are never returned, only prefix/metadata)."
            />

            <Endpoint
              method="POST"
              path="/api/v1/api-keys"
              description="Create a new API key. The plaintext key is returned once — store it immediately."
              request={`{
  "name": "Production",
  "expiresAt": "2027-01-01T00:00:00Z"  // optional
}`}
              response={`{
  "success": true,
  "data": {
    "key": "sk_live_xxxx",  // shown only once
    "id": "uuid",
    "name": "Production",
    "prefix": "sk_live_ab12",
    "createdAt": "2026-09-24T10:00:00Z"
  }
}`}
            />

            <Endpoint
              method="DELETE"
              path="/api/v1/api-keys/:id"
              description="Revoke an API key."
            />
          </div>
        </Section>

        {/* Error format */}
        <Section title="Error format">
          <CodeBlock>{`{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found"
  }
}`}</CodeBlock>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ['UNAUTHORIZED', '401 — Missing or invalid authentication'],
              ['NOT_FOUND', '404 — Resource not found'],
              ['FILE_TOO_LARGE', '413 — File exceeds maximum size'],
              ['UNSUPPORTED_MEDIA_TYPE', '415 — File type not allowed'],
              ['RATE_LIMITED', '429 — Too many requests'],
              ['INTERNAL_ERROR', '500 — Server error'],
              ['DECRYPTION_FAILED', '500 — File could not be decrypted'],
            ].map(([code, desc]) => (
              <div key={code} className="flex gap-3">
                <code className="text-[#ccc] text-xs w-48 shrink-0">{code}</code>
                <span className="text-[#666] text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </Section>
        </main>

        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto px-6 py-10 xl:block">
          <p className="mb-4 text-xs font-medium text-[#666]">On this page</p>
          <nav aria-label="On this page" className="space-y-1 border-l border-[#222]">
            <DocTocLink href="#overview" label="Overview" />
            <DocTocLink href="#api-basics" label="API basics" />
            <DocTocLink href="#authentication" label="Authentication" />
            <DocTocLink href="#endpoints" label="Endpoints" />
            <DocTocLink href="#error-format" label="Errors" />
          </nav>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = title.toLowerCase().replace(/\s+/g, '-');
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="mb-5 border-b border-[#1a1a1a] pb-3 text-2xl font-semibold tracking-tight text-white">{title}</h2>
      {children}
    </section>
  );
}

function DocNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="block rounded-md px-3 py-2 text-sm text-[#888] transition-colors hover:bg-[#151515] hover:text-white">
      {label}
    </a>
  );
}

function DocTocLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="block border-l border-transparent py-1.5 pl-4 text-xs text-[#777] transition-colors hover:border-white hover:text-white">
      {label}
    </a>
  );
}

function Endpoint({
  method,
  path,
  description,
  request,
  response,
}: {
  method: string;
  path: string;
  description: string;
  request?: string;
  response?: string;
}) {
  const colors: Record<string, string> = {
    GET: 'text-white bg-[#1a1a1a] border border-[#333]',
    POST: 'text-[#ccc] bg-[#111] border border-[#2e2e2e]',
    DELETE: 'text-[#888] bg-[#111] border border-[#2e2e2e]',
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors[method]}`}>{method}</span>
        <code className="text-[#ededed] font-mono text-sm">{path}</code>
      </div>
      <p className="text-[#777] text-sm mb-3">{description}</p>
      {request && <CodeBlock label="Request">{request}</CodeBlock>}
      {response && <CodeBlock label="Response">{response}</CodeBlock>}
    </div>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mb-3">
      {label && <p className="text-xs text-[#555] mb-1">{label}</p>}
      <pre className="bg-[#0a0a0a] rounded-lg p-4 text-xs text-[#aaa] overflow-x-auto font-mono border border-[#222] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
