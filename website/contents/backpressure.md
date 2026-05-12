---
title: "Backpressure"
date: "2026-04-20"
summary: "How producers and consumers negotiate throughput so that a fast upstream never overwhelms a slow downstream."
tags: ["System Design", "Streaming", "Resilience"]
properties:
  - label: "Category"
    value: "Flow Control Pattern"
  - label: "Problem"
    value: "Producer faster than consumer"
  - label: "Scope"
    value: "Queues, streams, async pipelines"
  - label: "Risk without it"
    value: "OOM, cascade failure"
  - label: "Found in"
    value: "Reactive Streams, TCP, Kafka"
notes: "Backpressure is the single most important resilience mechanism in any streaming system. Without it, a spike in producers will eventually exhaust memory and crash the consumer."
related:
  - "Rate Limiting"
  - "Circuit Breaker"
  - "Reactive Streams (Project Reactor)"
  - "Queue Depth Monitoring"
  - "TCP Sliding Window"
---

# Backpressure

Backpressure is how a downstream consumer signals to an upstream producer to slow down. Without it, a fast producer will keep pushing data until the consumer's buffer overflows and the process crashes.

## The Problem

Imagine a pipeline: **Producer → Queue → Consumer**.

The producer emits 10,000 events/sec. The consumer processes 1,000 events/sec. Without any mechanism to slow the producer, the queue grows unboundedly until memory is exhausted.

This pattern appears everywhere:
- HTTP request handler that's slower than the load balancer routes requests
- Kafka consumer lag growing without bound
- A database connection pool that's smaller than the number of concurrent threads trying to use it

## Three Strategies

### 1. Buffer (absorb spikes, then drain)

Add a bounded buffer between producer and consumer. When the buffer is full, apply one of the strategies below. This smooths short-lived bursts but doesn't solve sustained overload.

```
Producer ──[emit]──▶ [bounded buffer N] ──[pull]──▶ Consumer
                           │
                     full? → apply strategy
```

### 2. Drop (shed load)

When the buffer is full, drop new messages. This is appropriate when:
- Messages are time-sensitive (stale data is useless anyway)
- Losing a small fraction is acceptable (metrics, logs)

Never drop for financial transactions or state-changing commands.

### 3. Block / Slow Producer (true backpressure)

Signal the producer to pause. This is the purest form of backpressure:
- Producer calls `send()` — it blocks until the consumer has capacity
- Or: consumer sends an explicit `request(n)` demand signal upstream

**Reactive Streams** (used by Project Reactor, RxJava, Akka Streams) standardises this: a `Subscriber` calls `request(n)` to pull at most `n` items. The `Publisher` never emits more than requested.

```java
// Reactor example
Flux.range(1, 1_000_000)
    .onBackpressureBuffer(1000)   // bounded buffer
    .publishOn(Schedulers.boundedElastic())
    .subscribe(item -> process(item));
```

## TCP Is a Perfect Model

TCP's **sliding window** is backpressure built into the protocol:
- Receiver advertises a **receive window** (how many bytes it can accept)
- Sender never sends more than the window size
- As the receiver drains its buffer, it advertises a larger window

This is why a slow receiver naturally slows a fast sender without any application-level code.

## Backpressure in Kafka

Kafka consumers pull messages at their own pace — the broker never pushes. This is inherent pull-based backpressure:

- If a consumer is slow, it simply doesn't fetch the next batch
- **Consumer lag** (the gap between latest offset and committed offset) is your signal
- Alert on lag growth; it means your consumer can't keep up

The risk: unbounded lag means you need to keep messages on disk longer. Set retention policies accordingly.

## Monitoring Signals

| Metric | Meaning |
|--------|---------|
| Queue depth | Buffer fill level; rising = consumer falling behind |
| Consumer lag (Kafka) | How far behind the consumer is |
| Dropped messages | Load-shedding is happening |
| P99 processing latency | Consumer is slowing down |
| Producer block time | Producer is waiting for capacity |

## Common Mistakes

**Unbounded queues** — `new LinkedBlockingQueue<>()` in Java has no limit. Under load, it accepts messages until the JVM runs out of heap. Always bound your queues.

**Swallowing backpressure** — wrapping a blocking call in a new thread per request doesn't solve overload; it just moves the OOM from the queue to the thread pool.

**Ignoring lag** — a Kafka consumer that's always 10 seconds behind isn't "fine"; it means you're running hot and one traffic spike will cause you to fall hours behind.
