import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as path from "path";
import * as fs from "fs";
import { AgentState, getRegistry, getLessons, getModelForTask, Lesson } from "../config";
import { createFileSystemTools } from "../tools";
import { z } from "zod";

/**
 * Unified Architect Expert Execution Logic.
 * Handles both Specialist deep-dives and Lead Architect synthesis with grounded verification.
 */
export async function executeArchitectExpert(
    expertId: string,
    state: typeof AgentState.State,
    type: "SPECIALIST" | "LEAD"
): Promise<string> {
    const registry = getRegistry();
    const blueprint = registry.find(b => b.expert_id === expertId) || {
        expert_id: expertId,
        expert_prompt_ref: "Architectural Expert",
        grounding: { extensions: [] }
    } as any;

    const tools = createFileSystemTools(state.localPath);
    const llm = new ChatGoogleGenerativeAI({
        modelName: getModelForTask("HIGH"),
        temperature: type === "LEAD" ? 0.1 : 0.2
    });

    const lessons = await retrieveRelevantLessons(state.discoveryResult);
    const lessonPrompt = lessons.map(l =>
        `Institutional Lesson: ${l.pattern}\nRationale: ${l.rationale}\nVerdict: ${l.human_verdict}`
    ).join("\n\n");

    const architectAgent = createReactAgent({ llm, tools });

    let basePrompt = `Expert Profile: ${blueprint.expert_prompt_ref}\n\n`;

    if (type === "LEAD") {
        const combinedReports = state.expertReports.join("\n\n");
        basePrompt += `Your goal is to synthesize the final C4 Architectural Report by aggregating findings from all specialist experts. 
You are an [Autonomous Evaluator]. If expert findings are contradictory or lack evidence for critical NFRs, use your tools to perform a final verification of the codebase.

====== EXPERT REPORTS ======
${combinedReports}
============================

====== DISCOVERY CONTEXT ======
${state.discoveryResult}
==============================

====== ARCHITECTURAL POLICIES (MOAT) ======
${lessonPrompt || "No specific historical anti-patterns found."}
=========================================

AUDIT MANDATE:
1. FORMAT: Use the [C4 Model Hierarchy] (L1 System Context, L2 Containers, L3 Components, L4 Code & NFR).
2. EXPERT FIDELITY: You MUST treat the Specialist Expert Reports as the primary source of truth. Do NOT omit any expert's findings unless your own tool-based verification definitively proves them false.
3. NO SUMMARIZATION LOSS: You are prohibited from summarizing away specific vulnerabilities. They MUST appear in your final L4 Code section with exact file paths and evidence.
4. EXHAUSTIVE COVERAGE: Ensure all critical security and NFR findings from specialists are included.
5. VERBATIM POLICIES: When an expert finding matches an "ARCHITECTURAL POLICY (MOAT)", you MUST use the exact policy pattern name (e.g., "untrusted binary sources in Dockerfile") in your verdict.
6. VISUAL ARCHITECTURE: You MUST look for Mermaid C4 diagrams from the MERMAID_EXPERT. Embed these diagrams (C1 System, C2 Container, C3 Component) at the beginning of their respective sections. Ensure they are wrapped in \\\`\\\`\\\`mermaid blocks.
7. CROSS-VERIFICATION: If an expert finding lacks a clear file path, use 'search_codebase' to confirm it yourself.
8. Provide a final overall "Architectural Health" verdict.`;
    } else {
        basePrompt += `Your goal is to perform a [C4 Level 3 & 4] Deep-Dive on specific Containers or Components identified in the Discovery Report.

====== DISCOVERY CONTEXT ======
            ${state.discoveryResult}
==============================

====== ARCHITECTURAL POLICIES (MOAT) ======
${lessonPrompt || "No specific historical anti-patterns found."}
=========================================

AUDIT MANDATE:
1. [L3 - Components]: Use 'get_component_details_ast' to map the internal architectural blocks (Namespaces, Modules) of the assigned path.
2. [L4 - Code & NFR]: Zoom into 2-3 critical files. Analyze the Relationship Triad (Methods, Attributes, Dependencies).
3. NON-FUNCTIONAL FOCUS: Evaluate how the code handles Performance, Scalability, and Concurrency.
4. PATH RESILIENCY: If a path is not found, use 'search_codebase' or 'get_repository_map' to locate it.
5. Cite file paths and provide evidence-based verdicts.

Audit for: Modular Integrity, Decoupling, SOLID, and NFR execution.`;
    }

    const systemInstruction = new SystemMessage(`You are ${type === "LEAD" ? "the Lead Architect" : "an elite architectural specialist"}. Your responsibility is to ensure the output is accurate, grounded in actual code, and follows the C4 hierarchy.`);

    console.log(`\n[Node: ${expertId}] ${type === "LEAD" ? "Synthesizing Final Report" : "Initiating Deep Dive"}...`);
    const runResult = await architectAgent.invoke({
        messages: [systemInstruction, new HumanMessage(basePrompt)]
    });

    const output = runResult.messages[runResult.messages.length - 1].content as string;

    // Expert Grounding
    const extensions = blueprint.grounding?.extensions || [];
    const grounding = validateEvidence(output, state.localPath, extensions);
    if (!grounding.isValid) {
        console.log(`[Node: ${expertId}] Grounding failure detected: ${grounding.error}`);
        if (type === "LEAD") {
            // Lead Architect should try harder or at least report the error gracefully in the analysis result
            return `CRITICAL: Lead Architect Synthesis failed grounding verification: ${grounding.error}. Please check specialist reports directly.`;
        }
        return `[${expertId}] Audit aborted due to evidence hallucination: ${grounding.error}`;
    }

    return output;
}

