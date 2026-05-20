---
title: "TCP/IP 4-Layer Model"
date: "2026-05-12"
summary: "The network model that actually shipped. How four layers — Link, Internet, Transport, Application — carry every byte your services send, and why every architecture decision you make is secretly a layer decision."
tags: ["Networking", "Protocols", "Fundamentals", "Architecture"]
sections:
  - type: properties
    title: "Concept Details"
    items:
      - label: "Category"
        value: "Network Model (Practical)"
      - label: "RFC"
        value: "RFC 1122 (1989)"
      - label: "Layers"
        value: "4 (Link → Application)"
      - label: "vs OSI"
        value: "Collapses OSI's 7 into 4 — what actually shipped"
      - label: "Notable Uses"
        value: "Every TCP/IP network on earth"
  - type: notes
    title: "Engineering Notes"
    content: "TCP/IP won because it was built from running code, not committee consensus. RFC 1122 mapped it to OSI to prove compatibility, then the internet scaled around it. Every architecture decision you make — NLB vs ALB, TLS termination point, service mesh placement — is a layer decision in disguise."
  - type: list
    title: "Why Architects Need This"
    items:
      - "Protocol selection (TCP vs UDP vs QUIC) is a latency/reliability trade-off"
      - "Infrastructure placement (ALB, WAF, NLB) depends on which layer you operate at"
      - "Security posture is defined by where you segment and inspect traffic"
      - "Connection costs (handshake, TLS) compound at scale — understanding them prevents surprises"
      - "Service mesh (Istio, Envoy) operates at L4/L7 — knowing the model tells you what it sees"
  - type: list
    title: "Related Concepts"
    items:
      - "OSI Model"
      - "HTTP/2 & HTTP/3"
      - "TLS / Encryption"
      - "Sockets"
      - "Load Balancers"
      - "Service Mesh"
---

# TCP/IP 4-Layer Model

The TCP/IP model is the network stack that actually runs the internet. While OSI defined a theoretically clean 7-layer framework in committee, the IETF built TCP/IP from running code starting in the early 1970s. By the time OSI published its final spec in 1984, TCP/IP already had a decade of operational experience and real interoperability. The commercial internet bet on TCP/IP, and that bet paid off.

RFC 1122 (1989) codified the model into four layers: Link, Internet, Transport, and Application. Those four layers carry every HTTP request, every DNS lookup, every gRPC call your services make.

## Why Software Architects Need This

Most engineers treat the network as a black box — requests go in, responses come out. This works until something breaks or until you're making infrastructure decisions that depend on which layer you're operating at.

Every major architectural question has a layer answer:

- **Where does your load balancer route?** L4 (port-based) or L7 (HTTP headers + path). Different cost, different capability.
- **Where does TLS terminate?** At the load balancer (L7) or the application (L7 end-to-end)? The answer determines whether your service mesh can inspect traffic.
- **Why is this service slow?** Is latency in the TCP handshake (L4), in DNS resolution (L7 Application), or in HTTP processing (L7)? Attribution requires knowing the layers.
- **How do you segment a multi-tenant system?** VPC subnets and NACLs operate at L3 (Internet). Security groups are L3/L4. WAFs are L7.

## The Four Layers

### Layer 1: Link

Moves bits across a single physical hop. Ethernet frames, Wi-Fi packets, fiber photons. MAC addresses live here — they identify NICs, not machines, and are only meaningful within one network segment. ARP maps IP addresses to MAC addresses so packets can actually leave the machine.

Software architects almost never configure this layer directly, but it constrains everything above it: MTU (maximum frame size) determines when IP must fragment packets; jumbo frames (9000 byte MTU vs. default 1500) reduce overhead in data centers.

### Layer 2: Internet

Logical addressing and routing across multiple hops. IP addresses identify machines globally. Every router reads only the IP header, looks up the destination, and forwards one hop toward it. No router knows the full path — BGP propagates reachability between autonomous systems, enabling distributed routing without central coordination.

This is the layer of VPCs, subnets, routing tables, security groups (by IP/port), and NAT gateways. When you draw a network diagram with CIDR blocks and arrows between availability zones, you're drawing at Layer 2 of this model (L3 in OSI terms).

### Layer 3: Transport

End-to-end delivery between processes. The Internet layer gets packets to a machine; ports get them to the right process. TCP adds reliability, ordering, flow control, and congestion control at the cost of connection overhead. UDP adds ports and a checksum — nothing more.

The key tradeoff: TCP's three-way handshake costs 1 RTT before a byte of data flows. Add TLS 1.2 and that's 3 RTTs. For microservice calls that happen thousands of times per second, this compounds. HTTP/2's stream multiplexing and QUIC's 0-RTT resumption exist entirely because of this cost.

### Layer 4: Application

Everything above Transport: protocol semantics, encoding, encryption, session management. HTTP, DNS, SMTP, TLS, gRPC all live here. This is where business logic begins — and where most software engineers spend their careers.

TLS is worth calling out: it negotiates via the transport layer but encrypts the application payload. This is why TLS termination at a load balancer gives that load balancer L7 visibility — it can now read HTTP headers, URL paths, and cookies.

## Encapsulation: What Actually Travels on the Wire

When your application calls `POST /orders`, here is what gets sent:

```
┌─────────────────────────────────────────────────────┐
│ Ethernet Frame                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ IP Packet                                     │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ TCP Segment                             │  │  │
│  │  │  ┌───────────────────────────────────┐  │  │  │
│  │  │  │ HTTP Request (Application data)   │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Each layer wraps the layer above in its own header. The receiving side unwraps in reverse: Ethernet card strips the frame, IP stack strips the IP header, TCP stack strips the segment header, application reads the HTTP request. This is encapsulation.

## TCP vs UDP vs QUIC

The Transport layer gives you three choices with fundamentally different guarantees:

**TCP** — reliable, ordered, with flow and congestion control. Use it when losing data is unacceptable: HTTP, databases, file transfers, gRPC. The handshake cost (1 RTT + TLS) matters when connections are short-lived.

**UDP** — connectionless, no guarantees, lowest overhead. Use it when a stale retransmit is worse than a dropped packet: real-time audio/video, gaming, DNS lookups, telemetry.

**QUIC** — TCP reliability with UDP flexibility. Multiplexed streams, built-in TLS 1.3, 0-RTT resumption, no head-of-line blocking. HTTP/3 runs over QUIC. Use it for mobile clients (connection migration survives network switches) and latency-sensitive APIs.

## The Architecture Implications Table

Every infrastructure component you choose is a layer choice:

| Concern | Layer | Tool |
|---|---|---|
| Route by URL path / HTTP header | Application (L7) | ALB, NGINX, Ingress |
| Route by IP + port only | Internet + Transport (L3/L4) | NLB, Security Group |
| Block OWASP top-10 | Application (L7) | WAF |
| Isolate services by network | Internet (L3) | VPC Subnet, NACL |
| Encrypt service-to-service | Application (TLS at L7 boundary) | mTLS, Service Mesh |
| Observe HTTP request latency | Application (L7) | Envoy, Datadog APM |
| Observe connection latency | Transport (L4) | eBPF, VPC Flow Logs |
| Multiplex streams | Transport (QUIC / HTTP/2) | HTTP/3, gRPC |

The pattern is consistent: what you can see determines what you can do, and what you can see is determined by which layer you operate at.
