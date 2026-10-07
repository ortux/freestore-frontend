import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const BASE = 'https://your-domain.com';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-slate-100 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-400" />
            <span className="font-semibold">API Documentation</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold mb-3">Free Store API</h1>
          <p className="text-slate-400">
            All API endpoints require authentication via session cookie or Bearer API key.
            Files are encrypted server-side before being stored in GitHub.
          </p>
        </div>

        {/* Authentication */}
        <Section title="Authentication">
          <p className="text-slate-400 text-sm mb-4">
            Use <code className="text-brand-400">Authorization: Bearer sk_live_...</code> header or
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
                <code className="text-brand-400 text-xs w-48 shrink-0">{code}</code>
                <span className="text-slate-400 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-800">{title}</h2>
      {children}
    </section>
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
    GET: 'text-emerald-400 bg-emerald-500/10',
    POST: 'text-brand-400 bg-brand-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors[method]}`}>{method}</span>
        <code className="text-slate-200 font-mono text-sm">{path}</code>
      </div>
      <p className="text-slate-400 text-sm mb-3">{description}</p>
      {request && <CodeBlock label="Request">{request}</CodeBlock>}
      {response && <CodeBlock label="Response">{response}</CodeBlock>}
    </div>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mb-3">
      {label && <p className="text-xs text-slate-500 mb-1">{label}</p>}
      <pre className="bg-slate-900 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono border border-slate-800">
        {children}
      </pre>
    </div>
  );
}
