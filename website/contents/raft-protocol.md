---
title: "Raft Protocol"
date: "2026-04-10"
summary: "How Raft achieves distributed consensus with leader election and log replication, making it the readable alternative to Paxos."
tags: ["System Design", "Distributed Systems", "Consensus"]
properties:
  - label: "Category"
    value: "Consensus Algorithm"
  - label: "CAP"
    value: "CP (Consistent & Partition-tolerant)"
  - label: "Use Case"
    value: "Leader election, replicated logs"
  - label: "Complexity"
    value: "Medium"
  - label: "Notable Uses"
    value: "etcd, CockroachDB, TiKV"
notes: "Raft was designed to be more understandable than Paxos. It decomposes consensus into three sub-problems — leader election, log replication, and safety — and solves each separately."
related:
  - "Leader Election"
  - "Log Replication"
  - "Split-Brain Problem"
  - "Quorum"
  - "Paxos"
  - "Gossip Protocol"
---

# Raft Protocol

Raft is a consensus algorithm designed to be understandable. It achieves the same guarantees as Paxos but is structured to make it easier to reason about and implement correctly.

## The Core Problem

In a distributed system, multiple nodes need to agree on a sequence of values (a log) even when some nodes fail or the network partitions. This is the consensus problem.

The naive approach — just pick a leader and have it decide everything — breaks when that leader fails. You need a protocol that:
1. Elects a new leader automatically
2. Ensures all committed entries are preserved
3. Guarantees no two leaders exist simultaneously for the same term

## How Raft Works

Raft decomposes consensus into three sub-problems:

### Leader Election

All nodes start as **followers**. A follower that doesn't hear from a leader within a random timeout becomes a **candidate** and starts an election:

1. Candidate increments its **term** (a logical clock) and votes for itself
2. It sends `RequestVote` RPCs to all other nodes
3. A node grants a vote only if the candidate's log is at least as up-to-date as its own
4. The candidate becomes **leader** if it receives votes from a majority

The randomised timeout prevents split votes: nodes don't all call elections at the same time.

### Log Replication

Once elected, the leader:
1. Accepts client requests and appends them to its local log
2. Sends `AppendEntries` RPCs to all followers in parallel
3. Marks an entry **committed** once a majority of nodes have written it
4. Notifies followers, who apply it to their state machines

A crucial invariant: **if an entry is committed, it will appear in the log of any future leader**.

### Safety

Raft enforces two properties:

- **Election Safety**: at most one leader per term (guaranteed by majority quorums)
- **Log Matching**: if two logs contain an entry with the same index and term, all preceding entries are identical

The `AppendEntries` consistency check enforces Log Matching on every replication RPC.

## Leader Election Deep Dive

```
Node A  ──[Follower]── timeout ──[Candidate]── majority votes ──[Leader]
Node B  ──[Follower]──────────────────────────────────────────[Follower]
Node C  ──[Follower]──────────────────────────────────────────[Follower]
```

A candidate that doesn't win (split vote or slow network) simply waits for another random timeout and retries with term + 1.

## Why Randomised Timeouts?

If all nodes had the same timeout, they'd all start elections simultaneously and constantly split votes. Random timeouts in the range [150ms, 300ms] make it very likely that one node fires first and wins before others even start.

## Membership Changes

Adding or removing nodes from the cluster mid-operation is dangerous — you could temporarily have two independent majorities. Raft handles this with **joint consensus**: a transitional configuration that requires majorities from both old and new configurations before switching.

## Raft vs Paxos

| Dimension | Raft | Paxos |
|-----------|------|-------|
| Leader model | Strong single leader | Multi-Paxos uses a leader too |
| Understandability | Explicit goal | Notoriously hard |
| Log gaps | Not allowed | Allowed |
| Membership change | Joint consensus | Varies |
| Adoption | etcd, CockroachDB | Chubby (Google) |

## When to Use Raft

Use Raft (or a library built on it like etcd/Raft) when you need:
- Replicated state machines (key-value store, config management)
- Distributed locking
- Cluster coordination (leader for a worker pool)

Don't reach for Raft when eventual consistency is acceptable — a simpler gossip protocol or a CRDT will be faster and need no leader.
