"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession, signIn, signOut } from "next-auth/react";
import { GitHubRepoPicker } from "@/components/github-repo-picker";
import { Github, LogOut, User as UserIcon, ExternalLink, Lock } from "lucide-react";

interface ScanTask {
  repoUrl: string;
  repoId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  timestamp: number;
  findingsCount?: number;
  error?: string;
}

export default function Home() {
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
    <div className="space-y-12">
      {/* Header */}
      <section className="flex items-center justify-between pb-4 border-b border-gray-50">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 pb-0.5">Autochitect</h1>

        {status === "authenticated" && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{session.user?.name}</span>
              <button onClick={() => signOut()} className="text-[9px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-[0.2em]">Sign Out</button>
            </div>
            {session.user?.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full grayscale hover:grayscale-0 transition-all border border-gray-100" />
            )}
          </div>
        )}
      </section>

      {/* Main Analyzer */}
      <div className="max-w-2xl mx-auto w-full py-8">
        {!showManualUrl ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="Paste GitHub URL..."
                  className="w-full px-0 py-6 text-2xl font-medium bg-transparent border-b-2 border-gray-100 focus:border-gray-900 outline-none transition-all placeholder:text-gray-200"
                  autoFocus
                />
                <Button 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting || !repoUrl}
                  className="absolute right-0 bottom-6 bg-transparent hover:bg-transparent text-gray-400 hover:text-gray-900 h-10 px-0 font-bold uppercase tracking-widest text-[10px]"
                >
                  {isSubmitting ? "Processing..." : "Analyze →"}
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setShowManualUrl(true)}
                className="group flex items-center gap-2 text-[10px] font-bold text-gray-300 hover:text-gray-900 uppercase tracking-[0.2em] transition-all"
              >
                <Lock className="w-3 h-3 transition-colors group-hover:text-amber-500" />
                {status === "authenticated" ? "Scan Private Repository →" : "Private Repository"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Lock className="w-3 h-3 text-amber-500" />
                Private Scanning
              </h3>
              <button 
                onClick={() => setShowManualUrl(false)}
                className="text-[9px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest"
              >
                Back
              </button>
            </div>

            {status === "authenticated" ? (
              <div className="space-y-8">
                <GitHubRepoPicker onSelect={(url) => setRepoUrl(url)} />
                {repoUrl && (
                   <Button 
                    onClick={() => handleSubmit(true)} 
                    disabled={isSubmitting} 
                    className="w-full h-12 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em]"
                  >
                    Start Analysis
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <p className="text-xs text-gray-400 font-medium tracking-tight">Requires GitHub authentication.</p>
                <Button 
                  onClick={() => signIn("github")}
                  className="bg-gray-900 text-white px-8 h-12 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  Authorize Access
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recent Scans
          </div>
          <button
            onClick={() => fetchRecentScans(page)}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 uppercase tracking-widest"
          >
            {isSubmitting ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-4">
          {recentScans.length > 0 ? (
            recentScans.map((scan) => (
              <div
                key={scan.repoId}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-100 transition-all gap-4"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 truncate">{scan.repoId}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(scan.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <StatusBadge status={scan.status} count={scan.findingsCount} error={scan.error} />
                  {scan.status === "COMPLETED" && (
                    <Link href={`/report?repoId=${scan.repoId}`}>
                      <Button variant="secondary" className="px-5 py-1.5 h-9">View Report</Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-gray-400 text-sm italic font-medium">No system scans found yet.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {recentScans.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-xs px-4"
            >
              Previous
            </Button>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
              Page {page}
            </span>
            <Button
              variant="secondary"
              disabled={!hasNext}
              onClick={() => setPage(p => p + 1)}
              className="text-xs px-4 group"
            >
              Next
            </Button>
          </div>
        )}
      </section>

    </div>
  );
}

function StatusBadge({ status, count, error }: { status: ScanTask["status"]; count?: number; error?: string }) {
  switch (status) {
    case "PENDING":
      return <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Queued</span>;
    case "RUNNING":
      return <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Running</span>;
    case "FAILED":
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider" title={error}>Failed</span>
          {error && <span className="text-[10px] text-red-300 max-w-[150px] truncate italic" title={error}>{error}</span>}
        </div>
      );
    case "COMPLETED":
      return (
        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          {count !== undefined && count > 0 ? `${count} Issues Found` : count === 0 ? "No Issues Found" : "Analysis Complete"}
        </span>
      );
  }
}
