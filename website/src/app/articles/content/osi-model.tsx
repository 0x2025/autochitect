"use client";

import { useState } from "react";

const layers = [
  {
    num: 7,
    name: "Application",
    protocols: ["HTTP", "SMTP", "DNS", "FTP", "SSH"],
    responsibility: "Meaning of data — the service protocol",
    detail:
      "Where business logic begins. HTTP defines verbs, status codes, and request/response semantics. DNS maps names to addresses. SMTP delivers email. Every user-facing protocol lives here.",
    realWorld: "AWS ALB routes by HTTP headers & URL path at this layer",
    color: "#4d7296",
    bg: "#e8f0f7",
  },
  {
    num: 6,
    name: "Presentation",
    protocols: ["TLS", "ASN.1", "JSON", "Protobuf"],
    responsibility: "Encoding, encryption, compression",
    detail:
      "Data representation between applications. In practice this layer is mostly dissolved — TLS sits here conceptually (encrypting the byte stream before L7), but modern protocols absorb encoding concerns into the application layer.",
    realWorld: "TLS termination at the load balancer decrypts before routing",
    color: "#6A8CAF",
    bg: "#ecf2f8",
  },
  {
    num: 5,
    name: "Session",
    protocols: ["NFS sessions", "RPC", "NetBIOS"],
    responsibility: "Dialog control, session lifecycle",
    detail:
      "Manages opening, checkpointing, and closing conversations between applications. Most of what OSI envisioned here got absorbed into L4 (TCP connections) or L7 (HTTP sessions, cookies). The 'this is fine' layer for most engineers.",
    realWorld: "TCP connection state at L4 effectively covers session management",
    color: "#5c6d46",
    bg: "#eef1eb",
  },
  {
    num: 4,
    name: "Transport",
    protocols: ["TCP", "UDP", "QUIC"],
    responsibility: "End-to-end delivery, reliability, flow control",
    detail:
      "TCP adds reliability (acks + retransmit), ordering (sequence numbers), flow control (receive window), and congestion control. UDP is a thin wrapper — no guarantees. QUIC bundles TLS 1.3 and multiplexing, eliminating TCP head-of-line blocking.",
    realWorld: "AWS NLB routes TCP connections at L4 without reading contents",
    color: "#788C5D",
    bg: "#f0f3ec",
  },
  {
    num: 3,
    name: "Network",
    protocols: ["IP", "ICMP", "BGP", "OSPF"],
    responsibility: "Logical addressing, routing across networks",
    detail:
      "Introduces IP addresses and routing across multiple network segments. Each router reads only the IP header, looks up the destination, and forwards one hop at a time. No single node needs a global view — BGP propagates reachability between autonomous systems.",
    realWorld: "Your packet crosses 15+ routers from browser to server, each making local hop decisions",
    color: "#B85C38",
    bg: "#f9ede8",
  },
  {
    num: 2,
    name: "Data Link",
    protocols: ["Ethernet", "Wi-Fi 802.11", "PPP"],
    responsibility: "Framing, MAC addressing, local delivery",
    detail:
      "Turns raw bits into frames with headers and trailers. Introduces MAC addresses for delivery within a single network segment. Switches operate here: they read MAC addresses and forward to the right port without knowing anything about IP.",
    realWorld: "Ethernet frame: 6B dest MAC + 6B src MAC + 2B EtherType + payload + 4B CRC",
    color: "#D97757",
    bg: "#fceee8",
  },
  {
    num: 1,
    name: "Physical",
    protocols: ["10BASE-T", "100BASE-TX", "802.3"],
    responsibility: "Bits on a wire — voltage, timing, encoding",
    detail:
      "Moves bits, not bytes. Defines what 1 and 0 look like on a medium: ±2.5V differential on copper, light pulses on fibre, radio waves in air. Doesn't know what the bits mean — just clocks them in and out.",
    realWorld: "Upgrading copper to fibre doesn't touch any layer above L1",
    color: "#141413",
    bg: "#e8e8e6",
  },
];

