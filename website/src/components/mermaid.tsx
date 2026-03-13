"use client";

import React, { useEffect, useRef } from 'react';
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

import { Card, Button } from './ui';

interface MermaidProps {
    chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<HTMLDivElement>(null);
    const [isMaximized, setIsMaximized] = React.useState(false);

    const renderMermaid = async (targetRef: React.RefObject<HTMLDivElement | null>, containerId: string) => {
        if (targetRef.current && chart) {
            const cleanChart = chart
                .replace(/```mermaid\s*/g, "")
                .replace(/```/g, "")
                .trim();

            const renderId = `${containerId}-${Math.random().toString(36).substr(2, 9)}`;
            targetRef.current.innerHTML = `<div id="${renderId}" class="mermaid-container w-full h-full flex justify-center items-center">${cleanChart}</div>`;

            try {
                await mermaid.run({
                    querySelector: `#${renderId}`,
                });

                // Post-render fix for responsiveness and auto-layout
                const svg = targetRef.current.querySelector('svg');
                if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    svg.style.display = 'block';
                    svg.style.margin = '0 auto';
                    
                    // Force re-evaluation of auto-layout if it looks too small
                    if (svg.viewBox.baseVal.width < 100) {
                        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
                    }
                }
            } catch (err) {
                console.error("Mermaid render error:", err);
                if (targetRef.current) {
                    let errorMessage = "An unknown error occurred during Mermaid rendering.";
                    if (err instanceof Error) {
                        errorMessage = err.message;
                    } else if (typeof err === 'string') {
                        errorMessage = err;
                    } else if (err && typeof err === 'object') {
                        try {
                            // Some mermaid errors are complex objects, try to find a message or stringify
                            errorMessage = (err as any).message || (err as any).str || JSON.stringify(err);
                        } catch (e) {
                            errorMessage = "Complex Mermaid error (see console)";
                        }
                    }

                    targetRef.current.innerHTML = `
                        <div class="p-4 text-red-500 font-mono text-xs win98-inset bg-white flex flex-col gap-2">
                            <div>
                                <p class="font-bold">Mermaid Error:</p>
                                <p>${errorMessage}</p>
                            </div>
                            <div class="mt-2 pt-2 border-t border-red-100">
                                <p class="text-[10px] text-gray-500 mb-1 italic">Render Source:</p>
                                <pre class="p-2 bg-gray-50 rounded border border-gray-100 text-gray-700 break-all whitespace-pre-wrap">${cleanChart}</pre>
                            </div>
                        </div>`;
                }
            }
        }
    };

    useEffect(() => {
        renderMermaid(ref, 'mermaid-main');
    }, [chart]);

    useEffect(() => {
        if (isMaximized) {
            const timer = setTimeout(() => {
                renderMermaid(zoomRef, 'mermaid-zoom');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isMaximized, chart]);

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
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="w-full h-full max-w-[95vw] max-h-[95vh]">
                        <Card
                            title="Architectural Diagram - Maximized View"
                            className="h-full"
                            headerAction={
                                <Button onClick={() => setIsMaximized(false)} variant="secondary" className="px-3 py-1 text-xs">
                                    Close Diagram
                                </Button>
                            }
                        >
                            <div className="flex flex-col h-full">
                                <div className="flex-1 bg-white border border-gray-100 rounded-xl overflow-auto flex justify-center items-center p-4" ref={zoomRef} />
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
};

export default Mermaid;
