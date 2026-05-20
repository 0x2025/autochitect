"use client";

import { useState, useEffect, useCallback } from "react";

const GRID = 5;
const NODE_COUNT = GRID * GRID;

function makeInitialNodes() {
  return Array.from({ length: NODE_COUNT }, (_, i) => ({
    id: i,
    infected: false,
    round: -1,
  }));
}

const phaseDetails = [
  { title: "SI Model — Simple Spread", body: "Each infected node gossips to k random peers per round. Information spreads exponentially fast: if fan-out k=3, after r rounds ~(3/N)^r of the network knows. Practically all nodes converge within O(log N) rounds." },
  { title: "Convergence is Probabilistic", body: "Gossip doesn't guarantee delivery in a fixed time. It converges with high probability. This is the tradeoff: you get resilience and no central coordinator, but you give up exact timing guarantees." },
  { title: "Why Not Broadcast?", body: "A single broadcast requires a coordinator and fails if that node is down. Gossip has no single point of failure — every node is equally capable of spreading information. It degrades gracefully under node failures." },
];

const useCases = [
  { system: "Cassandra", use: "Cluster membership, node health, schema changes", layer: "Anti-entropy" },
  { system: "DynamoDB", use: "Ring membership, failure detection", layer: "Membership" },
  { system: "Consul", use: "Service discovery, health checking across datacenters", layer: "SWIM" },
  { system: "Redis Cluster", use: "Node state propagation (PFAIL/FAIL flags)", layer: "Gossip" },
  { system: "etcd", use: "NOT gossip — uses Raft consensus instead", layer: "Raft" },
];