const infraTable = [
  { layer: "L3/L4", product: "AWS NLB", sees: "IP addr + TCP/UDP port", can: "Route by port, TLS passthrough, preserve source IP" },
  { layer: "L7", product: "AWS ALB", sees: "HTTP headers, URL, host, cookies", can: "Path routing (/api/*), sticky sessions, header rewriting" },
  { layer: "L3/L4", product: "iptables / Security Group", sees: "Source/dest IP, port, protocol", can: "Allow/deny by address + port, stateful connection tracking" },
  { layer: "L7", product: "AWS WAF / Cloudflare", sees: "Full HTTP payload", can: "Block SQLi, rate-limit by user, inspect request body" },
  { layer: "L4", product: "K8s ClusterIP Service", sees: "TCP port", can: "Load balance to pod replicas by port" },
  { layer: "L7", product: "K8s Ingress / Istio", sees: "HTTP host + path", can: "Path routing, mutual TLS, circuit breaking, retries" },
];

function LayerCard({ layer, isExpanded, onToggle }: {
  layer: typeof layers[0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        border: `1.5px solid ${layer.color}`,
        borderRadius: "6px",
        overflow: "hidden",
        marginBottom: "8px",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease",
        boxShadow: isExpanded ? `0 2px 12px ${layer.color}40` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          background: isExpanded ? layer.bg : "var(--white)",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "4px",
          background: layer.color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          fontWeight: 700,
          flexShrink: 0,
        }}>
          L{layer.num}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontWeight: 700,
              fontSize: "13px",
              color: layer.color,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              {layer.name}
            </span>
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              color: "var(--g500)",
            }}>
              — {layer.responsibility}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {layer.protocols.map((p) => (
              <span key={p} style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "3px",
                background: layer.bg,
                color: layer.color,
                border: `1px solid ${layer.color}40`,
              }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          color: "var(--g500)",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}>▶</span>
      </div>

      {isExpanded && (
        <div style={{
          padding: "16px",
          background: layer.bg,
          borderTop: `1px solid ${layer.color}30`,
          animation: "fadeIn 0.2s ease",
        }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px",
            color: "var(--slate)",
            lineHeight: 1.65,
            margin: "0 0 10px",
          }}>
            {layer.detail}
          </p>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "8px 12px",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "4px",
            borderLeft: `3px solid ${layer.color}`,
          }}>
            <span style={{ fontSize: "10px", marginTop: "1px" }}>⚡</span>
            <span style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              color: "var(--g500)",
              fontStyle: "italic",
            }}>
              {layer.realWorld}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OsiModelContent() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  const toggle = (num: number) =>
    setExpandedLayer((prev) => (prev === num ? null : num));

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* Intro */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        The OSI Model exists because, in the 1970s, networks were a tower of Babel. Every vendor shipped a proprietary end-to-end stack — IBM&apos;s SNA, DEC&apos;s DECnet, Xerox&apos;s XNS — and none could interoperate. ISO&apos;s solution was <strong>layering</strong>: split the problem into seven independent concerns, each solved once.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "32px" }}>
        The implementation lost. TCP/IP won. But the vocabulary — &ldquo;L4 firewall&rdquo;, &ldquo;L7 routing&rdquo; — is everywhere. OSI won as a mental model even as it failed as a product.
      </p>

      {/* Layer stack */}
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
          The 7 Layers — click any layer to expand
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 24px",
          gap: "0 8px",
          alignItems: "start",
        }}>
          <div>
            {layers.map((layer) => (
              <LayerCard
                key={layer.num}
                layer={layer}
                isExpanded={expandedLayer === layer.num}
                onToggle={() => toggle(layer.num)}
              />
            ))}
          </div>

          {/* TCP/IP bracket */}
          <div style={{ paddingTop: "4px", display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              { label: "TCP/IP Application", span: 3, color: "#6A8CAF" },
              { label: "Transport", span: 1, color: "#788C5D" },
              { label: "Internet", span: 1, color: "#D97757" },
              { label: "Link", span: 2, color: "#141413" },
            ].map(({ label, span, color }) => (
              <div key={label} style={{
                height: `${span * 52 + (span - 1) * 8}px`,
                borderRight: `2px solid ${color}`,
                borderTop: `2px solid ${color}`,
                borderBottom: `2px solid ${color}`,
                borderRadius: "0 4px 4px 0",
                marginBottom: span < 3 ? "8px" : "8px",
                display: "flex",
                alignItems: "center",
                paddingLeft: "3px",
                position: "relative",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "8px",
                  color,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.06em",
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Where engineers use this */}
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
          Where Engineers Use This Daily
        </p>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          Every infrastructure decision is an OSI framing decision. The layer at which a device operates determines what it can see, act on, and what it costs.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px",
          }}>
            <thead>
              <tr style={{ background: "var(--slate)", color: "var(--oat)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>Layer</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>Sees</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>Can Do</th>
              </tr>
            </thead>
            <tbody>
              {infraTable.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--g300)", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: row.layer.includes("7") ? "#4d7296" : row.layer.includes("4") || row.layer.includes("3") ? "#B85C38" : "var(--g500)",
                      background: row.layer.includes("7") ? "#e8f0f7" : row.layer.includes("4") || row.layer.includes("3") ? "#fceee8" : "var(--g300)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}>
                      {row.layer}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "var(--slate)" }}>{row.product}</td>
                  <td style={{ padding: "9px 12px", color: "var(--g500)", fontSize: "12px" }}>{row.sees}</td>
                  <td style={{ padding: "9px 12px", color: "var(--slate)", fontSize: "12px" }}>{row.can}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: "16px",
          padding: "12px 16px",
          background: "#fef9f0",
          borderLeft: "3px solid #D97757",
          borderRadius: "0 4px 4px 0",
        }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
            <strong>The cost trade-off:</strong> L7 inspection is 10–100× more expensive per connection than L3/L4 filtering. An ALB must parse HTTP before routing; an NLB forwards the raw TCP stream without reading it.
          </p>
        </div>
      </div>

      {/* Why OSI lost but its vocabulary won */}
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
          Why TCP/IP Won but OSI&apos;s Vocabulary Didn&apos;t Lose
        </p>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          OSI never shipped as a complete interoperable stack. The IETF&apos;s TCP/IP suite — built incrementally from real running code — won the commercial internet. But its four-layer model loses resolution when you need to describe <em>where</em> in the stack something happens.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {[
            { model: "OSI 7-Layer", layers: ["7 Application", "6 Presentation", "5 Session", "4 Transport", "3 Network", "2 Data Link", "1 Physical"], accent: "#6A8CAF" },
            { model: "TCP/IP 4-Layer", layers: ["Application (L5–L7)", "Transport (L4)", "Internet (L3)", "Link (L1–L2)"], accent: "#D97757" },
          ].map(({ model, layers: ls, accent }) => (
            <div key={model} style={{
              border: `1.5px solid ${accent}`,
              borderRadius: "6px",
              overflow: "hidden",
            }}>
              <div style={{
                background: accent,
                color: "#fff",
                padding: "8px 12px",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {model}
              </div>
              <div style={{ padding: "8px 0" }}>
                {ls.map((l) => (
                  <div key={l} style={{
                    padding: "5px 12px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "11px",
                    color: "var(--slate)",
                    borderBottom: "1px solid var(--g300)",
                  }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "13px", lineHeight: 1.65, color: "var(--g500)" }}>
          Engineers say &ldquo;L7 firewall&rdquo; because TCP/IP has no precise equivalent term. OSI&apos;s vocabulary won because <strong style={{ color: "var(--slate)" }}>precision is useful even when the full implementation didn&apos;t follow</strong>.
        </p>
      </div>

      {/* Where OSI Falls Short */}
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
          Where the Model Falls Short
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { title: "Session + Presentation are vestigial", body: "Modern protocols absorbed their concerns into L4 or L7. Most engineers treat these as 'the missing layers'." },
            { title: "TLS is ambiguously placed", body: "It sits above TCP but below HTTP — between L4 and L7. OSI's strict layering didn't anticipate this." },
            { title: "BGP, NAT, CDNs don't fit", body: "The model was designed before the internet scaled. These technologies span layers or operate outside the model." },
            { title: "QUIC violates separation", body: "QUIC bundles L4 transport + L6/L7 encryption into one protocol, optimising for performance over architectural purity." },
          ].map(({ title, body }) => (
            <div key={title} style={{
              padding: "12px",
              background: "var(--oat)",
              borderRadius: "4px",
              border: "1px solid var(--g300)",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "var(--slate)" }}>{title}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--g500)", lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
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
