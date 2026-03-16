"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { GitHubRepoPicker } from "@/components/github-repo-picker";
import { Lock } from "lucide-react";

interface ScanTask {
  repoUrl: string;
  repoId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  timestamp: number;
  findingsCount?: number;
  error?: string;
}

export default function ArchitectureScan() {
  const { data: session, status } = useSession();
  const [repoUrl, setRepoUrl] = useState("");
  const [recentScans, setRecentScans] = useState<ScanTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);

  useEffect(() => {
    fetchRecentScans(page);
  }, [page]);

  const fetchRecentScans = async (pageNum: number) => {
    try {
      const res = await fetch(`/api/reports?page=${pageNum}&limit=5`);
      const data = await res.json();
      setRecentScans(data.tasks || []);
      setHasNext(data.hasNext || false);
    } catch (err) {
      console.error("Failed to fetch recent scans", err);
    }
  };

  const handleSubmit = async (isPrivate: boolean = false) => {
    if (!repoUrl) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, isPrivate }),
      });
      const data = await res.json();
      if (data.repoId) {
        setRepoUrl("");
        setPage(1); 
        fetchRecentScans(1);
        setShowManualUrl(false);
      }
    } catch (err) {
      alert("Failed to start analysis");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="mb-6">
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-1 mb-4">Architecture Scan</h2>
        <p className="text-sm text-slate-600 font-serif italic mb-8">
          Autonomous repository analysis for identifying architectural patterns, anti-patterns, and structural drift.
        </p>
      </section>

      {/* Main Analyzer */}
      <div className="max-w-2xl mx-auto w-full py-8 border-b border-slate-200">
        {!showManualUrl ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Repository URL</label>
              <div className="relative group flex items-center">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-0 py-3 text-lg font-serif bg-transparent border-b border-slate-300 focus:border-slate-800 outline-none transition-all placeholder:text-slate-300"
                  autoFocus
                />
                <button 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting || !repoUrl}
                  className="lwn-btn ml-4"
                >
                  {isSubmitting ? "Processing..." : "Analyze"}
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setShowManualUrl(true)}
                className="group flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all"
              >
                <Lock size={12} className="transition-colors group-hover:text-amber-600" />
                {status === "authenticated" ? "Scan Private Repository &raquo;" : "Private Repository"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} className="text-amber-600" />
                Private Scanning
              </h3>
              <button 
                onClick={() => setShowManualUrl(false)}
                className="text-[9px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest"
              >
                Back
              </button>
            </div>

            {status === "authenticated" ? (
              <div className="space-y-8">
                <GitHubRepoPicker onSelect={(url) => setRepoUrl(url)} />
                {repoUrl && (
                   <button 
                    onClick={() => handleSubmit(true)} 
                    disabled={isSubmitting} 
                    className="lwn-btn w-full"
                  >
                    Start Analysis
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-xs text-slate-500 italic">GitHub authentication required for private scans.</p>
                <button 
                  onClick={() => signIn("github")}
                  className="lwn-btn px-8"
                >
                  Authorize Access
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Recent Scans
          </div>
          <button
            onClick={() => fetchRecentScans(page)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            {isSubmitting ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-2">
          {recentScans.length > 0 ? (
            recentScans.map((scan) => (
              <div
                key={scan.repoId}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 bg-[#e8e8d8]/30 hover:border-slate-400 transition-all gap-4"
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">{scan.repoId}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-sans">
                    {new Date(scan.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <StatusBadge status={scan.status} count={scan.findingsCount} error={scan.error} />
                  {scan.status === "COMPLETED" && (
                    <Link href={`/report?repoId=${scan.repoId}`}>
                      <button className="text-[10px] font-bold uppercase hover:underline text-slate-900">View Report &raquo;</button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs italic">No prior scans found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {recentScans.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              &laquo; Previous
            </button>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Page {page}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setPage(p => p + 1)}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              Next &raquo;
            </button>
          </div>
        )}
      </section>

    </div>
  );
}

function StatusBadge({ status, count, error }: { status: ScanTask["status"]; count?: number; error?: string }) {
  switch (status) {
    case "PENDING":
      return <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">Queued</span>;
    case "RUNNING":
      return <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider animate-pulse italic">Running...</span>;
    case "FAILED":
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider" title={error}>Failed</span>
        </div>
      );
    case "COMPLETED":
      return (
        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
          {count !== undefined && count > 0 ? `${count} Issues Found` : count === 0 ? "No Issues Found" : "Analysis Complete"}
        </span>
      );
  }
}
