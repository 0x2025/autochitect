---
title: "Autochitect: Use AI Agent for scanning your Architecture"
date: "2026-03-16"
summary: "Intro to Autochitect, my experiment to use AI agents for keeping an eye on your code and finding architectural issues."
tags: ["AI", "Architecture", "Autochitect", "Agentic"]
---

# Autochitect: Use AI Agent for scanning your Architecture

Architecture scanning is not something you do only one time. For a lead or architect, they need to keep an eye on architecture as their daily basis. Setting the constraints, boundaries, and security, and also foreseeing the NFR. But when projects grow, it is very hard to see everything.

This is why I made **Autochitect**. It is an agent that continuously keeps an eye out to find issues as soon as possible. LLMs are a lot better in reasoning now, so this task becomes possible.

## Why we need it?

Before, keeping an eye on architecture was very manual and slow. We might check only once a month. But now with an Agent, it can check every day. 

Autochitect can reason about how your code is talking to each other. It checks if you follow the boundaries or not. It is like an agent that helps you find drift in architecture before it becomes too big.

## How we managed memory and knowledge

We cannot put all code in an LLM because the context is limited. So Autochitect manages it like this:

1.  **Symbol Graph Compression**: We don't send the RAW source code. We reduce it to a minified "Symbol Graph". This topology map only keeps modules, interfaces, and dependencies. It saves a lot of context and helps the agent see the big picture.
2.  **Summarized Context (Flash Memory)**: Instead of long history, the agent only receives relevant goal, current file context, and a summarized list of "Lessons Learned" from previous steps. This prevents "context bloat" and keeps the reasoning sharp.
3.  **Lesson Store**: This is our long-term memory. When a human gives feedback (like "this is a false positive"), we save it as a "Lesson" in a vector store. Next time the agent scans, it retrieves these lessons to not make the same mistake.
4.  **LangGraph Persistence**: LLMs are **stateless**—they forget everything after one request. We use LangGraph to manage the agentic state across the workflow. This ensures the agent remembers what it found in early stages when it reaches the final analysis.

## Disclaimer

This is just my experiment to learn agentic systems. It is still new and learning. It gets a lot better when I give more feedback.

Please give it a try with your **public repo**. See what it finds in your architecture! Your feedback helps the "Learning Loop" to make the agent smarter.

## What's next?

The AI world is moving very fast. You should discover these projects too:
- **Gitnexus**: Helping developers work better with AI.
- **@randomlabs/slate**: New way for seeing and playing with complex systems.

---
*I will keep updating Autochitect. Thank you for following me!*
