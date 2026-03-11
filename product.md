# Product Requirements Document (PRD): Autochitect

## 1. Overview
Autochitect is an Agentic AI system designed to analyze the architecture and system design of a given Git repository. Users connect their GitHub account, select a repository, and the Autochitect Agent asynchronously evaluates the codebase to provide actionable insights. The Agent identifies structural patterns, cross-references them with industry best practices for the detected frameworks, spots common mistakes, and suggests architectural improvements.

## 2. Market Analysis & Competitions

### Market Need
Software complexity is rapidly increasing. Engineering teams often struggle with architectural drift, technical debt, and the heavy cognitive load required to onboard developers onto complex, sprawling codebases. There is a strong, growing demand for automated tools that can review and critique high-level system design, not just line-level code anomalies (which traditional SAST or linters handle).

### Competitions
*   **Traditional Static Analysis (SonarQube, Snyk):** Focus heavily on code-level bugs, security vulnerabilities, and standard syntax linting rather than providing high-level architectural insight.
*   **AI Coding Assistants (GitHub Copilot, Cursor):** Excellent for writing, completing, and explaining localized code, but often lack a holistic, repo-wide architectural analysis workflow that runs asynchronously.
*   **Specialized Architecture Tools (Swimm, CodeScene):** Focus on code documentation and behavioral analysis based on Git history, but lack deep, reasoning-based architectural critique powered by LLMs.
*   **Emerging AI Agents (e.g., Qodo, Sweep, Devin):** Some overlap in capabilities, but a tool focusing purely on *architectural analysis and system design coaching* tailored specifically to the framework level represents a distinct, high-value niche.

## 3. Feasibility
*   **Technical:** Highly feasible. Modern LLMs feature massive context windows capable of ingesting whole codebases, file trees, and high-level project structures.
*   **Extensibility:** The workflow is designed to be highly extensible. By separating the analysis engine from the central "knowledge base" (rules, common anti-patterns for specific frameworks), we can continually add and enrich definitions for new languages, libraries, and architectures over time.
*   **Challenges:** 
    *   Handling enormous monolithic repositories (requires smart chunking, embeddings, or dependency graph extraction before LLM ingestion).
    *   Mitigating LLM hallucinations on complex, custom internal frameworks.
    *   Managing rate limits and API costs for GitHub and LLM providers during deep analyses.

## 4. Monetization Plan
*   **Freemium SaaS Model:** 
    *   *Free Tier:* 1-2 repository analyses per month, limited to public repositories or small codebases. Excellent for open-source projects and creating product-led growth (PLG) loops.
    *   *Pro Tier:* Monthly subscription ($30-$50/seat/mo) for private repositories, deep custom framework analysis, faster processing queues, and more detailed reports.
    *   *Team/Enterprise Tier:* Custom pricing for large organizations requiring SSO, custom internal architectural rule sets, and unlimited repository scans.
*   **Pay-per-Analysis (Consultant model):** A usage-based or credit model where users can purchase one-off deep scans for specific repositories, highly attractive for freelance software architects and agencies conducting tech due diligence.

## 5. 1-Page Marketing Plan
*   **Value Proposition:** "Autochitect.com: Your AI Software Architect. Catch architectural drift before it becomes technical debt."
*   **Target Segments:** 
    1.  Startups scaling their engineering teams rapidly.
    2.  Software development agencies conducting codebase audits for new clients.
    3.  Tech leads inheriting legacy codebases.
*   **Acquisition Channels:** 
    *   *Content Marketing / SEO:* Publish case studies showing "Before and After" architectural fixes. Write deep-dive articles on common framework mistakes (e.g., "5 Next.js App Router Anti-Patterns Found in 100 Repos") featuring the Agent.
    *   *GitHub Marketplace:* Launch as a GitHub App to capture high-intent users looking for repository integrations.
    *   *Developer Communities (X, Reddit, HackerNews):* Launch targeted at the developer community, focusing heavily on visualizing the system structures the agent generates.
*   **Activation Strategy:** Frictionless GitHub OAuth -> 1-click repository selection -> User receives a stunning, actionable architectural report via email within minutes.

## 6. Persona Mapping

*   **Persona 1: The Frustrated Tech Lead (Alex)**
    *   *Role:* Leads a team of 5-10 developers.
    *   *Pain Point:* Developers are copy-pasting code without understanding the overarching architecture. Code reviews miss structural issues because reviewers only look at the unified diff, not the big picture.
    *   *Use Case:* Runs the Agent weekly or bi-weekly to ensure no overarching architectural boundaries are being violated by recent merges.
*   **Persona 2: The Freelance Architect / Consultant (Jamie)**
    *   *Role:* Hired to modernize or audit existing software.
    *   *Pain Point:* Inherits messy, undocumented legacy codebases from clients and needs to quickly understand the current state to propose a modernization roadmap.
    *   *Use Case:* Runs the Agent on Day 1 of a new contract to instantly generate a system map, technology breakdown, and a prioritized list of structural red flags to present to the client.

## 7. Use Cases
1.  **Initial Codebase Audit & Dev Onboarding:** Automatically understand the structure, core dependencies, and routing patterns of a new codebase without manually parsing thousands of files.
2.  **Pre-Refactor Sanity Check:** Before undertaking a massive refactor, a team asks the Agent to highlight tight couplings, circular dependencies, or deprecated framework usages that need addressing first.
3.  **Human-in-the-Loop Consulting:** The Agent does the heavy lifting of code analysis. A human expert (the human-in-the-loop) reviews the AI's findings, verifies the flagged anti-patterns, and finalizes the customized report to be delivered to the end-user (Optionally completely automated).
4.  **Learning and Mentorship:** Junior and mid-level developers review the Agent's specific architectural recommendations to learn *why* certain structural choices (e.g., Dependency Injection, Hexagonal Architecture) are preferred for their specific tech stack.

## 8. Implementation Plan & Work Breakdown

### Phase 1: Core Engine MVP (The Foundation)
- [ ] Implement GitHub OAuth and Repository selection UI.
- [ ] Build the Repo Ingestion worker (clone repo, map file tree, detect language/framework signatures).
- [ ] Develop the Stage 1 Analyzer: Extract high-level structure, modules, and package topology.
- [ ] Integrate a basic LLM prompt chain to evaluate the structure against general best practices.
- [ ] Build the Report UI to display findings to the user.

### Phase 2: Extensible Knowledge Base & Human-in-the-Loop
- [ ] Develop the Extensible Knowledge Structure (allow the system to dynamically load "Rules" and "Common Mistakes" based on the detected framework, e.g., React vs Django).
- [ ] Refine the LLM Workflow into discrete stages:
    1. Structure & Language Identification.
    2. Contextualization against Knowledge Base.
    3. Module-by-Module Critique.
- [ ] Build the Human-in-the-Loop (HITL) admin dashboard: Allow internal reviewers to verify, edit, or reject the AI's analysis before the report is finalized and dispatched to the user.

### Phase 3: Advanced Polish & Integrations
- [ ] Integrate Graphing tools (e.g., generate Mermaid.js diagrams of the detected architecture).
- [ ] Implement feedback loops: Allow users to rate the accuracy of findings to train the Knowledge Base.
- [ ] Export features (PDF reports, automatic Jira ticket creation for tech debt).
- [ ] Monetization layer (Stripe integration for Pro/Enterprise tiers).
