"use client";

import { useState } from "react";

type NodeState = "follower" | "candidate" | "leader";

const nodeConfig = {
  follower: {
    label: "Follower",
    color: "#6A8CAF",
    bg: "#e8f0f7",
    desc: "The default state. A follower receives log entries from the leader and applies them to its state machine. If it hears nothing from a leader within a random timeout (150–300ms), it becomes a candidate.",
    icon: "○",
  },
  candidate: {
    label: "Candidate",
    color: "#D97757",
    bg: "#fceee8",
    desc: "A follower that timed out. It increments its term, votes for itself, and sends RequestVote RPCs to all peers. If it collects a majority, it wins the election and becomes leader.",
    icon: "◎",
  },
  leader: {
    label: "Leader",
    color: "#788C5D",
    bg: "#eef1eb",
    desc: "The single authoritative node for the current term. It accepts all client writes, replicates entries via AppendEntries RPCs, and marks entries committed once a majority acknowledge them.",
    icon: "◈",
  },
};

const transitions: { from: NodeState; to: NodeState; label: string }[] = [
  { from: "follower", to: "candidate", label: "timeout" },
  { from: "candidate", to: "leader", label: "majority votes" },
  { from: "candidate", to: "follower", label: "sees higher term" },
  { from: "leader", to: "follower", label: "higher term seen" },
];

const logEntries = [
  { term: 1, index: 1, cmd: "x = 3", committed: true, nodes: [true, true, true] },
  { term: 1, index: 2, cmd: "y = 7", committed: true, nodes: [true, true, true] },
  { term: 2, index: 3, cmd: "x = 12", committed: true, nodes: [true, true, true] },
  { term: 3, index: 4, cmd: "z = 1", committed: false, nodes: [true, true, false] },
];

const comparisonRows = [
  { dim: "Leader model", raft: "Strong single leader", paxos: "Multi-Paxos uses a leader too" },
  { dim: "Understandability", raft: "Explicit design goal", paxos: "Notoriously hard" },
  { dim: "Log gaps", raft: "Not allowed", paxos: "Allowed" },
  { dim: "Membership change", raft: "Joint consensus", paxos: "Varies by implementation" },
  { dim: "Adoption", raft: "etcd, CockroachDB, TiKV", paxos: "Chubby (Google)" },
];

function NodeCircle({ state, active, onClick }: { state: NodeState; active: boolean; onClick: () => void }) {
  const cfg = nodeConfig[state];
  return (
    <button
      onClick={onClick}
      style={{
        width: "96px",
        height: "96px",
        borderRadius: "50%",
        border: `3px solid ${cfg.color}`,
        background: active ? cfg.color : cfg.bg,
        color: active ? "#fff" : cfg.color,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: active ? `0 0 0 4px ${cfg.color}30, 0 4px 16px ${cfg.color}40` : "none",
        fontFamily: "var(--font-sans, sans-serif)",
        gap: "2px",
      }}
    >
      <span style={{ fontSize: "22px", lineHeight: 1 }}>{cfg.icon}</span>
      <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {cfg.label}
      </span>
      {state === "leader" && active && (
        <span style={{
          fontSize: "8px",
          background: "#fff",
          color: cfg.color,
          padding: "1px 4px",
          borderRadius: "2px",
          fontWeight: 700,
          marginTop: "2px",
        }}>TERM N</span>
      )}
    </button>
  );
}

