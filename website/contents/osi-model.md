---
title: "OSI Model"
date: "2026-05-12"
summary: "How decomposing network communication into seven independent layers solved vendor lock-in and became the mental model every engineer still reaches for."
tags: ["Networking", "Protocols", "Fundamentals"]
sections:
  - type: properties
    title: "Concept Details"
    items:
      - label: "Category"
        value: "Network Reference Model"
      - label: "Standard"
        value: "ISO/IEC 7498-1 (1984)"
      - label: "Layers"
        value: "7 (Physical → Application)"
      - label: "Complexity"
        value: "Low (concept) / High (full implementation)"
      - label: "Notable Uses"
        value: "Firewall rules, load balancer config, protocol design, debugging"
  - type: notes
    title: "Engineering Notes"
    content: "OSI never fully shipped as an end-to-end implementation — TCP/IP won that race. But the 7-layer vocabulary is everywhere: AWS distinguishes NLB (L4) from ALB (L7); firewall rules are written in terms of L3/L4/L7; Wireshark dissects by layer. You use OSI framing every day even if you've never read ISO 7498."
  - type: list
    title: "Prerequisites"
    items:
      - "Binary / hexadecimal notation"
      - "What a network interface card (NIC) is"
      - "Client/server mental model"
      - "Basic understanding of IP addresses and ports"
  - type: list
    title: "Related Concepts"
    items:
      - "TCP/IP Stack"
      - "HTTP/2 & HTTP/3"
      - "Sockets"
      - "TLS / Encryption"
      - "Firewall & WAF"
---

# OSI Model

The OSI Model exists because, in the 1970s, networks were a tower of Babel. Every vendor shipped a proprietary end-to-end stack — IBM's SNA, DEC's DECnet, Xerox's XNS — and none of them could talk to each other. The International Organization for Standardization launched the Open Systems Interconnection project in 1977 with one goal: define a universal framework so that any two conforming implementations could interoperate, regardless of vendor.

The answer was layering. Split the problem "two programs on different machines exchanging data" into seven independent concerns. Let each layer solve exactly one concern. Require that a layer only ever talks to the layer directly above or below it. Now you can swap out the physical medium without touching routing, or add encryption without rewriting transport code.

## Prerequisites

> Before this article, you should be comfortable with: binary and hex notation (protocols encode data in bytes), what a NIC is (the physical entry/exit point for bits), the client/server model, and basic IP address + port concepts.

## The Problem: Vertical Integration Kills Interoperability

Before OSI, building a network meant buying an entire stack from one vendor. IBM's SNA (1974) was a seven-layer stack — technically sophisticated, but every layer was IBM's. Connecting an IBM mainframe to a DEC VAX required custom gateway boxes, manual protocol translation, and ongoing engineering effort from both sides.

This is the classic problem of vertical integration in infrastructure: each vendor optimised their own stack brilliantly, but the interfaces between vendors were undefined. As more vendors entered the market, the interoperability gap grew exponentially.

ISO's insight was that the *interfaces between concerns* were the public good that no single vendor would voluntarily standardise.

## The Core Idea: Separation of Concerns Across Seven Layers

OSI formalised this in ISO/IEC 7498-1 (1984). Each layer has a precisely scoped responsibility:

| # | Name | Responsibility | Real protocol examples |
|---|------|---------------|----------------------|
| 7 | Application | Meaning of data — the service protocol | HTTP, SMTP, DNS, FTP |
| 6 | Presentation | Data encoding, encryption, compression | TLS (partly), ASN.1 |
| 5 | Session | Dialog control, session checkpointing | NFS session management, RPC |
| 4 | Transport | End-to-end delivery, reliability, flow control | TCP, UDP, QUIC |
| 3 | Network | Logical addressing, routing across networks | IP, ICMP, BGP |
| 2 | Data Link | Framing, MAC addressing, local delivery | Ethernet, Wi-Fi (802.11), PPP |
| 1 | Physical | Bits on a wire — voltage, timing, encoding | 10BASE-T, 100BASE-TX, 802.3 |

The rule is strict: Layer N provides services to Layer N+1, and relies only on Layer N-1. A TCP segment doesn't know whether it's riding over Ethernet or Wi-Fi. An HTTP request doesn't know whether TCP is carrying it over IPv4 or IPv6.

## Layer-by-Layer: First Principles

