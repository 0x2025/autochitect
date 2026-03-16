"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import Mermaid from "@/components/mermaid";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, FileText, Activity, AlertTriangle, CheckCircle2, ChevronRight, Download } from "lucide-react";

interface Finding {
    id: string;
    criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    impact: string;
    files: string[];
    recommendation: string;
    valid?: boolean;
    rationale?: string;
    evidenceCode?: string;
}

interface StructuredReport {
    health: "POOR" | "FAIR" | "GOOD";
    summary: string;
    diagrams: {
        c1: string;
        c2: string;
        c3: string;
    };
    findings: Finding[];
    discoveredLanguages?: string[];
    repoUrl?: string;
}

export default function ReportPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 py-20">
                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase animate-pulse">Loading Analysis Report...</p>
            </div>
        }>
            <ReportContent />
        </Suspense>
    );
}

function ReportContent() {
    const [report, setReport] = useState<StructuredReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [validatedFindings, setValidatedFindings] = useState<Record<string, { valid: boolean, rationale: string }>>({});
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"c1" | "c2" | "c3">("c1");
    const [isSavingMoat, setIsSavingMoat] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const searchParams = useSearchParams();
    const router = useRouter();
    const repoId = searchParams.get("repoId");
    const source = searchParams.get("source");

    useEffect(() => {
        if (repoId) {
            fetchReport(repoId);
        } else if (source === "local") {
            const temp = localStorage.getItem("temp_report");
            if (temp) {
                try {
                    setReport(JSON.parse(temp));
                } catch (e) {
                    console.error("Failed to parse local report");
                }
            }
        }
    }, [repoId, source]);

    const [error, setError] = useState<string | null>(null);

    const fetchReport = async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/reports/${id}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else if (res.status === 403) {
                setError("Access Denied: You do not have permission to view this private report.");
            } else {
                console.error("Report not found or not yet completed");
            }
        } catch (err) {
            console.error("Failed to load report");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    setReport(json);
                } catch (err) {
                    alert("Invalid JSON file");
                }
            };
            reader.readAsText(file);
        }
    };

    const handleMoatConfirmation = async (finding: Finding, isValid: boolean) => {
        setIsSavingMoat(finding.id);
        try {
            const res = await fetch("/api/moat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    finding,
                    is_valid: isValid,
                    tech_stack: report?.discoveredLanguages || []
                })
            });

            if (res.ok) {
                setValidatedFindings(prev => ({
                    ...prev,
                    [finding.id]: { valid: isValid, rationale: "Saved to Moat" }
                }));
            } else {
                alert("Failed to save validation status");
            }
        } catch (err) {
            alert("Error connecting to validation service");
        } finally {
            setIsSavingMoat(null);
        }
    };

    const handleExport = () => {
        if (!report) return;
        const finalReport = {
            ...report,
            findings: report.findings.map(f => ({
                ...f,
                ...validatedFindings[f.id]
            }))
        };
        const blob = new Blob([JSON.stringify(finalReport, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `autonomous_architect_report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const getHealthStyles = (health: string) => {
        switch (health) {
            case "POOR": return "border-red-600 text-red-700 bg-red-50/30";
            case "FAIR": return "border-amber-600 text-amber-700 bg-amber-50/30";
            case "GOOD": return "border-emerald-600 text-emerald-700 bg-emerald-50/30";
            default: return "border-slate-400 text-slate-500 bg-slate-50/30";
        }
    };

    const getCriticalityBadge = (criticality: string) => {
        switch (criticality) {
            case "CRITICAL": return "border-red-900 text-red-900 bg-red-50";
            case "HIGH": return "border-orange-900 text-orange-900 bg-orange-50";
            case "MEDIUM": return "border-amber-900 text-amber-900 bg-amber-50";
            case "LOW": return "border-slate-600 text-slate-600 bg-slate-50";
            default: return "border-slate-400 text-slate-400";
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 py-20">
                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase animate-pulse italic">Generating Autonomous Report</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="inline-flex p-4 border border-red-200 bg-red-50/50 text-red-600 mb-4">
                    <Lock size={32} />
                </div>
                <h2 className="text-2xl font-serif italic text-slate-900">{error}</h2>
                <p className="text-sm text-slate-600 font-serif leading-relaxed">This scan contains private information and is only available to the authorized repository owner.</p>
                <button 
                    onClick={() => router.push("/")}
                    className="bg-slate-800 text-white px-8 h-10 text-[11px] font-bold uppercase tracking-widest"
                >
                    &laquo; Exit to Dashboard
                </button>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative border border-slate-300 bg-[#f8f8f0] p-16 cursor-pointer hover:border-slate-800 transition-all"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center">
                        <FileText size={48} className="text-slate-300 mb-4 group-hover:text-slate-800 transition-colors" />
                        <h2 className="text-xl font-serif italic text-slate-900 mb-2">Import Report</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                            Select report.json file
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <header className="border-b-2 border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push("/tools/architecture-scan")}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                    >
                        &laquo; Back to Product
                    </button>
                    <h1 className="text-3xl font-serif italic m-0">Architecture Report</h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-serif text-slate-600">
                        <span className="flex items-center gap-1"><Activity size={14} /> ID: {repoId || "Local"}</span>
                        {report.repoUrl && (
                            <span className="border-l border-slate-300 pl-4 truncate max-w-xs">{report.repoUrl}</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="px-6 py-2 border border-slate-300 bg-[#e0e0d0] text-[11px] font-bold uppercase tracking-widest hover:bg-[#d0d0c0] transition-colors flex items-center gap-2"
                >
                    <Download size={14} /> Export Results
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Information Column */}
                <aside className="lg:col-span-4 space-y-10">
                    {/* Health Section */}
                    <section className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">System Health</h3>
                        <div className={cn(
                            "px-4 py-2 border-2 font-bold text-center text-lg tracking-widest font-sans",
                            getHealthStyles(report.health)
                        )}>
                            {report.health}
                        </div>
                        <div className="text-sm font-serif leading-relaxed text-slate-800 bg-[#f8f8f0] p-4 border border-slate-200">
                            {report.summary}
                        </div>
                    </section>

                    {/* Diagram Section */}
                    {report.diagrams && (report.diagrams.c1 || report.diagrams.c2 || report.diagrams.c3) && (
                        <section className="space-y-4">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">Structural Models</h3>
                            <div className="border border-slate-300">
                                <nav className="flex bg-[#e0e0d0] border-b border-slate-300">
                                    {(["c1", "c2", "c3"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "flex-1 py-1.5 text-[10px] font-bold transition-all uppercase tracking-widest text-center",
                                                activeTab === tab
                                                    ? "bg-[#e8e8d8] text-slate-900 border-x border-slate-300 first:border-l-0 last:border-r-0"
                                                    : "text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            {tab === "c1" ? "Context" : tab === "c2" ? "Container" : "Component"}
                                        </button>
                                    ))}
                                </nav>
                                <div className="p-4 flex items-center justify-center min-h-[300px]">
                                    {report.diagrams[activeTab] ? (
                                        <div className="w-full">
                                            <Mermaid chart={report.diagrams[activeTab]} />
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-300 uppercase italic">
                                            No data for this level
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </aside>

                {/* Findings Column */}
                <main className="lg:col-span-8 space-y-6">
                    <div className="border-b border-slate-800 pb-1 flex justify-between items-end">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Autonomous Findings</h3>
                        <span className="text-[10px] italic text-slate-400">{report.findings.length} points identified</span>
                    </div>

                    <div className="space-y-8">
                        {report.findings.map((finding) => (
                            <div
                                key={finding.id}
                                className={cn(
                                    "border-l-4 p-5 space-y-4",
                                    finding.criticality === "CRITICAL" ? "border-red-600" : 
                                    finding.criticality === "HIGH" ? "border-orange-600" :
                                    finding.criticality === "MEDIUM" ? "border-amber-600" : "border-slate-400",
                                    validatedFindings[finding.id] && "opacity-60 grayscale bg-slate-50"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-1.5 py-0.5 text-[9px] font-bold border uppercase tracking-widest",
                                                getCriticalityBadge(finding.criticality)
                                            )}>
                                                {finding.criticality}
                                            </span>
                                            <h4 className="text-lg font-serif italic text-slate-900 leading-tight">
                                                {finding.title}
                                            </h4>
                                        </div>
                                        <p className="text-sm font-serif text-slate-700 italic">
                                            {finding.impact}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                                    >
                                        {expandedFinding === finding.id ? "Minimize &laquo;" : "Details &raquo;"}
                                    </button>
                                </div>

                                {expandedFinding === finding.id && (
                                    <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</h5>
                                                <div className="text-sm font-serif text-slate-800 leading-relaxed bg-[#f8f8f0] p-4 border border-slate-200">
                                                    {finding.description}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommendation</h5>
                                                <div className="text-sm font-serif text-slate-900 font-bold leading-relaxed border-2 border-slate-800 p-4 italic">
                                                    {finding.recommendation}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affected Files</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {finding.files.map(f => (
                                                    <span key={f} className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {finding.evidenceCode && (
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signal Evidence</h5>
                                                <pre className="text-[11px] font-mono leading-relaxed bg-[#1a1a1a] text-[#dcdcdc] p-4 border border-slate-800 overflow-x-auto">
                                                    <code>{finding.evidenceCode}</code>
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!validatedFindings[finding.id] ? (
                                    <div className="pt-2 flex items-center gap-4">
                                        <button
                                            disabled={isSavingMoat === finding.id}
                                            onClick={() => handleMoatConfirmation(finding, true)}
                                            className="px-6 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle2 size={12} /> {isSavingMoat === finding.id ? "Saving..." : "Accept Finding"}
                                        </button>
                                        <button
                                            disabled={isSavingMoat === finding.id}
                                            onClick={() => handleMoatConfirmation(finding, false)}
                                            className="px-6 py-1.5 border border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 hover:border-red-600 transition-all flex items-center gap-2"
                                        >
                                            <AlertTriangle size={12} /> Dismiss
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-2 flex items-center gap-2">
                                        {validatedFindings[finding.id].valid ? (
                                            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-3 py-1 border border-emerald-100 flex items-center gap-1.5">
                                                <CheckCircle2 size={12} /> Validated to Knowledge Base
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-3 py-1 border border-red-100 flex items-center gap-1.5">
                                                <AlertTriangle size={12} /> Dismissed Analysis
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
