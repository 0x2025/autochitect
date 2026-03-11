"use client";

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#000000',
        secondaryColor: '#f4f4f4',
        tertiaryColor: '#ffffff',
    }
});

interface MermaidProps {
    chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && chart) {
            try {
                mermaid.contentLoaded();
                // Clear previous content
                ref.current.innerHTML = `<div class="mermaid">${chart}</div>`;
                mermaid.init(undefined, ref.current.children[0] as HTMLElement);
            } catch (err) {
                console.error("Mermaid render error:", err);
            }
        }
    }, [chart]);

    return (
        <div className="win98-inset bg-white p-4 overflow-auto flex justify-center" ref={ref} />
    );
};

export default Mermaid;
