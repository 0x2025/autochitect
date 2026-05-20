import type { ComponentType } from "react";

// Each entry is a lazy import — Next.js will split these into separate chunks
const registry: Record<string, () => Promise<{ default: ComponentType }>> = {
  "osi-model": () => import("./osi-model"),
  "tcp-ip-4-layer": () => import("./tcp-ip-4-layer"),
  "raft-protocol": () => import("./raft-protocol"),
  "backpressure": () => import("./backpressure"),
  "gossip-protocol": () => import("./gossip-protocol"),
  "autochitect-autonomous-architecture": () => import("./autochitect-autonomous-architecture"),
  "sockets": () => import("./sockets"),
};

export function hasContent(slug: string): boolean {
  return slug in registry;
}

export function getContentLoader(slug: string): (() => Promise<{ default: ComponentType }>) | null {
  return registry[slug] ?? null;
}
