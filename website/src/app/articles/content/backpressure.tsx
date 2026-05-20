"use client";

import { useState, useEffect } from "react";

const strategies = [
  {
    id: "buffer",
    title: "Buffer",
    subtitle: "Absorb spikes, then drain",
    color: "#6A8CAF",
    bg: "#e8f0f7",
    icon: "▣",
    body: "Add a bounded queue between producer and consumer. Smooths short-lived bursts but doesn't solve sustained overload. A buffer without a strategy for when it's full is just a delayed crash.",
    example: "Channel<T>(capacity = 1000) in Go / BlockingQueue(maxSize) in Java",
    when: "Use for: bursty workloads with headroom. Avoid: sustained overload.",
  },
  {
    id: "drop",
    title: "Drop",
    subtitle: "Shed load",
    color: "#D97757",
    bg: "#fceee8",
    icon: "✕",
    body: "When the buffer is full, discard new messages. Appropriate when messages are time-sensitive (stale metrics are useless) or when losing a small fraction is acceptable. Never drop financial transactions or state-changing commands.",
    example: "UDP for gaming / metrics pipelines / log sampling",
    when: "Use for: best-effort delivery, metrics, logs. Avoid: financial or stateful ops.",
  },
  {
    id: "block",
    title: "Block / Signal",
    subtitle: "True backpressure",
    color: "#788C5D",
    bg: "#eef1eb",
    icon: "⏸",
    body: "Signal the producer to pause. The purest form: producer's send() blocks until consumer has capacity, OR consumer sends an explicit request(n) demand signal upstream. Reactive Streams standardises this pull model.",
    example: "Reactive Streams request(n) / TCP sliding window / Kafka consumer pull",
    when: "Use for: reliable pipelines where message loss is unacceptable.",
  },
];

const metrics = [
  { metric: "Queue depth", meaning: "Buffer fill level; rising = consumer falling behind", alert: "> 80%" },
  { metric: "Consumer lag (Kafka)", meaning: "Offset gap between latest and committed", alert: "Growing" },
  { metric: "Dropped messages", meaning: "Load-shedding is active", alert: "Any" },
  { metric: "P99 processing latency", meaning: "Consumer is slowing down", alert: "> SLA" },
  { metric: "Producer block time", meaning: "Producer waiting for capacity", alert: "> 100ms" },
];

