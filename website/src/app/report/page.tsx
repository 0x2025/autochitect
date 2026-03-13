"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import Mermaid from "@/components/mermaid";
import { useSearchParams, useRouter } from "next/navigation";

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
                <p className="text-gray-500 text-sm font-bold tracking-widest uppercase animate-pulse">Loading Report...</p>
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

    const fetchReport = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/reports/${id}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
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
        a.download = `analysis_report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case "POOR": return "bg-red-50 text-red-700 border-red-100";
            case "FAIR": return "bg-amber-50 text-amber-700 border-amber-100";
            case "GOOD": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            default: return "bg-gray-50 text-gray-700 border-gray-100";
        }
    };

    const getCriticalityStyles = (criticality: string) => {
        switch (criticality) {
            case "CRITICAL": return "bg-red-100 text-red-800 border-red-200";
            case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
            case "MEDIUM": return "bg-amber-100 text-amber-800 border-amber-200";
            case "LOW": return "bg-blue-100 text-blue-800 border-blue-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 py-20">
                <p className="text-gray-500 text-sm font-bold tracking-widest uppercase animate-pulse">Generating Report</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative border border-gray-100 rounded-3xl p-16 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-300"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Analysis Report</h2>
                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest max-w-xs mx-auto mt-4">
                            Drop report.json here
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-100 pb-8">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push("/")}
                        className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                    >
                        Back to Projects
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Architecture Report</h1>
                    <p className="text-gray-500 font-medium">Comprehensive analysis of system design and code quality.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="px-6 py-2.5 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                    >
                        Export Data
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Information Column */}
                <aside className="lg:col-span-4 space-y-12">
                    {/* Health Section */}
                    <section className="space-y-4">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                            System Health
                        </div>
                        <div className={cn(
                            "px-4 py-3 rounded-xl border font-bold text-center text-lg tracking-tight",
                            getHealthColor(report.health)
                        )}>
                            {report.health}
                        </div>
                        <div className="text-gray-600 text-sm leading-relaxed bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            {report.summary}
                        </div>
                    </section>

                    {/* Diagram Section */}
                    {report.diagrams && (report.diagrams.c1 || report.diagrams.c2 || report.diagrams.c3) && (
                        <section className="space-y-4">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                Model Diagrams
                            </div>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                                <nav className="flex items-center border-b border-gray-100 bg-gray-50/50 p-1">
                                    {(["c1", "c2", "c3"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "flex-1 py-2 text-[10px] font-bold transition-all rounded-lg uppercase tracking-widest",
                                                activeTab === tab
                                                    ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                                                    : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </nav>
                                <div className="p-4 bg-white min-h-[300px] flex items-center justify-center">
                                    {report.diagrams[activeTab] ? (
                                        <div className="w-full">
                                            <Mermaid chart={report.diagrams[activeTab]} />
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                            No Data
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </aside>

                {/* Findings Column */}
                <main className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                            Findings ({report.findings.length})
                        </div>
                    </div>

                    <div className="space-y-4">
                        {report.findings.map((finding) => (
                            <div
                                key={finding.id}
                                className={cn(
                                    "group border border-gray-100 rounded-2xl overflow-hidden bg-white transition-all",
                                    validatedFindings[finding.id] ? "opacity-60 bg-gray-50/50" : "hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50"
                                )}
                            >
                                <div className="p-6 space-y-6">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-widest",
                                                    getCriticalityStyles(finding.criticality)
                                                )}>
                                                    {finding.criticality}
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">
                                                    {finding.title}
                                                </h3>
                                            </div>
                                            <p className="text-gray-500 text-sm leading-relaxed font-medium">
                                                {finding.impact}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                                            className="px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-colors shrink-0"
                                        >
                                            {expandedFinding === finding.id ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {expandedFinding === finding.id && (
                                        <div className="space-y-8 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Description
                                                    </h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                                                        {finding.description}
                                                    </p>
                                                </div>
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Recommendation
                                                    </h4>
                                                    <p className="text-sm text-gray-900 font-bold leading-relaxed bg-blue-50/50 p-5 rounded-2xl border border-blue-100 italic">
                                                        {finding.recommendation}
                                                    </p>
                                                </div>
                                            </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {finding.files.map(f => {
                                                        const repoBase = report.repoUrl?.replace(/\/+$/, '');
                                                        const githubUrl = repoBase ? `${repoBase}/blob/main/${f}` : null;
                                                        const badge = (
                                                            <span className="inline-flex items-center font-mono text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                                {f}
                                                            </span>
                                                        );
                                                        return githubUrl ? (
                                                            <a key={f} href={githubUrl} target="_blank" rel="noopener noreferrer"
                                                               className="hover:opacity-70 transition-opacity">
                                                                {badge}
                                                            </a>
                                                        ) : (
                                                            <span key={f}>{badge}</span>
                                                        );
                                                    })}
                                                </div>

                                            {finding.evidenceCode && (
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Code Evidence
                                                    </h4>
                                                    <div className="relative group/code">
                                                        <pre className="text-[12px] font-mono leading-relaxed bg-[#0d1117] text-[#e6edf3] p-5 rounded-2xl border border-gray-100 overflow-x-auto">
                                                            <code>{finding.evidenceCode}</code>
                                                        </pre>
                                                        <div className="absolute top-4 right-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                            Snippet
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!validatedFindings[finding.id] ? (
                                        <div className="pt-2 flex items-center gap-3">
                                            <button
                                                disabled={isSavingMoat === finding.id}
                                                onClick={() => handleMoatConfirmation(finding, true)}
                                                className="flex-1 sm:flex-initial px-8 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all"
                                            >
                                                {isSavingMoat === finding.id ? "Saving" : "Accept"}
                                            </button>
                                            <button
                                                disabled={isSavingMoat === finding.id}
                                                onClick={() => handleMoatConfirmation(finding, false)}
                                                className="flex-1 sm:flex-initial px-8 py-2.5 bg-white text-gray-400 border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 hover:text-red-500 transition-all"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="pt-2">
                                            <div className={cn(
                                                "inline-flex px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                                validatedFindings[finding.id].valid
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                    : "bg-red-50 text-red-700 border border-red-100"
                                            )}>
                                                {validatedFindings[finding.id].valid ? "Validated" : "Dismissed"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