### Layer 1 — Physical

The physical layer's job is to move **bits**, not bytes, not frames, not packets — bits. It defines what "a 1" and "a 0" look like on a medium: a voltage level on copper, a light pulse on fibre, a radio wave in air.

IEEE 802.3 (Ethernet physical specifications) is the canonical example. 10BASE-T encodes bits as ±2.5V differential voltage. 100BASE-TX uses MLT-3 encoding to fit 100 Mbps onto Cat-5 cable. The physical layer doesn't know what the bits mean — it just clocks them in and out.

**What changes at Layer 1 without touching anything above:** copper to fibre upgrades, Wi-Fi bands, serial vs. parallel transmission. A TCP connection crossing a fibre cut failover doesn't know the physical medium changed underneath it.

### Layer 2 — Data Link

The data link layer turns a raw bit stream into **frames** — delimited chunks with a header and trailer — and handles delivery within a single network segment. It introduces the concept of addressing within that segment: MAC addresses.

Ethernet (IEEE 802.3, 1983) is the defining example. An Ethernet frame has:
- 6-byte destination MAC
- 6-byte source MAC
- 2-byte EtherType (what Layer 3 protocol is inside)
- 46–1500 byte payload
- 4-byte CRC checksum

The data link layer also handles collision detection (CSMA/CD in classic Ethernet) or contention management. Switches operate at Layer 2: they read MAC addresses, build a forwarding table, and deliver frames to the right port — but they know nothing about IP.

### Layer 3 — Network

The network layer introduces **logical addressing** and **routing across multiple network segments**. Where Layer 2 delivers within a segment using MAC addresses, Layer 3 delivers across an arbitrary number of hops using IP addresses.

IP (Internet Protocol, RFC 791, 1981) is the universal Layer 3 protocol. An IP packet contains a source and destination IP address. Routers at Layer 3 read only the IP header, look up the destination in a routing table, and forward the packet toward its destination — one hop at a time. Neither the source nor the router know the full path; each router makes an independent local decision.

This is the architectural insight behind the internet's scalability: no single node needs a global view. BGP (Border Gateway Protocol) propagates reachability information between autonomous systems so every router can make locally-informed forwarding decisions.

### Layer 4 — Transport

The network layer delivers packets on a best-effort basis: they can be lost, reordered, or duplicated. The transport layer adds **end-to-end guarantees**.

**TCP** (RFC 793, 1981) provides:
- Reliable delivery via acknowledgements and retransmission
- Ordered delivery via sequence numbers
- Flow control via receive window advertisements
- Congestion control via algorithms (Reno, CUBIC, BBR)

**UDP** provides none of these — it's a thin wrapper around IP that adds only source/destination port and a checksum. Applications that need speed over reliability (DNS lookups, video streaming, gaming) use UDP and implement whatever reliability they need at the application layer.

**QUIC** (RFC 9000, 2021) is the modern Layer 4 entrant: it multiplexes streams over UDP, bakes in TLS 1.3, and eliminates TCP's head-of-line blocking problem. HTTP/3 runs over QUIC.

The transport layer is also where **ports** live. Ports are not addresses — they are demultiplexing identifiers. An IP address gets a packet to a machine; a port gets it to the right process on that machine.

### Layer 5 — Session

The session layer manages **the lifecycle of a conversation** between applications: opening, checkpointing, and closing sessions. In practice, most of what OSI envisioned at Layer 5 got absorbed into Layer 4 (TCP connections) or Layer 7 (HTTP sessions, cookies).

NFS (Network File System) uses RPC sessions that survive transient network interruptions — the session layer concept in action. But for most engineers today, Layer 5 is the "this is fine" layer: TCP handles connection state at L4, and HTTP handles application sessions at L7.

### Layer 6 — Presentation

The presentation layer handles **data representation**: encoding, serialisation, encryption, and compression. The idea is that two machines with different byte orders or character encodings need a common representation layer before data can be meaningfully exchanged.

In practice, this layer is mostly dissolved into application protocols. TLS sits here conceptually — it encrypts the byte stream before it reaches Layer 7 — but TLS itself is defined as sitting between L4 and L7. JSON, Protocol Buffers, and ASN.1 are presentation-layer concerns handled at the application layer.

### Layer 7 — Application

