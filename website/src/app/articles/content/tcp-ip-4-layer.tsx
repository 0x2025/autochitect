"use client";

import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const layers = [
  {
    num: 4,
    shortName: "Application",
    osiEquiv: "OSI L5 + L6 + L7",
    protocols: ["HTTP/1.1", "HTTP/2", "HTTP/3", "gRPC", "DNS", "TLS", "SMTP"],
    responsibility: "Meaning of data — protocols, encoding, session",
    detail:
      "Where business logic begins. HTTP defines verbs and status codes. TLS encrypts the byte stream before it reaches the wire. DNS resolves hostnames. gRPC multiplexes typed calls over HTTP/2 frames. Everything the application cares about lives here — and unlike OSI, TCP/IP bundles session, presentation, and application into one layer because in practice they're inseparable.",
    architectNote:
      "Choosing HTTP/2 for internal gRPC vs HTTP/3 for external clients is an application-layer decision with transport-layer consequences. TLS termination point determines what infrastructure can inspect — terminate at the load balancer and ALB/WAF can read headers; terminate end-to-end and only the app can.",
    color: "#4d7296",
    bg: "#e8f0f7",
  },
  {
    num: 3,
    shortName: "Transport",
    osiEquiv: "OSI L4",
    protocols: ["TCP", "UDP", "QUIC"],
    responsibility: "End-to-end delivery between processes",
    detail:
      "TCP adds reliability (ACK + retransmit), ordering (sequence numbers), flow control (receive window), and congestion control (CUBIC, BBR). UDP strips all of that — a checksum and ports, nothing else. QUIC (RFC 9000) builds multiplexed streams over UDP with built-in TLS 1.3, solving TCP's head-of-line blocking. Ports live here: not addresses, but demultiplexing identifiers — the same IP can run 65,535 simultaneous services on different ports.",
    architectNote:
      "TCP's 3-way handshake costs 1 RTT. Add TLS 1.2 and you're at 3 RTTs before a byte of application data flows. At 50ms RTT, every cold connection to a microservice burns 150ms before a byte moves. HTTP/2 stream multiplexing and QUIC's 0-RTT resumption exist entirely to amortize this cost. Connection pooling at the transport layer is one of the highest-leverage performance decisions in a microservices architecture.",
    color: "#788C5D",
    bg: "#f0f3ec",
  },
  {
    num: 2,
    shortName: "Internet",
    osiEquiv: "OSI L3",
    protocols: ["IPv4", "IPv6", "ICMP", "BGP"],
    responsibility: "Logical addressing, routing hop-by-hop",
    detail:
      "IP addresses identify machines globally. Every router reads only the IP header, looks up the destination in its routing table, and forwards one hop — no router knows the full path. BGP propagates reachability between autonomous systems, enabling the internet's distributed routing without central coordination. ICMP carries control messages: ping, traceroute, Destination Unreachable, Time Exceeded.",
    architectNote:
      "VPCs, subnets, CIDR blocks, routing tables, security groups, NAT gateways — all Internet-layer constructs. A security group rule 'allow TCP 443 from 10.0.0.0/8' is an Internet+Transport rule: it filters by IP (L3) and port (L4) but cannot see the HTTP payload inside. VPC peering, Transit Gateway, PrivateLink — routing decisions at L3 that shape your security blast radius.",
    color: "#B85C38",
    bg: "#f9ede8",
  },
  {
    num: 1,
    shortName: "Link",
    osiEquiv: "OSI L1 + L2",
    protocols: ["Ethernet", "Wi-Fi 802.11", "ARP"],
    responsibility: "Physical delivery within one hop",
    detail:
      "Ethernet frames carry the payload from one NIC to the next — exactly one hop. MAC addresses identify physical interfaces within a segment; ARP resolves IP to MAC before the frame can be sent. Switches forward by MAC table without reading IP. At the physical level: ±2.5V differential on copper, photons on fibre, radio waves in 2.4/5 GHz bands.",
    architectNote:
      "Architects rarely configure this layer directly, but MTU matters: default Ethernet MTU is 1500 bytes; exceeding it causes IP fragmentation, which adds overhead and drops under some firewalls. Data-center jumbo frames (MTU 9000) reduce fragmentation for high-throughput east-west traffic. VLAN tagging (802.1Q) enables L2 segmentation in multi-tenant environments.",
    color: "#141413",
    bg: "#e8e8e6",
  },
];