export default function RaftProtocolContent() {
  const [activeNode, setActiveNode] = useState<NodeState | null>(null);
  const [showElection, setShowElection] = useState(false);

  const toggle = (n: NodeState) => setActiveNode((prev) => (prev === n ? null : n));

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* Intro */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        Raft is a consensus algorithm designed to be understandable. It achieves the same guarantees as Paxos — agreeing on a log of values across a cluster even when nodes fail — but decomposes the problem into three named sub-problems that can each be reasoned about independently.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "32px" }}>
        The design goal wasn&apos;t performance. It was comprehensibility. Every decision in Raft — randomised timeouts, strong leader, restricted voting — serves the goal of making the algorithm understandable enough to implement correctly.
      </p>

      {/* Node state machine */}
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
          marginBottom: "20px",
        }}>
          Node State Machine — click a state to learn more
        </p>

        <div style={{
          background: "var(--oat)",
          border: "1px solid var(--g300)",
          borderRadius: "8px",
          padding: "32px 24px 24px",
          position: "relative",
        }}>
          {/* Nodes row */}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginBottom: "24px" }}>
            {(["follower", "candidate", "leader"] as NodeState[]).map((state) => (
              <NodeCircle
                key={state}
                state={state}
                active={activeNode === state}
                onClick={() => toggle(state)}
              />
            ))}
          </div>

          {/* Transition arrows */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "0 8px",
          }}>
            {transitions.map(({ from, to, label }) => (
              <div key={`${from}-${to}`} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "11px",
                color: "var(--g500)",
              }}>
                <span style={{ color: nodeConfig[from].color, fontWeight: 700 }}>{nodeConfig[from].label}</span>
                <span style={{ flex: 1, borderBottom: "1px dashed var(--g300)", position: "relative" }}>
                  <span style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--oat)",
                    padding: "0 6px",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                  }}>
                    {label} →
                  </span>
                </span>
                <span style={{ color: nodeConfig[to].color, fontWeight: 700 }}>{nodeConfig[to].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* State detail panel */}
        {activeNode && (
          <div style={{
            marginTop: "12px",
            padding: "16px",
            background: nodeConfig[activeNode].bg,
            border: `1.5px solid ${nodeConfig[activeNode].color}`,
            borderRadius: "6px",
            animation: "fadeIn 0.15s ease",
          }}>
            <p style={{
              margin: "0 0 6px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              fontWeight: 700,
              color: nodeConfig[activeNode].color,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              {nodeConfig[activeNode].icon} {nodeConfig[activeNode].label}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
              {nodeConfig[activeNode].desc}
            </p>
          </div>
        )}
      </div>

      {/* Leader Election */}
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
          Leader Election
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {[
            { step: "1", title: "Timeout fires", body: "A follower hears nothing from a leader within 150–300ms (random). It becomes a candidate." },
            { step: "2", title: "RequestVote RPC", body: "Candidate increments its term, votes for itself, and sends RequestVote to all peers." },
            { step: "3", title: "Vote granted if…", body: "Peer hasn't voted this term AND candidate's log is at least as up-to-date as the peer's." },
            { step: "4", title: "Majority wins", body: "Collecting votes from ⌊n/2⌋+1 nodes makes the candidate the new leader for this term." },
          ].map(({ step, title, body }) => (
            <div key={step} style={{
              padding: "14px",
              border: "1.5px solid var(--g300)",
              borderRadius: "6px",
              background: "var(--white)",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                top: "-1px",
                left: "14px",
                background: "var(--clay)",
                color: "#fff",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "var(--font-mono, monospace)",
                transform: "translateY(-50%)",
              }}>
                {step}
              </div>
              <p style={{ margin: "8px 0 4px", fontSize: "12px", fontWeight: 700, color: "var(--slate)" }}>{title}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--g500)", lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowElection((v) => !v)}
          style={{
            background: showElection ? "var(--slate)" : "var(--oat)",
            color: showElection ? "var(--oat)" : "var(--slate)",
            border: "1.5px solid var(--g300)",
            borderRadius: "4px",
            padding: "8px 16px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {showElection ? "▼ Hide" : "▶ Show"} Why Randomised Timeouts?
        </button>

        {showElection && (
          <div style={{
            marginTop: "12px",
            padding: "16px",
            background: "var(--oat)",
            borderRadius: "6px",
            border: "1px solid var(--g300)",
            animation: "fadeIn 0.15s ease",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
              If all nodes had the same timeout, they&apos;d all call elections simultaneously and constantly produce split votes — no majority ever forms.
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
              Random timeouts in the range <code style={{ fontFamily: "var(--font-mono, monospace)", background: "var(--g300)", padding: "1px 5px", borderRadius: "3px", fontSize: "12px" }}>[150ms, 300ms]</code> make it very likely that one node fires first, collects votes, and becomes leader before others even start. A candidate that loses simply waits another random timeout and retries with term+1.
            </p>
          </div>
        )}
      </div>

      {/* Log replication */}
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
          Log Replication
        </p>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          Once elected, the leader accepts client requests, appends them to its log, and sends <code style={{ fontFamily: "var(--font-mono, monospace)", background: "var(--g300)", padding: "1px 5px", borderRadius: "3px", fontSize: "13px" }}>AppendEntries</code> RPCs to all followers in parallel. An entry is <strong>committed</strong> once a majority of nodes have written it.
        </p>

        <div style={{ overflowX: "auto", marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono, monospace)", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--slate)", color: "var(--oat)" }}>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Term</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Idx</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Command</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Leader</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>N1</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>N2</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>N3</th>
                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((entry, i) => (
                <tr key={i} style={{
                  borderBottom: "1px solid var(--g300)",
                  background: entry.committed ? "var(--white)" : "#fff8f5",
                }}>
                  <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--sky-text)" }}>{entry.term}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--g500)" }}>{entry.index}</td>
                  <td style={{ padding: "8px 12px", color: "var(--slate)", fontWeight: 500 }}>{entry.cmd}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", color: "#788C5D", fontWeight: 700 }}>✓</td>
                  {entry.nodes.map((has, j) => (
                    <td key={j} style={{
                      padding: "8px 12px",
                      textAlign: "center",
                      color: has ? "#788C5D" : "var(--g300)",
                      fontWeight: has ? 700 : 400,
                    }}>
                      {has ? "✓" : "○"}
                    </td>
                  ))}
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: entry.committed ? "#eef1eb" : "#fceee8",
                      color: entry.committed ? "#5c6d46" : "#B85C38",
                    }}>
                      {entry.committed ? "COMMITTED" : "PENDING"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: "12px 16px",
          background: "var(--oat)",
          borderLeft: "3px solid var(--clay)",
          borderRadius: "0 4px 4px 0",
        }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
            <strong>Key invariant:</strong> If an entry is committed, it will appear in the log of any future leader. This is guaranteed by the voting rule — a candidate can only win if its log is at least as up-to-date as a majority of nodes.
          </p>
        </div>
      </div>

      {/* Raft vs Paxos */}
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
          Raft vs Paxos
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--g300)" }}>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "var(--slate)" }}>Dimension</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#788C5D" }}>Raft</th>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#6A8CAF" }}>Paxos</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--g300)", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                <td style={{ padding: "9px 12px", color: "var(--g500)", fontSize: "12px", fontWeight: 600 }}>{row.dim}</td>
                <td style={{ padding: "9px 12px", color: "var(--slate)", fontSize: "12px" }}>{row.raft}</td>
                <td style={{ padding: "9px 12px", color: "var(--slate)", fontSize: "12px" }}>{row.paxos}</td>
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