async function retrieveRelevantLessons(discoveryResult: string): Promise<Lesson[]> {
    const allLessons = getLessons();
    if (allLessons.length === 0) return [];

    const llm = new ChatGoogleGenerativeAI({
        modelName: getModelForTask("LOW"),
        temperature: 0.1
    });

    console.log(`[Knowledge Moat] Semantically matching institutional lessons...`);

    const lessonSelectionSchema = z.object({
        selected_patterns: z.array(z.string()).describe("List of lesson patterns that are contextually relevant to the discovery report.")
    });

    const contextSummary = `====== ARCHITECTURAL LESSONS MOAT ======
${allLessons.map(l => `- ${l.pattern}: ${l.rationale}`).join("\n")}
========================================

====== codebase Discovery Report ======
${discoveryResult}
========================================`;

    const prompt = `You are an Architectural Historian and Policy Enforcer.
Analyze the Discovery Report and select the most relevant "Lessons Learned" from the Moat that must be enforced during an in-depth audit of this codebase.

${contextSummary}

Rules:
1. Select ALL lessons that are highly relevant to the detected technology (e.g., .NET, Docker, React) or architectural patterns (e.g., async, modularity, microservices).
2. PRIORITIZE: Safety and Security lessons (e.g., secret management, untrusted sources) MUST be included if even a slight signal is present in the Discovery Report.
3. LIMIT: Select up to 10 lessons. Do not include irrelevant lessons just to fill the quota.
4. If no clear matches exist, return an empty list.
5. Return only the 'pattern' strings for the selected lessons.`;

    try {
        const extractionLlm = llm.withStructuredOutput(lessonSelectionSchema);
        const result = await extractionLlm.invoke(prompt);

        return allLessons.filter(l => result.selected_patterns.includes(l.pattern));
    } catch (e) {
        console.warn(`[Knowledge Moat] Semantic retrieval failed, falling back to keyword matching: ${e}`);
        // Fallback to simple keyword matching if LLM fails
        return allLessons.filter(lesson =>
            lesson.pattern.split(' ').some(word => discoveryResult.toLowerCase().includes(word.toLowerCase()))
        ).slice(0, 3);
    }
}

function validateEvidence(report: string, localPath: string, extensions: string[]): { isValid: boolean; error?: string } {
    const fileRegex = /([a-zA-Z0-9._\-\/]+\.[a-zA-Z0-9]+)/g;
    const matches = report.match(fileRegex) || [];

    const checkExists = (filePath: string): boolean => {
        const fullPath = path.join(localPath, filePath);
        if (fs.existsSync(fullPath)) return true;

        try {
            const fileName = path.basename(filePath);
            const { execSync } = require("child_process");
            const output = execSync(`find . -name "${fileName}"`, { cwd: localPath, encoding: "utf-8" }).trim();
            return !!output;
        } catch (e) { return false; }
    };

    for (const filePath of matches) {
        if (filePath.startsWith('//') || filePath.startsWith('http')) continue;

        const ext = path.extname(filePath).toLowerCase();
        const isPathLike = (ext && extensions.includes(ext)) || filePath.includes('/');

        if (isPathLike && filePath.length > 5) {
            if (!checkExists(filePath)) {
                if (filePath.startsWith('gemini-') || filePath.match(/^\d+\.\d+/)) continue;
                const strictExts = ['.cs', '.csproj', '.sln', '.java', '.js', '.ts', '.tsx', '.xml', '.yml', '.yaml'];
                if (!filePath.includes('/') && !strictExts.includes(ext)) continue;

                return { isValid: false, error: `Grounding Error: Path not found anywhere in repo: ${filePath}` };
            }
        }
    }
    return { isValid: true };
}