// Packet encapsulation steps (bottom-up: Link wraps Internet wraps Transport wraps Application)
const encapSteps = [
  {
    step: 0,
    label: "Application generates data",
    description: "Your service calls POST /orders — the application layer creates an HTTP request with headers and a JSON body.",
    layers: [
      { name: "HTTP Request", content: "POST /orders HTTP/1.1\nHost: api.example.com\nContent-Type: application/json\n\n{\"item\":\"widget\",\"qty\":3}", color: "#4d7296", bg: "#e8f0f7", active: true },
    ],
  },
  {
    step: 1,
    label: "Transport wraps with TCP header",
    description: "TCP prepends a segment header with source/destination ports, sequence number, flags, and window size. This segment is what TCP delivers reliably.",
    layers: [
      { name: "TCP Segment", content: "SrcPort: 54321  DstPort: 443\nSeq: 100  Ack: 0  Flags: PSH|ACK\nWindow: 65535  Checksum: 0xf3a1", color: "#788C5D", bg: "#f0f3ec", active: true },
      { name: "HTTP Payload", content: "POST /orders HTTP/1.1 ...", color: "#4d7296", bg: "#e8f0f7", active: false },
    ],
  },
  {
    step: 2,
    label: "Internet wraps with IP header",
    description: "IP prepends source/destination addresses and a TTL. Routers will read only this header, decrement TTL, and forward toward the destination — one hop at a time.",
    layers: [
      { name: "IP Packet", content: "Ver: 4  TTL: 64  Protocol: TCP (6)\nSrc: 10.0.1.5  Dst: 93.184.216.34\nLength: 1480  Checksum: 0x4e21", color: "#B85C38", bg: "#f9ede8", active: true },
      { name: "TCP Segment", content: "Port: 54321 → 443  Seq: 100 ...", color: "#788C5D", bg: "#f0f3ec", active: false },
      { name: "HTTP Payload", content: "POST /orders HTTP/1.1 ...", color: "#4d7296", bg: "#e8f0f7", active: false },
    ],
  },
  {
    step: 3,
    label: "Link wraps with Ethernet frame",
    description: "Ethernet prepends MAC addresses for this single hop (your NIC → next router). The FCS trailer lets the receiving NIC detect bit errors. When the packet crosses the next router, new MAC addresses are written for the next hop.",
    layers: [
      { name: "Ethernet Frame", content: "DstMAC: aa:bb:cc:11:22:33\nSrcMAC: 11:22:33:aa:bb:cc\nEtherType: 0x0800 (IPv4)\n[... payload ...]\nFCS: 0xd3e8f2a1", color: "#141413", bg: "#e8e8e6", active: true },
      { name: "IP Packet", content: "10.0.1.5 → 93.184.216.34 ...", color: "#B85C38", bg: "#f9ede8", active: false },
      { name: "TCP Segment", content: "Port: 54321 → 443 ...", color: "#788C5D", bg: "#f0f3ec", active: false },
      { name: "HTTP Payload", content: "POST /orders ...", color: "#4d7296", bg: "#e8f0f7", active: false },
    ],
  },
  {
    step: 4,
    label: "Receiving end unwraps in reverse",
    description: "The server's NIC strips the Ethernet frame, IP stack strips the IP header, TCP stack reassembles segments and strips TCP header, application reads the HTTP request. Each layer serves its purpose then hands up.",
    layers: [
      { name: "HTTP Request", content: "POST /orders HTTP/1.1\nHost: api.example.com\n\n{\"item\":\"widget\",\"qty\":3}", color: "#4d7296", bg: "#e8f0f7", active: true },
    ],
    isReceiving: true,
  },
];

const protocolRows = [
  { property: "Delivery guarantee", tcp: "ACK + retransmit", udp: "Best-effort", quic: "Per-stream ACK + retransmit" },
  { property: "Ordering", tcp: "Strict (seq numbers)", udp: "None", quic: "Per-stream ordering" },
  { property: "Connection setup", tcp: "3-way handshake (1 RTT)", udp: "None (0 RTT)", quic: "0-RTT resumption" },
  { property: "TLS", tcp: "+1–2 RTT separately", udp: "App-defined", quic: "Built-in TLS 1.3" },
  { property: "Head-of-line blocking", tcp: "Blocks full connection", udp: "None", quic: "Isolated per stream" },
  { property: "Stream multiplexing", tcp: "No (HTTP/2 adds it)", udp: "No", quic: "Native" },
  { property: "Connection migration", tcp: "No (breaks on IP change)", udp: "No", quic: "Yes (mobile networks)" },
];