The application layer is where the **meaning of data** is defined — the protocol spoken between two peer applications. HTTP, SMTP, DNS, FTP, SSH are all Layer 7 protocols. They define message formats, verbs, status codes, and the semantics of a request/response exchange.

Layer 7 is the highest-value layer for software engineers: it's where business logic begins. It's also where the most powerful (and expensive) network infrastructure operates.

## Where Engineers Use This Daily: L3/L4 vs L7 Infrastructure

OSI's practical value for engineers shows up most clearly when choosing or configuring network infrastructure. The layer at which a device or service operates determines what it can see, what it can act on, and what it costs.

### Firewalls

A **Layer 3/4 firewall** (also called a stateful firewall or packet filter) makes decisions based on:
- Source/destination IP address (L3)
- Source/destination port (L4)
- Protocol (TCP/UDP/ICMP)
- Connection state (new/established/related)

It cannot read HTTP headers, inspect TLS certificates, or block specific URL paths. It is fast because the decision is made from a small fixed-size header.

A **Layer 7 firewall** (Web Application Firewall, or WAF) terminates the TLS connection, decodes the HTTP request, and applies rules against the full application payload: block requests with `UNION SELECT` in the query string, reject payloads over 1 MB, rate-limit by authenticated user ID. AWS WAF, Cloudflare, and Fastly operate here.

The trade-off is CPU and latency: L7 inspection is 10–100× more expensive per connection than L3/L4 filtering.

### Load Balancers

| Layer | AWS Product | What it sees | What it can do |
|-------|-------------|--------------|----------------|
| L4 | NLB (Network Load Balancer) | IP + TCP/UDP port | Route by port, preserve source IP, TLS passthrough |
| L7 | ALB (Application Load Balancer) | HTTP headers, URL path, host header, cookies | Route by path (`/api/*` → service A), sticky sessions, header rewriting |

An NLB routes a TCP connection without reading its contents — it doesn't know if it's HTTP/1.1 or gRPC. This makes it extremely fast (millions of connections per second) and transparent. An ALB must parse HTTP before routing, which enables content-based routing but adds latency and requires TLS termination.

Choosing between them is a direct application of OSI framing: what layer does my routing decision live at?

### Kubernetes and Service Meshes

`Service` of type `ClusterIP` or `NodePort` is L4: it routes by port to a pod. An `Ingress` resource (or an Ingress controller like NGINX, Traefik) is L7: it routes by HTTP host and path. Istio and Envoy operate at L7, enabling circuit breaking, retry logic, and mutual TLS between services — all things that require reading the application-layer payload.

## Why TCP/IP "Won" but OSI's Vocabulary Didn't Lose

OSI never shipped as a complete interoperable stack. The IETF's TCP/IP suite — built incrementally from real running code — won the commercial internet. RFC 1122 (1989) explicitly mapped TCP/IP to OSI layers precisely to demonstrate compatibility.

The TCP/IP model collapses OSI's seven layers into four:

| TCP/IP layer | OSI equivalent |
|---|---|
| Application | L5 + L6 + L7 |
| Transport | L4 |
| Internet | L3 |
| Link | L1 + L2 |

TCP/IP is simpler and maps to what actually shipped. But its four-layer model loses resolution when you need to describe *where* in the stack something happens. Engineers say "this firewall operates at Layer 7" because the TCP/IP model has no precise equivalent term. OSI's vocabulary won because precision is useful even when the full implementation didn't follow.

## Where the OSI Model Falls Short

- **Session and presentation layers are mostly vestigial** — modern protocols absorbed their concerns into L4 or L7
- **The model was designed before the internet scaled** — BGP, NAT, and CDNs don't fit cleanly into any single layer
- **TLS sits ambiguously between L4 and L7** — it's above TCP but below HTTP, which OSI's strict layering didn't anticipate
- **QUIC violates the separation** — it bundles L4 transport and L6/L7 encryption into a single protocol, optimising for performance over architectural purity

## Summary

The OSI model solved a real coordination problem: it gave the industry a shared vocabulary for decomposing network communication into independent, swappable concerns. Its seven-layer framework persists not because it shipped as specified, but because the mental model is genuinely useful. Every time you distinguish a Layer 4 load balancer from a Layer 7 one, write a firewall rule based on port vs. HTTP path, or ask "where in the stack does this belong?", you are using OSI framing. The implementation lost; the abstraction won.
