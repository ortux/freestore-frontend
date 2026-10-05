import { Link } from 'react-router-dom';
import { Shield, Github, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { config } from '../config';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-[#ededed]">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm font-semibold">Free Store</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/docs" className="text-xs text-[#666] hover:text-[#ededed] transition-colors">Docs</Link>
            <a href={config.githubLoginUrl} className="btn-primary btn-sm">Sign in</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#111] border border-[#2e2e2e] rounded-full text-xs text-[#888] mb-8">
          <Lock className="w-3 h-3" /> AES-256-GCM encrypted before upload
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 text-white leading-tight">
          Encrypted file storage<br />backed by GitHub
        </h1>
        <p className="text-[#666] text-base mb-10 max-w-xl mx-auto leading-relaxed">
          Upload files and images. Every file is encrypted server-side before it touches GitHub.
          The repository contains only ciphertext — never your original files.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href={config.githubLoginUrl} className="btn-primary gap-2">
            <Github className="w-4 h-4" /> Get started with GitHub
          </a>
          <Link to="/docs" className="btn-secondary gap-2">
            API docs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'AES-256-GCM', sub: 'Authenticated encryption with per-file keys' },
            { title: 'GitHub storage', sub: 'Public repo stores only encrypted .enc files' },
            { title: 'Reliable uploads', sub: 'Tokenized, resumable, cancellable uploads' },
            { title: 'API keys', sub: 'Programmatic access with Bearer authentication' },
            { title: 'File sharing', sub: 'Per-recipient key wrapping — revoke anytime' },
            { title: 'Workspaces', sub: 'RBAC: Owner · Admin · Member · Viewer' },
          ].map(({ title, sub }) => (
            <div key={title} className="card-hover p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-[#ccc]">{title}</span>
              </div>
              <p className="text-[10px] text-[#555] leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section className="border-t border-[#1a1a1a] py-10">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs text-[#444] leading-relaxed">
            Files are encrypted before upload. GitHub stores ciphertext, not plaintext.
            GitHub can still see repository metadata: owner, file sizes, commit history.
            We use random filenames to minimise metadata exposure.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#1a1a1a] px-6 py-4 text-center">
        <p className="text-[10px] text-[#444]">Free Store — encrypted file storage</p>
      </footer>
    </div>
  );
}