const architectRows = [
  { concern: "Route by URL path or HTTP header", layer: "L7", tool: "ALB · NGINX · Ingress", why: "HTTP headers only visible after TLS termination at L7" },
  { concern: "Route by IP + port", layer: "L3/L4", tool: "NLB · Security Group · iptables", why: "IP/port from header only — no payload parsing needed" },
  { concern: "Block SQL injection / XSS", layer: "L7", tool: "WAF (AWS WAF · Cloudflare)", why: "Attack patterns live in the HTTP body, invisible below L7" },
  { concern: "Isolate network segments", layer: "L3", tool: "VPC Subnet · NACL", why: "IP-level boundary enforced before traffic reaches app" },
  { concern: "Encrypt service-to-service", layer: "L7 (via TLS)", tool: "mTLS · Istio · Linkerd", why: "TLS negotiates at L4 but protects L7 payload" },
  { concern: "Observe HTTP request latency", layer: "L7", tool: "Envoy · Datadog APM", why: "Need HTTP verb + status code — requires L7 visibility" },
  { concern: "Observe connection latency (TCP RTT)", layer: "L4", tool: "eBPF · VPC Flow Logs", why: "TCP handshake timing is below HTTP — L4 tracing" },
  { concern: "Eliminate per-call handshake cost", layer: "L4 (QUIC / HTTP/2)", tool: "HTTP/3 · h2 connection pools", why: "0-RTT or connection reuse amortizes handshake RTTs" },
];

