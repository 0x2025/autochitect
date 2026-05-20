"use client";

import { useState } from "react";

const components = [
  {
    id: "trigger",
    label: "Trigger",
    icon: "⏰",
    color: "#6A8CAF",
    bg: "#e8f0f7",
    desc: "Scheduled or event-driven entry point. Kicks off a scan cycle — could be a cron, a git push webhook, or a manual invocation.",
  },
  {
    id: "symbol-graph",
    label: "Symbol Graph Extractor",
    icon: "◈",
    color: "#D97757",
    bg: "#fceee8",
    desc: "Parses the codebase and produces a minified topology map — modules, interfaces, dependencies — rather than sending raw source code. Reduces context window pressure dramatically.",
  },
  {
    id: "agent",
    label: "LLM Reasoning Agent",
    icon: "🤖",
    color: "#788C5D",
    bg: "#eef1eb",
    desc: "The core agent loop. Receives the symbol graph, queries the lesson store for prior findings, and reasons about architectural violations, drift, and boundary crossings using LangGraph state machine.",
  },
  {
    id: "lesson-store",
    label: "Lesson Store",
    icon: "🗄",
    color: "#5c6d46",
    bg: "#eef1eb",
    desc: "Vector database of prior architectural observations and human feedback. The agent retrieves relevant lessons before reasoning, so findings improve over time rather than repeating the same errors.",
  },
  {
    id: "report",
    label: "Findings Report",
    icon: "📋",
    color: "#4d7296",
    bg: "#e8f0f7",
    desc: "Structured output of architectural issues: severity, location, explanation, and suggested fix. Rendered as a dashboard, filed as issues, or posted to Slack.",
  },
  {
    id: "feedback",
    label: "Human Feedback Loop",
    icon: "↩",
    color: "#B85C38",
    bg: "#fceee8",
    desc: "Engineers review findings and mark them as valid/false-positive/known-exception. This feedback is embedded back into the lesson store, improving future scan quality.",
  },
];

const langGraphSteps = [
  { label: "load_graph", desc: "Fetch symbol graph from cache or regenerate" },
  { label: "retrieve_lessons", desc: "Embed graph summary → query vector store for similar prior findings" },
  { label: "reason", desc: "LLM reasons about violations given graph + lessons + architecture rules" },
  { label: "validate", desc: "Structured output validated against findings schema" },
  { label: "store_findings", desc: "Persist new findings + trigger human review if severity ≥ threshold" },
];

