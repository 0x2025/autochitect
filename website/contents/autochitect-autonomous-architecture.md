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
1.  **Symbol Graph Compression**: Change code to a small "Symbol Graph". We only keep modules and interfaces.
2.  **Lesson Store**: This is memory. When I (human) say "this finding is wrong", the agent saves it as a "Lesson". Next time it scans, it will look at these lessons to not make the same mistake.
3.  **Expert Registry**: Different tech like Next.js or Spring Boot needs different knowledge. So we have "Expert Blueprints" to help the agent understand each one.

### The Challenge of Context
LLMs are **stateless**. This is a big challenge. They forget everything after one request. 
To manage this, Autochitect keeps context managed in a "Persistent Contextual Thread". I use LangGraph to manage the state. The agent remembers what it found in the first step when it goes to the next step. So it can see the whole system, not just one file.

## Disclaimer

This is just my experiment to learn agentic systems. It is still new and learning. It gets a lot better when I give more feedback.

Please give it a try with your **public repo**. See what it finds in your architecture! Your feedback helps the "Learning Loop" to make the agent smarter.

## What's next?

The AI world is moving very fast. You should discover these projects too:
- **Gitnexus**: Helping developers work better with AI.
- **@randomlabs/slate**: New way for seeing and playing with complex systems.

---
*I will keep updating Autochitect. Thank you for following me!*
