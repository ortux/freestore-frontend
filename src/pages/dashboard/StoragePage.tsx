import { Check, Github, Lock } from 'lucide-react';

export default function StoragePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-base font-semibold text-[#ededed]">Storage</h1>
        <p className="text-xs text-[#555] mt-0.5">Your encrypted files are stored in GitHub.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-md border border-[#666] bg-[#1a1a1a]">
          <Github className="w-4 h-4 text-[#aaa] mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#ededed]">GitHub</span>
              <span className="badge-green badge text-[10px]">Active</span>
            </div>
            <p className="text-[10px] text-[#555] mt-1">
              Encrypted files are committed to your storage repository.
            </p>
          </div>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <Lock className="w-3.5 h-3.5 text-[#555] mt-0.5" />
          <p className="text-xs text-[#666] leading-relaxed">
            Files are encrypted with AES-256-GCM before they leave the application.
            GitHub stores ciphertext only.
          </p>
        </div>
      </div>
    </div>
  );
}