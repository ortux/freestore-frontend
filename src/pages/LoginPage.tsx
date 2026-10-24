import { Github, Shield } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { config } from '../config';
import { useUser } from '../hooks/useUser';

export default function LoginPage() {
  const { data: user, isLoading } = useUser();
  const error = new URLSearchParams(window.location.search).get('error');
  const errorMessage =
    error === 'github_oauth_failed' ? 'GitHub sign-in could not be completed. Please check the OAuth app configuration and try again.' :
    error === 'token_expired'       ? 'Sign-in session expired. Please try again.' :
    error === 'exchange_failed'     ? 'Sign-in could not be completed. Please try again.' :
    error === 'no_token'            ? 'Invalid sign-in link. Please try again.' :
    error === 'handoff_failed'      ? 'Sign-in could not be completed. Please try again.' :
    error                           ? 'Authentication failed. Please try again.' :
    null;

  // Already authenticated — send straight to dashboard
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-7">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#777]">Free Store</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">Your files, securely stored.</h1>
          <p className="text-sm text-[#777]">Sign in with GitHub to access your encrypted storage.</p>
        </div>

        {errorMessage && (
          <div className="card border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 text-center">
            {errorMessage}
          </div>
        )}

        {/* Card */}
        <div className="card p-6 space-y-5">
          <a
            href={config.githubLoginUrl}
            className="flex items-center justify-center gap-2.5 w-full py-3 bg-[#ededed] hover:bg-white
              border border-[#ededed] rounded-md text-sm text-black font-semibold transition-all
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </a>

          <div className="rounded-md border border-[#262626] bg-[#0a0a0a] px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-[#bbb]">Private by design</p>
            <p className="text-xs text-[#777] leading-relaxed">
              Your encrypted files are stored in a GitHub repository. Only ciphertext is committed —
              never your original files.
            </p>
            <p className="text-[11px] text-[#555]">You’ll continue to our secure sign-in service, then GitHub to approve access.</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#444]">
          <Link to="/" className="hover:text-[#888] transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
