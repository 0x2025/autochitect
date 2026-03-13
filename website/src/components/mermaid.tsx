"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    htmlLabels: false, // Fix duplication by using SVG text instead of HTML
    themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#000000',
        secondaryColor: '#f4f4f4',
        tertiaryColor: '#ffffff',
        // Ensure SVG text is crisp
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    // Improve layout by giving engine more room
    // Using 'as any' because some layout properties are supported at runtime but missing in type definitions
    c4: {
        useMaxWidth: true,
        rankSpacing: 100, // Increase vertical space
        nodeSpacing: 80   // Increase horizontal space
    } as any,
    flowchart: {
        useMaxWidth: true,
        rankSpacing: 80,
        nodeSpacing: 60,
        curve: 'basis' // Smoother lines often cross less jarringly
    } as any
});

interface MermaidProps {
    chart: string;
}

const cleanChart = (chart: string) =>
    chart
        .replace(/```mermaid\s*/g, "")
        .replace(/```/g, "")
        .trim();

const renderToElement = async (el: HTMLDivElement, chart: string, prefix: string) => {
    const id = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    el.innerHTML = `<div id="${id}" class="mermaid-container w-full h-full flex justify-center items-center">${chart}</div>`;
    try {
        await mermaid.run({ querySelector: `#${id}` });
        const svg = el.querySelector('svg');
        if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
            svg.style.display = 'block';
            svg.style.margin = '0 auto';
            if (svg.viewBox.baseVal.width < 100) {
                svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            }
        }
    } catch (err) {
        let errorMessage = "An unknown error occurred.";
        if (err instanceof Error) errorMessage = err.message;
        else if (typeof err === 'string') errorMessage = err;
        else if (err && typeof err === 'object') {
            try { errorMessage = (err as any).message || (err as any).str || JSON.stringify(err); }
            catch { errorMessage = "Complex Mermaid error (see console)"; }
        }
        el.innerHTML = `
            <div class="p-4 text-red-500 font-mono text-xs flex flex-col gap-2">
                <p class="font-bold">Mermaid Error:</p>
                <p>${errorMessage}</p>
                <pre class="mt-2 p-2 bg-gray-50 rounded border border-gray-100 text-gray-700 break-all whitespace-pre-wrap text-[10px]">${chart}</pre>
            </div>`;
        console.error("Mermaid render error:", err);
    }
};

// ── Zoom / Pan Modal ──────────────────────────────────────────────────────────

interface ZoomState {
    scale: number;
    x: number;
    y: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

function ZoomableDiagramModal({
    chart,
    onClose,
}: {
    chart: string;
    onClose: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
    const dragRef = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number }>({
        active: false, startX: 0, startY: 0, originX: 0, originY: 0,
    });
    const [rendered, setRendered] = useState(false);

    // Render diagram once modal mounts
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const cleaned = cleanChart(chart);
        renderToElement(el, cleaned, 'mermaid-modal').then(() => setRendered(true));
    }, [chart]);

    // Keyboard close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Wheel zoom (centred on cursor)
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        setZoom(prev => {
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
            const ratio = newScale / prev.scale;
            return {
                scale: newScale,
                x: cursorX - ratio * (cursorX - prev.x),
                y: cursorY - ratio * (cursorY - prev.y),
            };
        });
    }, []);

    // Drag to pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, originX: zoom.x, originY: zoom.y };
        e.preventDefault();
    }, [zoom]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setZoom(prev => ({ ...prev, x: dragRef.current.originX + dx, y: dragRef.current.originY + dy }));
    }, []);

    const stopDrag = useCallback(() => { dragRef.current.active = false; }, []);

    const resetZoom = () => setZoom({ scale: 1, x: 0, y: 0 });
    const zoomIn = () => setZoom(prev => ({ ...prev, scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP) }));
    const zoomOut = () => setZoom(prev => ({ ...prev, scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP) }));

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-950/95 border-b border-white/10 shrink-0">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Architectural Diagram</span>
                <div className="flex items-center gap-2">
                    {/* Zoom controls */}
                    <button
                        onClick={zoomOut}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
                        title="Zoom out"
                    >−</button>
                    <button
                        onClick={resetZoom}
                        className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest transition-colors min-w-[52px]"
                        title="Reset zoom"
                    >
                        {Math.round(zoom.scale * 100)}%
                    </button>
                    <button
                        onClick={zoomIn}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
                        title="Zoom in"
                    >+</button>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    <button
                        onClick={onClose}
                        className="px-4 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative"
                style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
            >
                {/* Loading spinner until rendered */}
                {!rendered && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">Rendering…</span>
                    </div>
                )}
                <div
                    style={{
                        transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                        transformOrigin: '0 0',
                        // Ensure the inner div takes up space so the diagram is visible
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        minWidth: '100%',
                        minHeight: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        ref={contentRef}
                        className="bg-white rounded-2xl shadow-2xl p-8"
                        style={{ minWidth: 300, minHeight: 200 }}
                    />
                </div>
            </div>

            {/* Hint */}
            <div className="text-center py-2 shrink-0">
                <span className="text-white/30 text-[10px] uppercase tracking-widest">Scroll to zoom · Drag to pan · Esc to close</span>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        renderToElement(el, cleanChart(chart), 'mermaid-main');
    }, [chart]);

    return (
        <>
            <div className="relative group border border-gray-100 rounded-xl bg-white p-2 overflow-auto flex justify-center h-full min-h-[400px]">
                <div ref={ref} className="w-full h-full" />
                <button
                    onClick={() => setIsMaximized(true)}
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity rounded-md z-10"
                >
                    Expand
                </button>
            </div>

            {isMaximized && (
                <ZoomableDiagramModal
                    chart={chart}
                    onClose={() => setIsMaximized(false)}
                />
            )}
        </>
    );
};

export default Mermaid;
