import { Github, Shield } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { config } from '../config';
import { useUser } from '../hooks/useUser';

export default function LoginPage() {
  const { data: user, isLoading } = useUser();

  const error = new URLSearchParams(window.location.search).get('error');
  const errorMessage = error === 'github_oauth_failed'
    ? 'GitHub sign-in could not be completed. Please check the OAuth app configuration and try again.'
    : error ? 'Authentication failed. Please try again.' : null;

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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-base font-semibold text-[#ededed]">Free Store</h1>
          <p className="text-xs text-[#555]">Sign in to access your encrypted storage</p>
        </div>

        {errorMessage && (
          <div className="card border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 text-center">
            {errorMessage}
          </div>
        )}

        {/* Card */}
        <div className="card p-5 space-y-4">
          <a
            href={config.githubLoginUrl}
            className="flex items-center justify-center gap-2.5 w-full py-2 bg-[#1a1a1a] hover:bg-[#222]
              border border-[#333] hover:border-[#555] rounded-md text-sm text-[#ededed] font-medium
              transition-all"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </a>

          <div className="text-center">
            <p className="text-[10px] text-[#444] leading-relaxed">
              We create a public GitHub repository to store your encrypted files.
              Only ciphertext is committed — never your originals.
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#444]">
          <Link to="/" className="hover:text-[#888] transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