export default function AutchitectContent() {
  const [activeComponent, setActiveComponent] = useState<string | null>(null);

  const active = components.find((c) => c.id === activeComponent);

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* Intro */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        Architecture scanning is not a one-time event. For a lead or architect, keeping an eye on boundaries, constraints, and non-functional requirements is a daily responsibility — one that doesn&apos;t scale with team and codebase growth.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "32px" }}>
        Autochitect is an autonomous agent that continuously scans a codebase for architectural drift. It uses an LLM with a compressed symbol graph (not raw source) and a learning loop that improves signal quality over time via human feedback.
      </p>

      {/* Architecture diagram */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--g500)",
          borderBottom: "1px solid var(--g300)",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}>
          System Architecture — click a component to learn more
        </p>

        <div style={{
          background: "var(--oat)",
          border: "1px solid var(--g300)",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "12px",
        }}>
          {/* Main flow */}
          <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {["trigger", "symbol-graph", "agent", "report"].map((id, i) => {
              const comp = components.find((c) => c.id === id)!;
              const isActive = activeComponent === id;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => setActiveComponent(isActive ? null : id)}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      border: `2px solid ${comp.color}`,
                      background: isActive ? comp.color : comp.bg,
                      color: isActive ? "#fff" : comp.color,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? `0 0 0 3px ${comp.color}30` : "none",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{comp.icon}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, textAlign: "center", lineHeight: 1.2, fontFamily: "var(--font-sans, sans-serif)" }}>
                      {comp.label.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                  {i < 3 && (
                    <div style={{ width: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "var(--g500)", fontSize: "14px" }}>→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Secondary components */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            borderTop: "1px dashed var(--g300)",
            paddingTop: "16px",
          }}>
            {["lesson-store", "feedback"].map((id) => {
              const comp = components.find((c) => c.id === id)!;
              const isActive = activeComponent === id;
              return (
                <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ fontSize: "10px", color: "var(--g300)", fontFamily: "var(--font-mono, monospace)" }}>↕</div>
                  <button
                    onClick={() => setActiveComponent(isActive ? null : id)}
                    style={{
                      width: "80px",
                      height: "64px",
                      borderRadius: "8px",
                      border: `2px dashed ${comp.color}`,
                      background: isActive ? comp.color : comp.bg,
                      color: isActive ? "#fff" : comp.color,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{comp.icon}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, textAlign: "center", lineHeight: 1.2, fontFamily: "var(--font-sans, sans-serif)" }}>
                      {comp.label.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {active && (
          <div style={{
            padding: "16px",
            background: active.bg,
            border: `1.5px solid ${active.color}`,
            borderRadius: "6px",
            animation: "fadeIn 0.15s ease",
          }}>
            <p style={{
              margin: "0 0 6px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              fontWeight: 700,
              color: active.color,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              {active.icon} {active.label}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
              {active.desc}
            </p>
          </div>
        )}
      </div>

      {/* Symbol Graph Compression */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--g500)",
          borderBottom: "1px solid var(--g300)",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}>
          Symbol Graph Compression
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: "0", alignItems: "center", marginBottom: "16px" }}>
          <div style={{
            padding: "16px",
            background: "var(--oat)",
            border: "1px solid var(--g300)",
            borderRadius: "6px 0 0 6px",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "var(--g500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw Source</p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--clay-text)" }}>500k lines of code</p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--clay-text)" }}>~2M tokens</p>
            <p style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--clay-text)" }}>Context overflow →  crash</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--clay)", height: "100%", color: "#fff", fontSize: "14px" }}>→</div>
          <div style={{
            padding: "16px",
            background: "#eef1eb",
            border: "1.5px solid #788C5D",
            borderRadius: "0 6px 6px 0",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#5c6d46", textTransform: "uppercase", letterSpacing: "0.06em" }}>Symbol Graph</p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "#5c6d46" }}>Modules + interfaces + deps</p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "#5c6d46" }}>~8k tokens</p>
            <p style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "#5c6d46" }}>250x compression ✓</p>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "var(--g500)", lineHeight: 1.65 }}>
          The symbol graph preserves the structural information the agent needs — which module depends on which, which interface is broken across which boundary — without the implementation noise that would blow the context window.
        </p>
      </div>

      {/* LangGraph state machine */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--g500)",
          borderBottom: "1px solid var(--g300)",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}>
          Agent Loop (LangGraph State Machine)
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {langGraphSteps.map((step, i) => (
            <div key={step.label} style={{ display: "flex", gap: "0", alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--clay)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono, monospace)",
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                {i < langGraphSteps.length - 1 && (
                  <div style={{ width: "2px", flex: 1, background: "var(--g300)", margin: "4px 0" }} />
                )}
              </div>

              <div style={{
                paddingLeft: "12px",
                paddingBottom: i < langGraphSteps.length - 1 ? "16px" : "0",
              }}>
                <p style={{ margin: "2px 0 3px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", fontWeight: 700, color: "var(--slate)" }}>
                  {step.label}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--g500)", lineHeight: 1.55 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning loop */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--g500)",
          borderBottom: "1px solid var(--g300)",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}>
          The Learning Loop
        </p>
        <div style={{
          padding: "16px",
          background: "var(--oat)",
          border: "1px solid var(--g300)",
          borderRadius: "6px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "28px", flexShrink: 0 }}>🔄</span>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "var(--slate)" }}>
              Findings improve over time
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--g500)", lineHeight: 1.65 }}>
              Initial scans produce noisy results — false positives, known exceptions, intentional coupling. Human reviewers mark each finding. That feedback is embedded into the lesson store as a vector.
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--g500)", lineHeight: 1.65 }}>
              On the next scan, the agent retrieves semantically similar prior findings before reasoning. Patterns that were previously marked as false-positives are suppressed; real issues are amplified. Signal quality improves monotonically.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
