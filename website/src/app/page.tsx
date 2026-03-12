"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ScanTask {
  repoUrl: string;
  repoId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  timestamp: number;
  findingsCount?: number;
  error?: string;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/simplcommerce/SimplCommerce");
  const [recentScans, setRecentScans] = useState<ScanTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (data.repoId) {
        setRepoUrl("");
        setPage(1); // Reset to first page to see new scan
        fetchRecentScans(1);
      }
    } catch (err) {
      alert("Failed to start analysis");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Title Section */}
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Autochitect</h1>
          <p className="text-gray-500 font-medium">Autonomous Architectural Analysis for Software Systems.</p>
        </div>
      </section>

      {/* Main Analyzer Card */}
      <Card title="Start New Analysis">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label htmlFor="repo-url" className="text-sm font-semibold text-gray-700">GitHub Repository URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="e.g. https://github.com/user/repo"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all font-mono text-sm"
                  autoFocus
                  disabled={isSubmitting}
                />
                <Button type="submit" disabled={isSubmitting || !repoUrl} className="h-[46px] px-8">
                  {isSubmitting ? "Running..." : "Analyze System"}
                </Button>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                Supports public repositories only
              </p>
            </div>
          </div>
        </form>
      </Card>

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

      {/* Info Footer */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-mono text-[11px] text-gray-500 opacity-80 leading-relaxed">
        <p>
          autochitect --version 1.4.2
        </p>
        <p className="mt-1">
          Ready for autonomous architecture discovery and pattern recognition.
        </p>
      </div>
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
          {count !== undefined ? `${count} Issues Found` : "Analysis Complete"}
        </span>
      );
  }
}