// ─── Sub-components ────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontFamily: "var(--font-sans, sans-serif)",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "var(--g500)",
    borderBottom: "1px solid var(--g300)",
    paddingBottom: "8px",
    marginBottom: "20px",
    marginTop: "0",
  }}>
    {children}
  </p>
);

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
        boxShadow: isExpanded ? `0 2px 12px ${layer.color}30` : "none",
        transition: "box-shadow 0.15s ease",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: isExpanded ? layer.bg : "var(--white)",
        transition: "background 0.2s ease",
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          background: layer.color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
          flexShrink: 0,
          flexDirection: "column" as const,
          lineHeight: 1.2,
        }}>
          <span style={{ fontSize: "8px", opacity: 0.7 }}>L{layer.num}</span>
          <span style={{ fontSize: "9px" }}>{layer.shortName.slice(0, 4)}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontWeight: 700,
              fontSize: "13px",
              color: layer.color,
            }}>
              {layer.shortName}
            </span>
            <span style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "9px",
              color: "var(--g500)",
              background: "var(--oat)",
              padding: "1px 5px",
              borderRadius: "2px",
            }}>
              {layer.osiEquiv}
            </span>
          </div>
          <p style={{
            margin: "3px 0 6px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            color: "var(--g500)",
          }}>
            {layer.responsibility}
          </p>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" as const }}>
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
          color: "var(--g500)",
          fontSize: "11px",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
          flexShrink: 0,
        }}>
          ▶
        </span>
      </div>

      {isExpanded && (
        <div style={{
          padding: "16px",
          background: layer.bg,
          borderTop: `1px solid ${layer.color}20`,
          animation: "fadeIn 0.18s ease",
        }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px",
            color: "var(--slate)",
            lineHeight: 1.7,
            margin: "0 0 12px",
          }}>
            {layer.detail}
          </p>
          <div style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.65)",
            borderLeft: `3px solid ${layer.color}`,
            borderRadius: "0 4px 4px 0",
          }}>
            <p style={{
              margin: "0 0 2px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              color: layer.color,
            }}>
              Architect implications
            </p>
            <p style={{
              margin: 0,
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              color: "var(--slate)",
              lineHeight: 1.65,
            }}>
              {layer.architectNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PacketBox({ layer, active }: { layer: { name: string; content: string; color: string; bg: string }; active: boolean }) {
  return (
    <div style={{
      border: `1.5px solid ${active ? layer.color : layer.color + "50"}`,
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "4px",
      opacity: active ? 1 : 0.55,
      transition: "opacity 0.2s ease, border-color 0.2s ease",
    }}>
      <div style={{
        background: active ? layer.color : layer.color + "30",
        padding: "3px 10px",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        color: active ? "#fff" : layer.color,
        transition: "background 0.2s ease",
      }}>
        {layer.name}
      </div>
      <pre style={{
        margin: 0,
        padding: "8px 10px",
        background: active ? layer.bg : "var(--white)",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "10px",
        color: active ? layer.color : "var(--g500)",
        lineHeight: 1.55,
        whiteSpace: "pre-wrap" as const,
        transition: "background 0.2s ease",
      }}>
        {layer.content}
      </pre>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function TcpIp4LayerContent() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [encapStep, setEncapStep] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState<"tcp" | "udp" | "quic">("tcp");

  const toggle = (num: number) =>
    setExpandedLayer((prev) => (prev === num ? null : num));

  const currentStep = encapSteps[encapStep];

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", maxWidth: "720px" }}>

      {/* ── Intro ── */}
      <p style={{ fontSize: "16px", lineHeight: 1.75, color: "var(--slate)", marginBottom: "8px" }}>
        The TCP/IP model is the network stack that actually runs the internet. While OSI defined a theoretically clean 7-layer framework, the IETF built TCP/IP from <strong>running code</strong> — and when the commercial internet scaled, it bet on TCP/IP.
      </p>
      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--g500)", marginBottom: "12px" }}>
        Four layers: Link, Internet, Transport, Application. Every byte your services send crosses all four. Every infrastructure decision you make — load balancer type, TLS termination point, service mesh placement, security group rules — is secretly a <em>layer</em> decision.
      </p>

      {/* Why architects card */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "8px",
        marginBottom: "40px",
      }}>
        {[
          { icon: "⚖️", title: "Protocol choice", body: "TCP vs UDP vs QUIC is a reliability/latency trade-off — each imposes different connection costs at scale." },
          { icon: "🔀", title: "Infrastructure placement", body: "NLB vs ALB, WAF, service mesh — each operates at a specific layer. Layer determines capability and cost." },
          { icon: "🔐", title: "Security posture", body: "VPC segments (L3), security groups (L3/L4), WAFs (L7) — knowing the layer defines what they can enforce." },
          { icon: "🔬", title: "Latency attribution", body: "TCP handshake, TLS negotiation, DNS lookup, HTTP processing — each lives at a different layer." },
        ].map(({ icon, title, body }) => (
          <div key={title} style={{
            padding: "12px",
            background: "var(--oat)",
            borderRadius: "4px",
            border: "1px solid var(--g300)",
          }}>
            <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "var(--slate)" }}>
              {icon} {title}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--g500)", lineHeight: 1.55 }}>{body}</p>
          </div>
        ))}
      </div>

      {/* ── The 4 Layers ── */}
      <div style={{ marginBottom: "44px" }}>
        <SectionLabel>The 4 Layers — click any layer to expand</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 20px", gap: "0 8px" }}>
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

          {/* OSI mapping bracket */}
          <div style={{ display: "flex", flexDirection: "column", paddingTop: "4px" }}>
            {[
              { label: "OSI L5–L7", span: 1, color: "#4d7296" },
              { label: "OSI L4", span: 1, color: "#788C5D" },
              { label: "OSI L3", span: 1, color: "#B85C38" },
              { label: "OSI L1–L2", span: 1, color: "#141413" },
            ].map(({ label, color }) => (
              <div key={label} style={{
                height: "52px",
                marginBottom: "8px",
                borderRight: `2px solid ${color}`,
                borderTop: `2px solid ${color}`,
                borderBottom: `2px solid ${color}`,
                borderRadius: "0 4px 4px 0",
                display: "flex",
                alignItems: "center",
                paddingLeft: "2px",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "7px",
                  color,
                  writingMode: "vertical-rl" as const,
                  textOrientation: "mixed" as const,
                  transform: "rotate(180deg)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Packet Encapsulation Journey ── */}
      <div style={{ marginBottom: "44px" }}>
        <SectionLabel>Packet Encapsulation — how data travels the stack</SectionLabel>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          Each layer wraps the layer above in its own header. The receiving side peels headers in reverse — each layer serves its purpose, then hands data up. Step through to see how a single HTTP POST is encapsulated.
        </p>

        {/* Step controls */}
        <div style={{
          display: "flex",
          gap: "6px",
          marginBottom: "16px",
          flexWrap: "wrap" as const,
        }}>
          {encapSteps.map((s) => (
            <button
              key={s.step}
              onClick={() => setEncapStep(s.step)}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: encapStep === s.step ? "1.5px solid var(--clay)" : "1.5px solid var(--g300)",
                background: encapStep === s.step ? "var(--clay)" : "var(--white)",
                color: encapStep === s.step ? "#fff" : "var(--g500)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "all 0.15s ease",
              }}
            >
              {s.step === 4 ? "⟵ Receive" : `Step ${s.step + 1}`}
            </button>
          ))}
        </div>

        {/* Step label */}
        <div style={{
          padding: "10px 14px",
          background: currentStep.isReceiving ? "#f0f3ec" : "#fef9f0",
          borderLeft: `3px solid ${currentStep.isReceiving ? "#788C5D" : "var(--clay)"}`,
          borderRadius: "0 4px 4px 0",
          marginBottom: "16px",
        }}>
          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "13px", color: "var(--slate)" }}>
            {currentStep.isReceiving ? "↩ " : "↓ "}{currentStep.label}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--g500)", lineHeight: 1.6 }}>
            {currentStep.description}
          </p>
        </div>

        {/* Packet visual */}
        <div style={{ maxWidth: "480px" }}>
          {currentStep.layers.map((layer, i) => (
            <div
              key={i}
              style={{
                paddingLeft: i === 0 ? "0" : `${i * 16}px`,
                transition: "padding 0.2s ease",
              }}
            >
              <PacketBox layer={layer} active={i === 0} />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            onClick={() => setEncapStep((s) => Math.max(0, s - 1))}
            disabled={encapStep === 0}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              border: "1.5px solid var(--g300)",
              background: "var(--white)",
              color: encapStep === 0 ? "var(--g300)" : "var(--slate)",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: encapStep === 0 ? "default" : "pointer",
            }}
          >
            ← Previous
          </button>
          <button
            onClick={() => setEncapStep((s) => Math.min(encapSteps.length - 1, s + 1))}
            disabled={encapStep === encapSteps.length - 1}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              border: "1.5px solid var(--clay)",
              background: encapStep === encapSteps.length - 1 ? "var(--white)" : "var(--clay)",
              color: encapStep === encapSteps.length - 1 ? "var(--g300)" : "#fff",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: encapStep === encapSteps.length - 1 ? "default" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Protocol Comparison ── */}
      <div style={{ marginBottom: "44px" }}>
        <SectionLabel>TCP vs UDP vs QUIC — choose your Transport</SectionLabel>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          The Transport layer is where reliability, ordering, and connection cost are decided. These three protocols cover the full spectrum from maximum guarantees to zero overhead.
        </p>

        {/* Protocol selector tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "0", borderRadius: "6px 6px 0 0", overflow: "hidden", border: "1.5px solid var(--g300)" }}>
          {(["tcp", "udp", "quic"] as const).map((proto) => {
            const isActive = activeProtocol === proto;
            const colors = { tcp: "#4d7296", udp: "#B85C38", quic: "#788C5D" };
            const color = colors[proto];
            return (
              <button
                key={proto}
                onClick={() => setActiveProtocol(proto)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                  background: isActive ? color + "15" : "var(--oat)",
                  color: isActive ? color : "var(--g500)",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontWeight: 700,
                  fontSize: "12px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {proto.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: "auto", border: "1.5px solid var(--g300)", borderTop: "none", borderRadius: "0 0 6px 6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px" }}>
            <tbody>
              {protocolRows.map((row, i) => {
                const colColors = { tcp: "#4d7296", udp: "#B85C38", quic: "#788C5D" };
                const highlighted = row[activeProtocol];
                const color = colColors[activeProtocol];
                return (
                  <tr key={i} style={{ borderBottom: i < protocolRows.length - 1 ? "1px solid var(--g300)" : "none", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                    <td style={{ padding: "9px 12px", color: "var(--g500)", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.04em", width: "28%", whiteSpace: "nowrap" as const }}>
                      {row.property}
                    </td>
                    <td style={{
                      padding: "9px 12px",
                      color: activeProtocol === "tcp" ? "#4d7296" : "var(--slate)",
                      fontWeight: activeProtocol === "tcp" ? 700 : 400,
                      background: activeProtocol === "tcp" ? "#e8f0f730" : "transparent",
                      width: "24%",
                    }}>
                      {row.tcp}
                    </td>
                    <td style={{
                      padding: "9px 12px",
                      color: activeProtocol === "udp" ? "#B85C38" : "var(--slate)",
                      fontWeight: activeProtocol === "udp" ? 700 : 400,
                      background: activeProtocol === "udp" ? "#f9ede830" : "transparent",
                      width: "24%",
                    }}>
                      {row.udp}
                    </td>
                    <td style={{
                      padding: "9px 12px",
                      color: activeProtocol === "quic" ? "#788C5D" : "var(--slate)",
                      fontWeight: activeProtocol === "quic" ? 700 : 400,
                      background: activeProtocol === "quic" ? "#f0f3ec30" : "transparent",
                      width: "24%",
                    }}>
                      {row.quic}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* When to use callout */}
        {(() => {
          const uses = {
            tcp: { use: "HTTP/1.1, HTTP/2, gRPC, databases, file transfers — payloads where losing data is unacceptable", avoid: "Real-time audio/video where a stale retransmit is worse than a dropped frame", color: "#4d7296" },
            udp: { use: "DNS queries, video/audio streaming, gaming, telemetry — speed and freshness matter more than completeness", avoid: "Anything requiring guaranteed delivery without app-level reliability logic", color: "#B85C38" },
            quic: { use: "HTTP/3, mobile clients (connection migration survives network changes), latency-sensitive APIs with high connection churn", avoid: "Enterprise networks where UDP is rate-limited or blocked by firewall policy", color: "#788C5D" },
          };
          const u = uses[activeProtocol];
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
              <div style={{ padding: "12px", background: u.color + "12", borderRadius: "4px", border: `1px solid ${u.color}30` }}>
                <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: u.color }}>Use when</p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate)", lineHeight: 1.55 }}>{u.use}</p>
              </div>
              <div style={{ padding: "12px", background: "var(--oat)", borderRadius: "4px", border: "1px solid var(--g300)" }}>
                <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--g500)" }}>Avoid when</p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--slate)", lineHeight: 1.55 }}>{u.avoid}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Architect Decision Matrix ── */}
      <div style={{ marginBottom: "32px" }}>
        <SectionLabel>Architect Decision Matrix — concern → layer → tool</SectionLabel>

        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--slate)", marginBottom: "16px" }}>
          Every infrastructure choice is a layer choice in disguise. The layer you operate at determines what you can see — and what you can see determines what you can do.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--slate)", color: "var(--oat)" }}>
                {["Concern", "Layer", "Tool", "Why"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {architectRows.map((row, i) => {
                const layerColor = row.layer.includes("7") ? "#4d7296"
                  : row.layer.includes("4") ? "#788C5D"
                  : row.layer.includes("3") ? "#B85C38"
                  : "var(--g500)";
                const layerBg = row.layer.includes("7") ? "#e8f0f7"
                  : row.layer.includes("4") ? "#f0f3ec"
                  : row.layer.includes("3") ? "#f9ede8"
                  : "var(--oat)";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--g300)", background: i % 2 === 0 ? "var(--white)" : "var(--oat)" }}>
                    <td style={{ padding: "9px 12px", color: "var(--slate)", fontWeight: 500 }}>{row.concern}</td>
                    <td style={{ padding: "9px 12px", whiteSpace: "nowrap" as const }}>
                      <span style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: layerColor,
                        background: layerBg,
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}>
                        {row.layer}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", color: "var(--slate)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>{row.tool}</td>
                    <td style={{ padding: "9px 12px", color: "var(--g500)", fontSize: "11px", lineHeight: 1.5 }}>{row.why}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: "16px",
          padding: "12px 16px",
          background: "#fef9f0",
          borderLeft: "3px solid var(--clay)",
          borderRadius: "0 4px 4px 0",
        }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--slate)", lineHeight: 1.65 }}>
            <strong>The cost rule:</strong> L7 inspection requires parsing the full application payload — 10–100× more CPU per connection than L3/L4 filtering, which reads only fixed-size headers. ALBs and WAFs are powerful, but the price is latency and compute. Use L3/L4 where possible; escalate to L7 only when the decision requires it.
          </p>
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
