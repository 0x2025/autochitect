"use client";

import { useState, useEffect, useRef } from "react";

// ─── tokens ───────────────────────────────────────────────────────────────────
const CLAY = "#D97757", OLIVE = "#788C5D", SKY = "#6A8CAF";
const SLATE = "#141413", G500 = "#7a7a6e", G300 = "#c8c4b8", OAT = "#E3DACC";
const GREEN = "#4a9960", AMBER = "#D4A853", RED = "#C94040";

// ─── helpers ──────────────────────────────────────────────────────────────────
function SH({ label }: { label: string }) {
  return (
    <p style={{
      fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700,
      textTransform: "uppercase" as const, letterSpacing: "0.12em", color: G500,
      borderBottom: `1px solid ${G300}`, paddingBottom: "8px",
      marginBottom: "16px", marginTop: "44px",
    }}>{label}</p>
  );
}

function MetricBox({ label, value, unit, sub, status }: {
  label: string; value: string | number; unit?: string; sub?: string;
  status: "ok" | "warn" | "error" | "neutral";
}) {
  const bg = status === "ok" ? "#eef3eb" : status === "warn" ? "#fdf4e7" : status === "error" ? "#fceee8" : OAT;
  const col = status === "ok" ? OLIVE : status === "warn" ? AMBER : status === "error" ? CLAY : G500;
  return (
    <div style={{ background: bg, border: `1.5px solid ${col}`, borderRadius: "6px", padding: "10px 14px", minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: G500 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "20px", fontWeight: 700, color: col, lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span style={{ fontSize: "11px", marginLeft: "4px", color: G500, fontWeight: 400 }}>{unit}</span>}
      </p>
      {sub && <p style={{ margin: "4px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: col }}>{sub}</p>}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        padding: "6px 12px", border: `1.5px solid ${value ? CLAY : G300}`,
        borderRadius: "4px", background: value ? "#fceee8" : "white",
        cursor: "pointer", fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "12px", fontWeight: 600, color: value ? CLAY : G500,
      }}
    >
      <span style={{
        width: "28px", height: "14px", borderRadius: "7px",
        background: value ? CLAY : G300, position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: "2px",
          left: value ? "16px" : "2px",
          width: "10px", height: "10px", borderRadius: "50%",
          background: "white", transition: "left 0.2s",
        }} />
      </span>
      {label}
    </button>
  );
}

// ─── Section 1: Lifecycle Stepper ─────────────────────────────────────────────

interface Step {
  label: string; desc: string;
  client: { state: string; detail: string };
  server: { state: string; detail: string };
  arrow: null | { text: string; color: string; dir: "right" | "left" | "both" | "none" };
  code: string;
}

const STEPS: Step[] = [
  {
    label: "Initial State",
    desc: "Server process has started. No file descriptors are open. The client has no connection.",
    client: { state: "IDLE", detail: "no socket" },
    server: { state: "IDLE", detail: "no socket" },
    arrow: null,
    code: "# Server process just started\n# No file descriptors open",
  },
  {
    label: "server: socket()",
    desc: "OS creates a socket and returns file descriptor fd=3. Just a handle — not bound to any address yet. SOCK_STREAM means TCP.",
    client: { state: "IDLE", detail: "no socket" },
    server: { state: "CREATED", detail: "fd=3 · SOCK_STREAM" },
    arrow: null,
    code: "server_fd = socket(AF_INET, SOCK_STREAM, 0)\n# returns fd=3",
  },
  {
    label: "server: bind() + listen()",
    desc: "bind() claims 0.0.0.0:8080. listen(128) tells the kernel to create an accept queue — up to 128 pending handshakes queue here before accept() drains them.",
    client: { state: "IDLE", detail: "no socket" },
    server: { state: "LISTENING", detail: "fd=3 · 0.0.0.0:8080\nbacklog queue: 128 max" },
    arrow: null,
    code: "server_fd.bind(('0.0.0.0', 8080))\nserver_fd.listen(128)\n# kernel accept queue active",
  },
  {
    label: "client: connect() → SYN",
    desc: "Client creates its socket and calls connect(). Kernel sends SYN and blocks the call. connect() will not return until the 3-way handshake completes or times out.",
    client: { state: "SYN_SENT", detail: "fd=5\nconnect() blocking" },
    server: { state: "LISTENING", detail: "fd=3 · :8080" },
    arrow: { text: "SYN →", color: SKY, dir: "right" },
    code: "client_fd = socket(AF_INET, SOCK_STREAM)\nclient_fd.connect(('server', 8080))\n# SYN sent — connect() blocks",
  },
  {
    label: "Handshake — SYN-ACK + ACK",
    desc: "Server kernel replies SYN-ACK. Client kernel sends ACK. Connection is ESTABLISHED inside the kernel and placed in the accept queue. Server app has not called accept() yet.",
    client: { state: "ESTABLISHED", detail: "fd=5\nconnect() returned" },
    server: { state: "LISTEN (queued)", detail: "fd=3 · 1 conn in queue" },
    arrow: { text: "⇄ ESTABLISHED", color: OLIVE, dir: "both" },
    code: "# Kernel-to-kernel (app sees none of this):\n# Server kernel → SYN-ACK\n# Client kernel → ACK\n# Connection now in accept queue",
  },
  {
    label: "server: accept() → new fd",
    desc: "accept() dequeues one connection and returns fd=4, specific to this client. fd=3 continues listening. The listening socket is a factory — this split is fundamental.",
    client: { state: "ESTABLISHED", detail: "fd=5 · ready" },
    server: { state: "ESTABLISHED", detail: "fd=4 (this client)\nfd=3 still listening" },
    arrow: { text: "⇄ ESTABLISHED", color: OLIVE, dir: "both" },
    code: "conn_fd, addr = server_fd.accept()\n# conn_fd = fd=4  ← this client\n# server_fd = fd=3 ← keeps listening",
  },
  {
    label: "Data Exchange",
    desc: "Both sides read/write on their fds. Kernel buffers data in send/receive buffers (~87 KB each by default). send() copies bytes from userspace into kernel; NIC DMA's to wire.",
    client: { state: "ESTABLISHED", detail: "fd=5\nsend() / recv()" },
    server: { state: "ESTABLISHED", detail: "fd=4\nrecv() / send()" },
    arrow: { text: "⇄ DATA", color: CLAY, dir: "both" },
    code: "# Server\ndata = conn_fd.recv(4096)\nconn_fd.sendall(b'HTTP/1.1 200 OK...')\n\n# Client\nclient_fd.sendall(b'GET / HTTP/1.1...')\nresp = client_fd.recv(65536)",
  },
  {
    label: "close() — 4-way teardown",
    desc: "close() sends FIN. Other side receives EOF (recv() returns 0), then closes too. Four packets total: FIN, ACK, FIN, ACK. Both file descriptors are released.",
    client: { state: "CLOSED", detail: "fd=5 released" },
    server: { state: "FIN_WAIT", detail: "fd=4 → FIN sent" },
    arrow: { text: "FIN →", color: G500, dir: "right" },
    code: "conn_fd.close()      # server sends FIN\n# client: recv() returns b'' (EOF)\nclient_fd.close()    # client sends FIN\n# both fds released",
  },
  {
    label: "TIME_WAIT — 60 seconds",
    desc: "FIN initiator enters TIME_WAIT. Your fd is released — app is free. But kernel holds the 5-tuple (src_ip, src_port, dst_ip, 8080) for 2×MSL ≈ 60s. That port pair cannot be reused. At 1,000 req/s: 60,000 frozen port pairs. Ephemeral range is ~28,000 ports. Exhaustion = EADDRNOTAVAIL.",
    client: { state: "TIME_WAIT", detail: "fd=5 RELEASED\n5-tuple frozen 60s\n~168 bytes in kernel" },
    server: { state: "CLOSED", detail: "fd=4 released\nclean" },
    arrow: { text: "TIME_WAIT", color: G300, dir: "none" },
    code: "# No app code — kernel state only\n# tcp_timewait_sock: ~168 bytes\n# Holds: (client_ip, eph_port, server:8080)\n#\n# At 1000 req/s:\n# 1000 × 60s = 60,000 frozen pairs\n# Port range: ~28,231 — EXHAUSTED",
  },
];

const stateColor = (s: string) => {
  if (s.includes("ESTABLISHED")) return OLIVE;
  if (s.includes("SYN")) return SKY;
  if (s.includes("LISTEN")) return SKY;
  if (s.includes("CREATED")) return SKY;
  if (s.includes("TIME_WAIT")) return G500;
  if (s.includes("FIN")) return AMBER;
  if (s.includes("CLOSED")) return G300;
  return G300;
};

function NodeBox({ title, state, detail, active }: { title: string; state: string; detail: string; active: boolean }) {
  const col = stateColor(state);
  return (
    <div style={{
      flex: 1, border: `2px solid ${active ? col : G300}`, borderRadius: "8px",
      padding: "14px", background: active ? `${col}12` : "white",
      transition: "all 0.25s ease", minWidth: 0,
    }}>
      <p style={{ margin: "0 0 6px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: G500 }}>{title}</p>
      <span style={{
        display: "inline-block", padding: "2px 8px", borderRadius: "3px",
        background: active ? col : G300, color: "white",
        fontFamily: "var(--font-mono, monospace)", fontSize: "10px", fontWeight: 700, marginBottom: "8px",
      }}>{state}</span>
      <p style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: SLATE, lineHeight: 1.65, whiteSpace: "pre-line" }}>{detail}</p>
    </div>
  );
}

function LifecycleStepper() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isActive = (st: string) => !["IDLE", "CLOSED"].includes(st) && !st.startsWith("CLOSED");

  return (
    <div style={{ marginBottom: "8px" }}>
      {/* progress dots */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, height: "4px", border: "none", borderRadius: "2px",
            background: i <= step ? CLAY : G300, cursor: "pointer", padding: 0,
          }} />
        ))}
      </div>

      {/* Nav buttons sit here so they never move regardless of content height below */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
        <button onClick={() => setStep(v => Math.max(0, v - 1))} disabled={step === 0} style={{
          padding: "8px 16px", background: step === 0 ? G300 : OAT,
          color: step === 0 ? G500 : SLATE, border: `1.5px solid ${G300}`,
          borderRadius: "4px", fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "12px", fontWeight: 600, cursor: step === 0 ? "default" : "pointer",
        }}>← Prev</button>
        <button onClick={() => setStep(v => Math.min(STEPS.length - 1, v + 1))} disabled={step === STEPS.length - 1} style={{
          padding: "8px 16px", background: step === STEPS.length - 1 ? G300 : CLAY,
          color: "white", border: "none", borderRadius: "4px",
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
          cursor: step === STEPS.length - 1 ? "default" : "pointer",
        }}>Next →</button>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: G500 }}>{step + 1} / {STEPS.length}</span>
      </div>

      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", fontWeight: 700, color: CLAY }}>
        Step {step + 1} / {STEPS.length}: {s.label}
      </p>
      {/* Fixed height so diagram below never shifts */}
      <p style={{ margin: "0 0 14px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", color: G500, lineHeight: 1.65, minHeight: "64px" }}>{s.desc}</p>

      {/* diagram */}
      <div style={{ border: `1px solid ${G300}`, borderRadius: "8px", padding: "16px", background: OAT, marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <NodeBox title="Client" state={s.client.state} detail={s.client.detail} active={isActive(s.client.state)} />

          <div style={{ width: "72px", flexShrink: 0, textAlign: "center" }}>
            {s.arrow && s.arrow.dir !== "none" ? (
              <>
                <div style={{ height: "2px", background: s.arrow.color, position: "relative", marginBottom: "4px" }}>
                  {(s.arrow.dir === "right" || s.arrow.dir === "both") && (
                    <span style={{ position: "absolute", right: "-4px", top: "-5px", fontSize: "10px", color: s.arrow.color }}>▶</span>
                  )}
                  {s.arrow.dir === "both" && (
                    <span style={{ position: "absolute", left: "-4px", top: "-5px", fontSize: "10px", color: s.arrow.color }}>◀</span>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", fontWeight: 700, color: s.arrow.color }}>{s.arrow.text}</span>
              </>
            ) : s.arrow && s.arrow.dir === "none" ? (
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", fontWeight: 700, color: s.arrow.color }}>{s.arrow.text}</span>
            ) : (
              <div style={{ height: "2px", background: G300 }} />
            )}
          </div>

          <NodeBox title="Server" state={s.server.state} detail={s.server.detail} active={isActive(s.server.state)} />
        </div>
      </div>

      {/* Fixed height so Prev/Next above never shift when code length varies */}
      <pre style={{
        background: SLATE, color: "#e2e0da", borderRadius: "6px",
        padding: "12px 16px", fontFamily: "var(--font-mono, monospace)",
        fontSize: "12px", lineHeight: 1.7, margin: 0,
        height: "148px", overflowY: "auto" as const, overflowX: "auto" as const,
      }}>{s.code}</pre>
    </div>
  );
}

// ─── Section 2: I/O Model Lab ─────────────────────────────────────────────────

function sliderToConcurrent(v: number) {
  // 0→10, 50→700, 100→50000 (log scale)
  return Math.round(10 * Math.pow(5000, v / 100));
}

function SocketDot({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: color, margin: "1px" }} />;
}

function IOModelLab() {
  const [sliderVal, setSliderVal] = useState(30);
  const [ioModel, setIoModel] = useState<"blocking" | "epoll">("blocking");
  const [fdRaised, setFdRaised] = useState(false);

  const concurrent = sliderToConcurrent(sliderVal);
  const fdLimit = fdRaised ? 65535 : 1024;

  // Derived metrics
  const threads = ioModel === "blocking" ? concurrent : 4;
  const memMB = ioModel === "blocking"
    ? Math.round(concurrent * 8)          // 8 MB thread stack each
    : Math.round(concurrent * 4 / 1000);  // 4 KB tcp_sock each

  // CPU: blocking saturates ~5k conn; epoll ~100k conn
  const cpuPct = ioModel === "blocking"
    ? Math.min(100, Math.round(2 + concurrent * 0.02))
    : Math.min(100, Math.round(1 + concurrent * 0.001));

  const fdStatus: "ok" | "warn" | "error" =
    concurrent > fdLimit ? "error" : concurrent > fdLimit * 0.8 ? "warn" : "ok";
  const memStatus: "ok" | "warn" | "error" =
    memMB > 8000 ? "error" : memMB > 4000 ? "warn" : "ok";
  const cpuStatus: "ok" | "warn" | "error" =
    cpuPct >= 100 ? "error" : cpuPct > 70 ? "warn" : "ok";

  const dotCount = Math.min(concurrent, 200);
  const dotColor = fdStatus === "error" ? RED : OLIVE;

  return (
    <div style={{ marginBottom: "8px" }}>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "12px", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ flex: "1 1 220px" }}>
          <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: G500, display: "block", marginBottom: "6px" }}>
            Concurrent connections: <strong style={{ color: SLATE }}>{concurrent.toLocaleString()}</strong>
          </label>
          <input type="range" min={0} max={100} value={sliderVal}
            onChange={e => setSliderVal(Number(e.target.value))}
            style={{ width: "100%", accentColor: CLAY }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono, monospace)", fontSize: "9px", color: G500 }}>
            <span>10</span><span>700</span><span>50,000</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
          {(["blocking", "epoll"] as const).map(m => (
            <button key={m} onClick={() => setIoModel(m)} style={{
              padding: "6px 14px", border: `1.5px solid ${ioModel === m ? (m === "blocking" ? CLAY : OLIVE) : G300}`,
              borderRadius: "4px", background: ioModel === m ? (m === "blocking" ? "#fceee8" : "#eef3eb") : "white",
              color: ioModel === m ? (m === "blocking" ? CLAY : OLIVE) : G500,
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}>{m === "blocking" ? "Blocking I/O" : "epoll"}</button>
          ))}
          <button onClick={() => setFdRaised(v => !v)} style={{
            padding: "6px 14px", border: `1.5px solid ${fdRaised ? SKY : G300}`,
            borderRadius: "4px", background: fdRaised ? "#e8f0f7" : "white",
            color: fdRaised ? SKY : G500,
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>
            fd limit: {fdRaised ? "65,535 (raised)" : "1,024 (default)"}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        <MetricBox label="Open Sockets / FDs" value={concurrent.toLocaleString()} sub={`limit: ${fdLimit.toLocaleString()}`} status={fdStatus} />
        <MetricBox label="Memory" value={memMB >= 1000 ? (memMB / 1024).toFixed(1) : memMB} unit={memMB >= 1000 ? "GB" : "MB"} sub={ioModel === "blocking" ? "thread stacks" : "tcp_sock structs"} status={memStatus} />
        <MetricBox label="CPU" value={cpuPct} unit="%" sub={ioModel === "blocking" ? "context switches" : "event callbacks"} status={cpuStatus} />
        <MetricBox label="Threads" value={threads.toLocaleString()} sub={ioModel === "epoll" ? "fixed (cores)" : "one per conn"} status={threads > 1000 ? "warn" : threads > 5000 ? "error" : "ok"} />
      </div>

      {/* Alert area — fixed height so socket grid below never jumps */}
      <div style={{ minHeight: "44px", marginBottom: "2px" }}>
        {fdStatus === "error" && (
          <div style={{ background: "#fceee8", border: `1.5px solid ${CLAY}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "6px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: CLAY, fontWeight: 600 }}>
            ✕ EMFILE — accept() returns &quot;Too many open files&quot;. New connections are rejected.
            {!fdRaised && " → Click 'fd limit' above to raise it."}
          </div>
        )}
        {memStatus === "error" && (
          <div style={{ background: "#fceee8", border: `1.5px solid ${CLAY}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "6px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: CLAY, fontWeight: 600 }}>
            ✕ OOM — kernel out-of-memory killer will terminate this process. Thread stacks alone consume {memMB.toLocaleString()} MB.
            {ioModel === "blocking" && " → Switch to epoll: same connections, fraction of memory."}
          </div>
        )}
        {cpuStatus === "error" && (
          <div style={{ background: "#fdf4e7", border: `1.5px solid ${AMBER}`, borderRadius: "6px", padding: "10px 14px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#8a6200", fontWeight: 600 }}>
            ⚠ CPU SATURATED — {ioModel === "blocking" ? "context switching between threads consuming all CPU cycles." : "epoll callbacks saturated; scale horizontally or reduce work per callback."}
          </div>
        )}
      </div>

      {/* Socket grid */}
      <div style={{ background: OAT, border: `1px solid ${G300}`, borderRadius: "8px", padding: "14px" }}>
        <p style={{ margin: "0 0 8px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: G500 }}>
          Socket grid — {concurrent > 200 ? `showing 200 of ${concurrent.toLocaleString()}` : `${concurrent} connections`}
        </p>
        <div style={{ lineHeight: 0 }}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <SocketDot key={i} color={dotColor} />
          ))}
          {concurrent > 200 && (
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: G500, marginLeft: "6px", lineHeight: "12px", verticalAlign: "top" }}>
              +{(concurrent - 200).toLocaleString()} more
            </span>
          )}
        </div>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: fdStatus === "error" ? CLAY : G500 }}>
          {fdStatus === "error" ? `⬛ ${dotCount} shown — all above fd ${fdLimit.toLocaleString()} are EMFILE` : "● = ESTABLISHED socket"}
        </p>
      </div>

      {/* Comparison note */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
        {[
          { title: "Blocking I/O", col: CLAY, items: ["1 thread per connection", `${Math.round(concurrent * 8).toLocaleString()} MB at ${concurrent.toLocaleString()} conn`, "Saturates ~5k connections", "Simple to code, deadly at scale"] },
          { title: "epoll", col: OLIVE, items: ["4 threads (fixed, per core)", `${Math.max(1, Math.round(concurrent * 4 / 1000)).toLocaleString()} MB at ${concurrent.toLocaleString()} conn`, "Handles 100k+ connections", "Requires async discipline"] },
        ].map(({ title, col, items }) => (
          <div key={title} style={{ background: "white", border: `1.5px solid ${col}`, borderRadius: "6px", padding: "12px" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 700, color: col }}>{title}</p>
            {items.map(it => (
              <p key={it} style={{ margin: "0 0 4px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: G500, lineHeight: 1.5 }}>· {it}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 3: Forget close() — Leak Simulator ───────────────────────────────

function LeakSimulator() {
  const [rps, setRps] = useState(100);
  const [forgetClose, setForgetClose] = useState(true);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function reset() { setRunning(false); setElapsed(0); }

  // With close(): process fds stay small; TIME_WAIT accumulates in kernel
  // Without close(): process fds grow linearly → EMFILE; recv buffers fill → OOM
  const fdLimit = 1024;
  const openFds = forgetClose
    ? elapsed * rps          // accumulate forever
    : Math.min(rps, 50);     // just in-flight, steady state

  const timeWaitSockets = forgetClose ? 0 : Math.min(rps * 60, 60000);
  const memMB = forgetClose
    ? Math.round(elapsed * rps * 0.087)   // recv buffers fill: 87 KB each
    : Math.round(timeWaitSockets * 0.000168); // TIME_WAIT: 168 bytes each (tiny)

  const emfile = openFds > fdLimit;
  const oom = memMB > 8000;

  const elapsed_to_emfile = forgetClose ? Math.ceil(fdLimit / rps) : null;

  const fdStatus: "ok" | "warn" | "error" = emfile ? "error" : openFds > fdLimit * 0.8 ? "warn" : "ok";
  const memStatus: "ok" | "warn" | "error" = oom ? "error" : memMB > 4000 ? "warn" : "ok";
  const twStatus: "ok" | "warn" | "error" = timeWaitSockets > 28000 ? "error" : timeWaitSockets > 20000 ? "warn" : "ok";

  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{ margin: "0 0 16px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", color: G500, lineHeight: 1.65 }}>
        Toggle <strong style={{ color: SLATE }}>forget close()</strong> to see how a missing <code style={{ fontFamily: "var(--font-mono, monospace)", background: OAT, padding: "1px 4px", borderRadius: "3px" }}>conn.close()</code> accumulates file descriptors and memory over time. Watch what happens when the fd limit is reached.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const, marginBottom: "16px", alignItems: "center" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: G500 }}>Requests / sec:</p>
          <div style={{ display: "flex", gap: "4px" }}>
            {[10, 100, 500, 1000].map(r => (
              <button key={r} onClick={() => { setRps(r); reset(); }} style={{
                padding: "5px 10px", border: `1.5px solid ${rps === r ? CLAY : G300}`,
                borderRadius: "3px", background: rps === r ? "#fceee8" : "white",
                color: rps === r ? CLAY : G500,
                fontFamily: "var(--font-mono, monospace)", fontSize: "12px", cursor: "pointer",
              }}>{r}</button>
            ))}
          </div>
        </div>

        <Toggle label="Forget close()" value={forgetClose} onChange={v => { setForgetClose(v); reset(); }} />

        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
          <button onClick={() => setRunning(v => !v)} style={{
            padding: "8px 16px", background: running ? SLATE : CLAY,
            color: "white", border: "none", borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>{running ? "⏹ Stop" : "▶ Simulate"}</button>
          <button onClick={reset} style={{
            padding: "8px 12px", background: OAT, color: G500,
            border: `1.5px solid ${G300}`, borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", cursor: "pointer",
          }}>Reset</button>
        </div>
      </div>

      {/* Timer — fixed height so metrics grid never shifts */}
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "13px", color: G500, marginBottom: "14px", height: "20px", overflow: "hidden" }}>
        Elapsed: <strong style={{ color: SLATE }}>{elapsed}s</strong>
        {elapsed_to_emfile && elapsed < elapsed_to_emfile && (
          <span style={{ marginLeft: "12px", color: AMBER }}>⚠ EMFILE in ~{elapsed_to_emfile - elapsed}s at this RPS</span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
        <MetricBox
          label={forgetClose ? "Open FDs (leaked)" : "Open FDs (in-flight)"}
          value={openFds.toLocaleString()}
          sub={`limit: ${fdLimit.toLocaleString()}`}
          status={fdStatus}
        />
        <MetricBox
          label={forgetClose ? "Memory (recv buffers)" : "TIME_WAIT sockets"}
          value={forgetClose ? (memMB >= 1000 ? (memMB / 1024).toFixed(1) : memMB) : timeWaitSockets.toLocaleString()}
          unit={forgetClose ? (memMB >= 1000 ? "GB" : "MB") : ""}
          sub={forgetClose ? "filling in kernel" : "kernel, not fds"}
          status={forgetClose ? memStatus : twStatus}
        />
        <MetricBox
          label="Status"
          value={emfile ? "EMFILE" : oom ? "OOM" : timeWaitSockets > 28231 ? "PORT EXHAUSTED" : "OK"}
          sub={emfile ? "accept() fails" : oom ? "OOM killer fires" : timeWaitSockets > 28231 ? "EADDRNOTAVAIL" : running ? "running" : "idle"}
          status={emfile || oom || timeWaitSockets > 28231 ? "error" : "ok"}
        />
      </div>

      {/* Code comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: RED }}>
            ✕ Leaked (forget close)
          </p>
          <pre style={{ background: SLATE, color: "#f8a0a0", borderRadius: "6px", padding: "12px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", lineHeight: 1.7, margin: 0 }}>{`while True:
    conn = server.accept()
    data = conn.recv(4096)
    conn.sendall(process(data))
    # ← conn.close() MISSING
    # conn goes out of scope but
    # GC decides when (if ever) to close
    # Under load: never fast enough`}</pre>
        </div>
        <div>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: OLIVE }}>
            ✓ Correct (with clause)
          </p>
          <pre style={{ background: SLATE, color: "#a0f0b0", borderRadius: "6px", padding: "12px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", lineHeight: 1.7, margin: 0 }}>{`while True:
    conn, addr = server.accept()
    with conn:            # ← guarantees
        data = conn.recv(4096)
        conn.sendall(process(data))
    # close() called even if
    # process() raises an exception`}</pre>
        </div>
      </div>
    </div>
  );
}

function SharedClientFix() {
  const [lang, setLang] = useState<"zig" | "python" | "go" | "java">("zig");

  const snippets = {
    zig: `// Zig 0.16.0 — shared TCP connection pool
// std.http.Client manages keep-alive connections internally.
// Create ONE instance at program startup and pass it by pointer.

const std = @import("std");

pub const AppState = struct {
    client: std.http.Client,
    // idle_timeout matches DNS TTL — recycled conn triggers re-dial + fresh DNS
    pub fn init(allocator: std.mem.Allocator) AppState {
        return .{
            .client = std.http.Client{
                .allocator = allocator,
                // Zig 0.16: connection pool is managed per-Client instance
            },
        };
    }
    pub fn deinit(self: *AppState) void {
        self.client.deinit(); // closes all pooled sockets
    }
};

// In your request handler — reuses existing TCP+TLS connection:
pub fn handleRequest(state: *AppState, arena: std.mem.Allocator) !void {
    var buf: [4096]u8 = undefined;
    const result = try state.client.fetch(.{
        .location = .{ .url = "https://api.internal/data" },
        .response_storage = .{ .static = &buf },
    });
    _ = result;
}`,
    python: `import httpx

# ONE client for the lifetime of the process
_client = httpx.Client(
    limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20,
        keepalive_expiry=30,  # recycle idle conn → fresh DNS lookup
    ),
    timeout=10.0,
)

def handle_request(req):
    # Reuses existing TCP+TLS connection — no handshake cost
    return _client.get("https://api.internal/data")`,
    go: `var httpClient = &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     30 * time.Second, // recycle → fresh DNS
        TLSHandshakeTimeout: 5 * time.Second,
    },
    Timeout: 10 * time.Second,
}

// Package-level — shared across all goroutines
func handleRequest(w http.ResponseWriter, r *http.Request) {
    resp, err := httpClient.Get("https://api.internal/data")
    // ...
}`,
    java: `// Set BEFORE any DNS lookup happens
Security.setProperty("networkaddress.cache.ttl", "30");
Security.setProperty("networkaddress.cache.negative.ttl", "5");

// One client, shared across threads (thread-safe)
private static final OkHttpClient CLIENT = new OkHttpClient.Builder()
    .connectionPool(new ConnectionPool(20, 30, TimeUnit.SECONDS))
    .connectTimeout(5, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .build();`,
  };

  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{ margin: "0 0 12px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", color: G500, lineHeight: 1.65 }}>
        One shared client eliminates per-request DNS lookup, TCP connect, and TLS handshake costs. Set <code style={{ fontFamily: "var(--font-mono, monospace)", background: OAT, padding: "1px 4px", borderRadius: "3px" }}>keepalive_expiry</code> / <code style={{ fontFamily: "var(--font-mono, monospace)", background: OAT, padding: "1px 4px", borderRadius: "3px" }}>IdleConnTimeout</code> to roughly match DNS TTL — idle connections are recycled, triggering a fresh DNS lookup on the next dial.
      </p>

      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {(["zig", "python", "go", "java"] as const).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: "5px 12px", border: `1.5px solid ${lang === l ? CLAY : G300}`,
            borderRadius: "3px", background: lang === l ? "#fceee8" : "white",
            color: lang === l ? CLAY : G500,
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      <pre style={{
        background: SLATE, color: "#e2e0da", borderRadius: "6px",
        padding: "16px", fontFamily: "var(--font-mono, monospace)",
        fontSize: "12px", lineHeight: 1.7, margin: "0 0 16px",
        overflowX: "auto" as const,
      }}>{snippets[lang]}</pre>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        {[
          { label: "DNS lookup", before: "every request", after: "once (then idle-timeout cycles)", col: OLIVE },
          { label: "TCP connect", before: "every request (~30ms)", after: "reused from pool", col: OLIVE },
          { label: "TLS handshake", before: "every request (~100ms)", after: "reused from pool", col: OLIVE },
        ].map(({ label, before, after, col }) => (
          <div key={label} style={{ border: `1px solid ${G300}`, borderRadius: "6px", overflow: "hidden" }}>
            <p style={{ margin: 0, padding: "8px 10px", background: G300, fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700, color: SLATE, textTransform: "uppercase" as const }}>{label}</p>
            <div style={{ padding: "8px 10px", background: "#fceee8" }}>
              <p style={{ margin: "0 0 2px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: G500 }}>Before</p>
              <p style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: CLAY, fontWeight: 600 }}>{before}</p>
            </div>
            <div style={{ padding: "8px 10px", background: "#eef3eb" }}>
              <p style={{ margin: "0 0 2px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: G500 }}>After</p>
              <p style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: col, fontWeight: 600 }}>{after}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 6: Server Capacity Calculator ────────────────────────────────────
//
// Formulas (conservative, real-world tuned):
//
//   blocking I/O:
//     max_conn_cpu  = (cpu_cores × 1000) / 2          — context-switch budget
//     max_conn_mem  = (ram_mb - os_reserve_mb) / 8    — 8 MB thread stack
//
//   epoll:
//     max_conn_cpu  = cpu_cores × 25000               — event callbacks
//     max_conn_mem  = (ram_mb - os_reserve_mb) × 200  — ~4 KB per socket → ×200 per MB
//
//   recommended pool size (shared HTTP client):
//     pool_size = cpu_cores × 4   (rule of thumb: 4× cores for I/O-bound)
//     dns_idle_timeout = dns_ttl  (recycle conn on TTL boundary)
//
//   TIME_WAIT budget (ephemeral port range ~28k):
//     safe_rps_without_pooling = 28231 / 60 ≈ 470 req/s

function CapacityCalculator() {
  const [cpuCores, setCpuCores] = useState(4);
  const [ramGB, setRamGB] = useState(8);
  const [ioModel, setIoModel] = useState<"blocking" | "epoll">("epoll");
  const [dnsTtl, setDnsTtl] = useState(300);

  const ramMB = ramGB * 1024;
  const osReserveMB = 512;
  const usableMB = ramMB - osReserveMB;

  const maxConnCpu = ioModel === "blocking"
    ? Math.floor((cpuCores * 1000) / 2)
    : cpuCores * 25000;

  const maxConnMem = ioModel === "blocking"
    ? Math.floor(usableMB / 8)
    : Math.floor(usableMB * 200);  // 4 KB per socket

  const maxConn = Math.min(maxConnCpu, maxConnMem);
  const bottleneck = maxConnCpu < maxConnMem ? "CPU (context switching)" : "RAM (thread stacks)";

  const poolSize = cpuCores * 4;
  const idleTimeout = dnsTtl;
  const safeRpsNoPool = 470;  // 28231 / 60
  const safeRpsWithPool = Math.floor(maxConn / 0.1);  // avg 100ms per req

  const fdLimitNeeded = Math.min(maxConn + 100, 65535);

  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{ margin: "0 0 16px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", color: G500, lineHeight: 1.65 }}>
        Given CPU cores and RAM, these formulas derive the maximum safe concurrent connections for each I/O model, recommended connection pool size, and the RPS ceiling before TIME_WAIT exhausts the ephemeral port range.
      </p>

      {/* Hardware sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: G500, display: "block", marginBottom: "6px" }}>
            CPU cores: <strong style={{ color: SLATE }}>{cpuCores}</strong>
          </label>
          <input type="range" min={1} max={64} value={cpuCores}
            onChange={e => setCpuCores(Number(e.target.value))}
            style={{ width: "100%", accentColor: CLAY }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono, monospace)", fontSize: "9px", color: G500 }}>
            <span>1</span><span>16</span><span>32</span><span>64</span>
          </div>
        </div>
        <div>
          <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: G500, display: "block", marginBottom: "6px" }}>
            RAM: <strong style={{ color: SLATE }}>{ramGB} GB</strong>
          </label>
          <input type="range" min={1} max={128} value={ramGB}
            onChange={e => setRamGB(Number(e.target.value))}
            style={{ width: "100%", accentColor: SKY }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono, monospace)", fontSize: "9px", color: G500 }}>
            <span>1 GB</span><span>32</span><span>64</span><span>128 GB</span>
          </div>
        </div>
      </div>

      {/* I/O model + DNS TTL */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const, marginBottom: "20px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["blocking", "epoll"] as const).map(m => (
            <button key={m} onClick={() => setIoModel(m)} style={{
              padding: "6px 14px", border: `1.5px solid ${ioModel === m ? (m === "blocking" ? CLAY : OLIVE) : G300}`,
              borderRadius: "4px", background: ioModel === m ? (m === "blocking" ? "#fceee8" : "#eef3eb") : "white",
              color: ioModel === m ? (m === "blocking" ? CLAY : OLIVE) : G500,
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}>{m === "blocking" ? "Blocking I/O" : "epoll"}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: G500 }}>DNS TTL:</span>
          {[30, 60, 300, 3600].map(t => (
            <button key={t} onClick={() => setDnsTtl(t)} style={{
              padding: "5px 10px", border: `1.5px solid ${dnsTtl === t ? SKY : G300}`,
              borderRadius: "3px", background: dnsTtl === t ? "#e8f0f7" : "white",
              color: dnsTtl === t ? SKY : G500,
              fontFamily: "var(--font-mono, monospace)", fontSize: "11px", cursor: "pointer",
            }}>{t}s</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
        <MetricBox
          label="Max concurrent connections (CPU)"
          value={maxConnCpu.toLocaleString()}
          sub={ioModel === "blocking" ? `(${cpuCores} cores × 1000) ÷ 2` : `${cpuCores} cores × 25,000`}
          status={maxConnCpu < 1000 ? "warn" : "ok"}
        />
        <MetricBox
          label="Max concurrent connections (RAM)"
          value={maxConnMem.toLocaleString()}
          sub={ioModel === "blocking" ? `${usableMB.toLocaleString()} MB ÷ 8 MB/thread` : `${usableMB.toLocaleString()} MB ÷ 4 KB/socket`}
          status={maxConnMem < 1000 ? "warn" : "ok"}
        />
        <MetricBox
          label="Effective max connections"
          value={maxConn.toLocaleString()}
          sub={`bottleneck: ${bottleneck}`}
          status={maxConn < 500 ? "warn" : "ok"}
        />
        <MetricBox
          label="Recommended pool size"
          value={poolSize}
          sub={`${cpuCores} cores × 4  (I/O-bound)`}
          status="neutral"
        />
      </div>

      {/* Config block */}
      <div style={{ background: OAT, border: `1px solid ${G300}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ margin: "0 0 10px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: G500 }}>
          Derived Configuration
        </p>
        <pre style={{
          background: SLATE, color: "#e2e0da", borderRadius: "6px",
          padding: "14px 16px", fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px", lineHeight: 1.8, margin: 0,
          overflowX: "auto" as const,
        }}>{`# OS tuning (apply before starting server)
ulimit -n ${fdLimitNeeded}                    # fd limit

# Kernel (sysctl)
net.core.somaxconn = ${Math.min(maxConn, 65535)}
net.ipv4.tcp_tw_reuse = 1             # reuse TIME_WAIT sockets
net.ipv4.ip_local_port_range = 1024 65535   # widen ephemeral range

# Application — shared HTTP client
pool_size         = ${poolSize}   # ${cpuCores} cores × 4
idle_timeout      = ${idleTimeout}s  # match DNS TTL → fresh DNS on recycle
max_connections   = ${Math.min(maxConn, 10000)}

# TIME_WAIT budget
# Ephemeral ports: ~64511 (1024–65535)
# Safe RPS without pooling: ~${safeRpsNoPool} req/s (64511 ÷ 60s TIME_WAIT)
# Safe RPS with pooling:    ~${safeRpsWithPool.toLocaleString()} req/s`}</pre>
      </div>

      {/* Formula breakdown */}
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: G300 }}>
            <th style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: "11px" }}>Constraint</th>
            <th style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: "11px" }}>Formula</th>
            <th style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: "11px" }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["CPU (blocking)", `(${cpuCores} cores × 1,000) ÷ 2`, maxConnCpu.toLocaleString()],
            ["CPU (epoll)", `${cpuCores} cores × 25,000`, `${(cpuCores * 25000).toLocaleString()}`],
            ["RAM (blocking)", `(${ramGB * 1024} MB − 512 OS) ÷ 8 MB/stack`, maxConnMem.toLocaleString() + " (this model)"],
            ["RAM (epoll)", `(${ramGB * 1024} MB − 512 OS) ÷ 0.004 MB/sock`, `${Math.floor(usableMB * 200).toLocaleString()} (this model)`],
            ["Pool size", "cores × 4  (I/O-bound rule of thumb)", poolSize.toLocaleString()],
            ["TIME_WAIT safe RPS", "64,511 ports ÷ 60s", `≈ ${safeRpsNoPool} req/s without pool`],
          ].map(([c, f, r], i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${G300}`, background: i % 2 === 0 ? "white" : OAT }}>
              <td style={{ padding: "8px 12px", color: SLATE, fontWeight: 600 }}>{c}</td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: G500 }}>{f}</td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: SKY, fontWeight: 700 }}>{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SocketsContent() {
  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      <p style={{ fontSize: "16px", lineHeight: 1.75, color: SLATE, marginBottom: "6px" }}>
        Every HTTP request, database query, and gRPC call is a sequence of socket syscalls. The socket is the OS abstraction that lets two processes exchange a byte stream as if they were reading a local file — and the kernel manages the actual packets, retransmission, and buffering underneath.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: G500, marginBottom: "0" }}>
        This article walks through the socket lifecycle step by step, then shows the real costs that appear at scale: CPU exhaustion from blocking I/O, fd leaks from missing close(), TIME_WAIT port exhaustion, and DNS staleness in long-lived connection pools.
      </p>

      <SH label="The Socket Lifecycle — Step by Step" />
      <LifecycleStepper />

      <SH label="Concurrent Connections — Blocking I/O vs epoll" />
      <IOModelLab />

      <SH label="Forget close() — Leak Simulator" />
      <LeakSimulator />

      <SH label="The Fix — Shared HTTP Client" />
      <SharedClientFix />

      <SH label="Server Capacity Calculator" />
      <CapacityCalculator />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
