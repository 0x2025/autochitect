export interface TopicEntry {
  id: string;
  label: string;
  articleSlug?: string;
}

export interface TopicGroup {
  id: string;
  icon: string;
  label: string;
  entries: TopicEntry[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    id: 'network',
    icon: '⬡',
    label: 'Networking',
    entries: [
      { id: 'tcp-ip', label: 'TCP/IP 4-Layer', articleSlug: 'tcp-ip-4-layer' },
      { id: 'sockets', label: 'Sockets', articleSlug: 'sockets' },
      { id: 'http2', label: 'HTTP/2 & HTTP/3' },
    ],
  },
  {
    id: 'system-design',
    icon: '◈',
    label: 'System Design',
    entries: [
      { id: 'backpressure', label: 'Backpressure', articleSlug: 'backpressure' },
      { id: 'raft', label: 'Raft Protocol', articleSlug: 'raft-protocol' },
      { id: 'gossip-protocol', label: 'Gossip Protocol', articleSlug: 'gossip-protocol' },
      { id: 'leader-election', label: 'Leader Election' },
      { id: 'replication', label: 'Replication' },
      { id: 'storage-durability', label: 'Storage Durability' },
    ],
  },
  {
    id: 'ai-agents',
    icon: '◎',
    label: 'AI & Agents',
    entries: [
      { id: 'agentic-arch', label: 'Agentic Architecture', articleSlug: 'autochitect-autonomous-architecture' },
      { id: 'context-mgmt', label: 'Context Management' },
      { id: 'llm-tooling', label: 'LLM Tooling' },
    ],
  },
  {
    id: 'arch-patterns',
    icon: '◇',
    label: 'Architecture Patterns',
    entries: [
      { id: 'microservices', label: 'Microservices' },
      { id: 'event-driven', label: 'Event-Driven' },
      { id: 'cqrs', label: 'CQRS' },
      { id: 'saga', label: 'Saga Pattern' },
    ],
  },
];