export default function GossipProtocolContent() {
  const [nodes, setNodes] = useState(makeInitialNodes);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [fanout, setFanout] = useState(2);
  const [speed, setSpeed] = useState(600);

  const reset = useCallback(() => {
    setNodes(makeInitialNodes());
    setRunning(false);
    setRound(0);
  }, []);

  const start = useCallback(() => {
    setNodes((prev) => {
      const next = [...prev];
      const seed = Math.floor(Math.random() * NODE_COUNT);
      next[seed] = { ...next[seed], infected: true, round: 0 };
      return next;
    });
    setRound(1);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setNodes((prev) => {
        const infected = prev.filter((n) => n.infected).map((n) => n.id);
        if (infected.length === NODE_COUNT) { setRunning(false); return prev; }

        const next = [...prev];
        infected.forEach((id) => {
          const candidates = prev.filter((n) => !n.infected).map((n) => n.id);
          const targets = candidates.sort(() => Math.random() - 0.5).slice(0, fanout);
          targets.forEach((t) => {
            next[t] = { ...next[t], infected: true, round };
          });
        });
        return next;
      });
      setRound((r) => r + 1);
    }, speed);
    return () => clearInterval(timer);
  }, [running, fanout, round, speed]);

  const infectedCount = nodes.filter((n) => n.infected).length;
  const pct = Math.round((infectedCount / NODE_COUNT) * 100);

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* Intro */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        Gossip protocol (also called epidemic protocol) is how distributed systems spread information without a central coordinator. Each node periodically selects a few random peers and shares what it knows. Like a virus spreading through a population, information reaches every node within O(log N) rounds.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "32px" }}>
        The tradeoff is eventual (not immediate) consistency. You get resilience — no single point of failure, no coordinator to crash — but you give up exact timing guarantees. Every node failure just slows convergence slightly rather than breaking it.
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
          Epidemic Spread Simulation
        </p>

        <div style={{
          background: "var(--oat)",
          border: "1px solid var(--g300)",
          borderRadius: "8px",
          padding: "24px",
        }}>
          {/* Node grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            gap: "8px",
            maxWidth: "280px",
            margin: "0 auto 20px",
          }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                title={node.infected ? `Infected in round ${node.round}` : "Susceptible"}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: node.infected
                    ? node.round === 0 ? "var(--clay)" : `hsl(${150 - node.round * 15}, 45%, 45%)`
                    : "var(--white)",
                  border: `2px solid ${node.infected ? "transparent" : "var(--g300)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono, monospace)",
                  color: node.infected ? "#fff" : "var(--g300)",
                  transition: "all 0.3s ease",
                  fontWeight: 700,
                }}
              >
                {node.infected ? (node.round === 0 ? "★" : node.round) : "·"}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>
                Convergence: {infectedCount}/{NODE_COUNT} nodes
              </span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--clay-text)", fontWeight: 700 }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: "6px", background: "var(--g300)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: pct === 100 ? "#788C5D" : "var(--clay)",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }} />
            </div>
            {infectedCount > 0 && (
              <p style={{ margin: "4px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: "var(--g500)" }}>
                Round {round - 1} · Fan-out k={fanout}
              </p>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {!running && infectedCount === 0 && (
              <button
                onClick={start}
                style={{
                  padding: "7px 16px",
                  background: "var(--clay)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ▶ Start Gossip
              </button>
            )}
            {(running || infectedCount > 0) && (
              <button
                onClick={reset}
                style={{
                  padding: "7px 14px",
                  background: "var(--white)",
                  color: "var(--slate)",
                  border: "1.5px solid var(--g300)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ↺ Reset
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>Fan-out k=</span>
              {[1, 2, 3, 4].map((k) => (
                <button
                  key={k}
                  onClick={() => setFanout(k)}
                  disabled={running}
                  style={{
                    padding: "4px 10px",
                    background: fanout === k ? "#6A8CAF" : "var(--white)",
                    color: fanout === k ? "#fff" : "var(--g500)",
                    border: "1.5px solid var(--g300)",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11px",
                    cursor: running ? "not-allowed" : "pointer",
                    opacity: running ? 0.5 : 1,
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>Speed:</span>
              {[{ label: "Fast", val: 250 }, { label: "Normal", val: 600 }, { label: "Slow", val: 1200 }].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setSpeed(val)}
                  style={{
                    padding: "4px 8px",
                    background: speed === val ? "var(--slate)" : "var(--white)",
                    color: speed === val ? "#fff" : "var(--g500)",
                    border: "1.5px solid var(--g300)",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ margin: "12px 0 0", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "var(--g500)" }}>
            ★ = seed node. Numbers = round when infected. Higher k = faster but more bandwidth.
          </p>
        </div>
      </div>

      {/* How it works */}
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
          How It Works
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {phaseDetails.map(({ title, body }) => (
            <div key={title} style={{
              padding: "14px 16px",
              background: "var(--oat)",
              border: "1px solid var(--g300)",
              borderRadius: "6px",
            }}>
              <p style={{ margin: "0 0 5px", fontSize: "13px", fontWeight: 700, color: "var(--slate)" }}>{title}</p>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--g500)", lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-world use */}
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
          Real-World Systems
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--slate)", color: "var(--oat)" }}>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>System</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>What Gossip Does</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>Protocol</th>
            </tr>
          </thead>
          <tbody>
            {useCases.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--g300)", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                <td style={{ padding: "9px 12px", fontWeight: 700, color: "var(--slate)" }}>{row.system}</td>
                <td style={{ padding: "9px 12px", color: row.system === "etcd" ? "var(--g500)" : "var(--slate)", fontSize: "12px", fontStyle: row.system === "etcd" ? "italic" : "normal" }}>
                  {row.use}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: row.layer === "Raft" ? "#e8f0f7" : "#eef1eb",
                    color: row.layer === "Raft" ? "#4d7296" : "#5c6d46",
                    fontWeight: 600,
                  }}>
                    {row.layer}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* When to use */}
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
          Gossip vs Consensus
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ padding: "16px", border: "1.5px solid #788C5D", borderRadius: "6px", background: "#eef1eb" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "13px", color: "#5c6d46" }}>Use Gossip for</p>
            {["Cluster membership & failure detection", "State dissemination (tolerates temporary inconsistency)", "Large clusters (100s–1000s of nodes)", "High availability over strong consistency"].map((item) => (
              <p key={item} style={{ margin: "4px 0", fontSize: "12px", color: "var(--slate)", display: "flex", gap: "6px" }}>
                <span style={{ color: "#788C5D", fontWeight: 700 }}>✓</span> {item}
              </p>
            ))}
          </div>
          <div style={{ padding: "16px", border: "1.5px solid #6A8CAF", borderRadius: "6px", background: "#e8f0f7" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "13px", color: "#4d7296" }}>Use Raft / Consensus for</p>
            {["Replicated state machines (key-value stores)", "Distributed locking & leader election", "Operations requiring strong consistency", "Smaller clusters (3–7 nodes typically)"].map((item) => (
              <p key={item} style={{ margin: "4px 0", fontSize: "12px", color: "var(--slate)", display: "flex", gap: "6px" }}>
                <span style={{ color: "#6A8CAF", fontWeight: 700 }}>✓</span> {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
