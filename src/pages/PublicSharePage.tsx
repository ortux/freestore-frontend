import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, FileText, Files, LockKeyhole } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getPublicFile, getPublicFileContentUrl } from '../api/shares';
import { formatBytes, formatDate, isImage } from '../utils/format';

export default function PublicSharePage() {
  const { token = '' } = useParams();
  const { data: file, isLoading, isError } = useQuery({
    queryKey: ['public-file', token],
    queryFn: () => getPublicFile(token),
    enabled: !!token,
    retry: false,
  });
  const contentUrl = getPublicFileContentUrl(token);

  return (
    <main className="min-h-screen bg-[#080a0b] text-[#ededed]">
      <header className="h-14 border-b border-[#202526] flex items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole className="w-4 h-4 text-emerald-400" />
          Free Store
        </Link>
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#788080]">Shared file</span>
      </header>

      <section className="max-w-4xl mx-auto px-5 py-12">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-56 bg-[#202526] rounded" />
            <div className="h-[55vh] bg-[#111617] rounded" />
          </div>
        ) : isError || !file ? (
          <div className="max-w-lg mx-auto text-center py-20">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-4" />
            <h1 className="text-lg font-semibold">This link is unavailable</h1>
            <p className="mt-2 text-sm text-[#858e8e]">It may have expired or been revoked by the owner.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex min-w-0 items-center gap-3">
                {isImage(file.mimeType) ? <Files className="w-5 h-5 text-sky-400 shrink-0" /> : <FileText className="w-5 h-5 text-red-400 shrink-0" />}
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold">{file.filename}</h1>
                  <p className="text-xs text-[#737c7c]">{formatBytes(file.size)} · {file.mimeType}{file.expiresAt ? ` · Link expires ${formatDate(file.expiresAt)}` : ''}</p>
                </div>
              </div>
              <a href={contentUrl} download={file.filename} className="btn-primary btn-sm">
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>

            {file.mimeType === 'application/pdf' ? (
              <iframe title={file.filename} src={contentUrl} className="w-full h-[72vh] bg-white border border-[#252d2d] rounded" />
            ) : isImage(file.mimeType) ? (
              <div className="min-h-[40vh] flex items-center justify-center bg-[#111617] border border-[#252d2d] rounded p-4">
                <img src={contentUrl} alt={file.filename} className="max-h-[70vh] max-w-full object-contain" />
              </div>
            ) : (
              <div className="min-h-[35vh] flex flex-col items-center justify-center gap-3 bg-[#111617] border border-[#252d2d] rounded">
                <Files className="w-10 h-10 text-[#687272]" />
                <p className="text-sm text-[#aab2b2]">This file is available to download.</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}