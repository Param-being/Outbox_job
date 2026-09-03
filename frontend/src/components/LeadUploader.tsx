import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Users } from 'lucide-react';

interface LeadUploaderProps {
  onLeadsParsed: (leads: string[]) => void;
  parsedLeadsCount: number;
}

export const LeadUploader: React.FC<LeadUploaderProps> = ({
  onLeadsParsed,
  parsedLeadsCount,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractEmailAddresses = (rawText: string): string[] => {
    // Regex for matching standard email address patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = rawText.match(emailRegex) || [];
    // Remove duplicates & lowercase
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));
    return uniqueEmails;
  };

  const processFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const textContent = JSON.stringify(results.data);
          const emails = extractEmailAddresses(textContent);
          if (emails.length === 0) {
            setError('No valid email addresses detected in CSV file.');
          }
          onLeadsParsed(emails);
        },
        error: (err) => {
          setError('Failed to parse CSV: ' + err.message);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string || '';
        const emails = extractEmailAddresses(text);
        if (emails.length === 0) {
          setError('No valid email addresses detected in text file.');
        }
        onLeadsParsed(emails);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setError(null);
    onLeadsParsed([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
        Lead File Uploader (CSV / TXT)
      </label>

      {fileName ? (
        <div className="flex items-center justify-between p-3.5 bg-brand-950/40 border border-brand-500/40 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">{fileName}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{parsedLeadsCount} Lead Emails Detected</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
            title="Remove File"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-800 flex items-center justify-center text-brand-400">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-200">
            Click or drag & drop CSV/TXT file of leads
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Auto-extracts and verifies valid email formats
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {parsedLeadsCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
          <Users className="w-4 h-4 text-brand-400" />
          <span>Ready to schedule <strong>{parsedLeadsCount}</strong> lead email job(s)</span>
        </div>
      )}
    </div>
  );
};