function BufferAnimation() {
  const [fill, setFill] = useState(20);
  const [running, setRunning] = useState(false);
  const [producerRate, setProducerRate] = useState(3);
  const [consumerRate] = useState(1);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setFill((prev) => {
        const next = prev + producerRate - consumerRate;
        if (next >= 100) { setRunning(false); return 100; }
        if (next <= 0) return 0;
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [running, producerRate, consumerRate]);

  const fillColor = fill > 80 ? "#D97757" : fill > 50 ? "#D4A853" : "#788C5D";

  return (
    <div style={{
      background: "var(--oat)",
      border: "1px solid var(--g300)",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>

        {/* Producer */}
        <div style={{ textAlign: "center", minWidth: "80px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "8px",
            background: running ? "#e8f0f7" : "var(--g300)",
            border: "2px solid #6A8CAF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 8px",
            transition: "background 0.2s",
          }}>
            ⚙
          </div>
          <p style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--g500)" }}>
            PRODUCER
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#6A8CAF", fontWeight: 700 }}>
            {producerRate}x rate
          </p>
        </div>

        {/* Arrow */}
        <div style={{ flex: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "48px",
            height: "2px",
            background: running && fill < 100 ? "#6A8CAF" : "var(--g300)",
            position: "relative",
            transition: "background 0.2s",
          }}>
            <span style={{ position: "absolute", right: "-6px", top: "-5px", fontSize: "12px", color: running && fill < 100 ? "#6A8CAF" : "var(--g300)" }}>▶</span>
          </div>
        </div>

        {/* Buffer */}
        <div style={{ minWidth: "72px", textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "80px",
            border: `2px solid ${fillColor}`,
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
            margin: "0 auto 8px",
            background: "var(--white)",
            transition: "border-color 0.3s",
          }}>
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${fill}%`,
              background: fillColor,
              transition: "height 0.2s ease, background 0.3s ease",
              opacity: 0.85,
            }} />
            <span style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              color: fill > 40 ? "#fff" : "var(--slate)",
              zIndex: 1,
            }}>
              {Math.round(fill)}%
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--g500)" }}>BUFFER</p>
          {fill >= 100 && (
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#D97757", fontWeight: 700 }}>FULL!</p>
          )}
        </div>

        {/* Arrow */}
        <div style={{ flex: 0 }}>
          <div style={{
            width: "48px",
            height: "2px",
            background: fill > 0 && running ? "#788C5D" : "var(--g300)",
            position: "relative",
            transition: "background 0.2s",
          }}>
            <span style={{ position: "absolute", right: "-6px", top: "-5px", fontSize: "12px", color: fill > 0 && running ? "#788C5D" : "var(--g300)" }}>▶</span>
          </div>
        </div>

        {/* Consumer */}
        <div style={{ textAlign: "center", minWidth: "80px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "8px",
            background: fill > 0 && running ? "#eef1eb" : "var(--g300)",
            border: "2px solid #788C5D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 8px",
            transition: "background 0.2s",
          }}>
            🖥
          </div>
          <p style={{ margin: 0, fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--g500)" }}>
            CONSUMER
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#788C5D", fontWeight: 700 }}>
            {consumerRate}x rate
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => { setFill(20); setRunning((v) => !v); }}
          style={{
            padding: "7px 16px",
            background: running ? "var(--slate)" : "var(--clay)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {running ? "⏹ Stop" : "▶ Simulate"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>Producer speed:</span>
          {[1, 2, 3, 5].map((r) => (
            <button
              key={r}
              onClick={() => setProducerRate(r)}
              style={{
                padding: "4px 10px",
                background: producerRate === r ? "#6A8CAF" : "var(--white)",
                color: producerRate === r ? "#fff" : "var(--g500)",
                border: "1.5px solid var(--g300)",
                borderRadius: "3px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {r}x
            </button>
          ))}
        </div>

        <button
          onClick={() => { setFill(20); setRunning(false); }}
          style={{
            padding: "7px 12px",
            background: "var(--oat)",
            color: "var(--g500)",
            border: "1.5px solid var(--g300)",
            borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <p style={{ margin: "12px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>
        Try 3x or 5x producer speed to watch the buffer fill. At 100% — that&apos;s an OOM or dropped messages.
      </p>
    </div>
  );
}

export default function BackpressureContent() {
  const [activeStrategy, setActiveStrategy] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* Intro */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        Backpressure is how a downstream consumer signals to an upstream producer to slow down. Without it, a fast producer will keep pushing data until the consumer&apos;s buffer overflows — and the process crashes, silently losing data, or cascades failures upstream.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "32px" }}>
        Producer emits 10,000 events/sec. Consumer processes 1,000 events/sec. Without a mechanism to slow the producer, the queue grows unboundedly until memory is exhausted. This is the core problem backpressure solves.
      </p>

      {/* Interactive simulation */}
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
          Pipeline Simulation — The Problem Made Visible
        </p>
        <BufferAnimation />
      </div>

      {/* Three strategies */}
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
          Three Strategies — click to expand
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {strategies.map((s) => {
            const isOpen = activeStrategy === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setActiveStrategy(isOpen ? null : s.id)}
                style={{
                  border: `1.5px solid ${s.color}`,
                  borderRadius: "6px",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: isOpen ? `0 2px 10px ${s.color}30` : "none",
                  transition: "box-shadow 0.15s ease",
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  background: isOpen ? s.bg : "var(--white)",
                  transition: "background 0.2s",
                }}>
                  <span style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    background: s.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}>
                    {s.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: s.color }}>{s.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--g500)" }}>{s.subtitle}</p>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11px",
                    color: "var(--g500)",
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                  }}>▶</span>
                </div>

                {isOpen && (
                  <div style={{
                    padding: "16px",
                    background: s.bg,
                    borderTop: `1px solid ${s.color}30`,
                    animation: "fadeIn 0.15s ease",
                  }}>
                    <p style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
                      {s.body}
                    </p>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}>
                      <div style={{
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "4px",
                        borderLeft: `3px solid ${s.color}`,
                      }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>Example: </span>
                        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>{s.example}</span>
                      </div>
                      <div style={{
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "4px",
                      }}>
                        <span style={{ fontSize: "11px", color: "var(--slate)" }}>{s.when}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TCP as model */}
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
          TCP: A Perfect Model
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}>
          {[
            { icon: "📢", title: "Receiver advertises window", body: "The receiver sends its available buffer size (receive window) in every ACK." },
            { icon: "🚦", title: "Sender respects the limit", body: "The sender never has more than receive_window bytes unacknowledged in flight." },
            { icon: "⬆", title: "Window grows as buffer drains", body: "As the receiver processes data, it advertises a larger window — the producer naturally speeds up." },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{
              padding: "14px",
              background: "var(--oat)",
              border: "1px solid var(--g300)",
              borderRadius: "6px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
              <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "var(--slate)" }}>{title}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--g500)", lineHeight: 1.5 }}>{body}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "13px", lineHeight: 1.65, color: "var(--g500)" }}>
          This is why a slow receiver naturally slows a fast sender without any application-level code. TCP&apos;s sliding window is backpressure built into the protocol itself.
        </p>
      </div>

      {/* Monitoring signals */}
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
          Monitoring Signals
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--g300)" }}>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700 }}>Metric</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700 }}>What It Means</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700 }}>Alert When</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--g300)", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", fontWeight: 600, color: "var(--clay-text)" }}>{row.metric}</td>
                <td style={{ padding: "9px 12px", color: "var(--slate)", fontSize: "12px" }}>{row.meaning}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: "#fceee8",
                    color: "#B85C38",
                    fontWeight: 600,
                  }}>
                    {row.alert}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
