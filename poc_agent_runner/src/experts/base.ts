import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createLLM } from "../models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as path from "path";
import * as fs from "fs";
import { BaseMessage } from "@langchain/core/messages";
import { AgentState, getRegistry, getLessons, getModelForTask, Lesson, TokenUsage } from "../config";
import { createFileSystemTools } from "../tools";
import { z } from "zod";

/**
 * Loads a prompt from a Markdown file and replaces placeholders.
 */
function loadPrompt(promptName: string, variables: Record<string, string>): string {
    const promptPath = path.join(__dirname, "prompts", `${promptName}.md`);
    if (!fs.existsSync(promptPath)) {
        console.warn(`Prompt file not found: ${promptPath}. Returning empty string.`);
        return "";
    }
    let content = fs.readFileSync(promptPath, "utf-8");
    for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return content;
}

/**
 * Schema for the synthesized Architectural Report.
 */
const ReportSchema = z.object({
    health: z.enum(["POOR", "FAIR", "GOOD"]).describe("Overall architectural health verdict."),
    summary: z.string().describe("High-level executive summary of the architecture and findings."),
    diagrams: z.object({
        c1: z.string().describe("Mermaid C4 System Context diagram."),
        c2: z.string().describe("Mermaid C4 Container diagram."),
        c3: z.string().describe("Mermaid C4 Component diagram.")
    }).describe("C4 Model diagrams in Mermaid format."),
    findings: z.array(z.object({
        id: z.string().describe("Unique identifier for the finding (e.g., finding_1)."),
        criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).describe("Severity of the issue."),
        title: z.string().describe("Short, descriptive title."),
        description: z.string().describe("Detailed explanation of the observation."),
        impact: z.string().describe("Potential consequences for the system."),
        files: z.array(z.string()).describe("List of relative file paths associated with this finding."),
        recommendation: z.string().describe("Actionable advice to resolve the issue."),
        evidenceCode: z.string().optional().describe("Snippet of code where the issue was found, including 4 lines above and 1 line below for context.")
    })).describe("List of specific architectural and security findings."),
    discoveredLanguages: z.array(z.string()).optional().describe("Languages detected in the codebase."),
    repoUrl: z.string().optional().describe("Source repository URL used to generate this report.")
});

/**
 * Unified Architect Expert Execution Logic.
 * Handles both Specialist deep-dives and Lead Architect synthesis with grounded verification.
 */
export async function executeArchitectExpert(
    expertId: string,
    state: typeof AgentState.State,
    type: "SPECIALIST" | "LEAD"
): Promise<any> {
    const registry = getRegistry();
    const blueprint = registry.find(b => b.expert_id === expertId) || {
        expert_id: expertId,
        expert_prompt_ref: "Architectural Expert",
        grounding: { extensions: [] }
    } as any;

    const tools = createFileSystemTools(state.localPath);
    const llm = createLLM(type === "LEAD" ? "HIGH" : "LOW", {
        provider: state.provider as any,
        model: state.model
    });

    console.log(`[Knowledge Moat] Semantically matching institutional lessons...`);

    const { lessons: relevantLessons, usage: lessonUsage } = await retrieveRelevantLessons(state.discoveryResult, state);
    const lessonPrompt = relevantLessons.map(l =>
        `Institutional Lesson: ${l.pattern}\nRationale: ${l.rationale}\nVerdict: ${l.human_verdict}`
    ).join("\n\n");

    let basePrompt = `Expert Profile: ${blueprint.expert_prompt_ref}\n\n`;

    if (type === "LEAD") {
        const combinedReports = state.expertReports.join("\n\n");
        basePrompt += loadPrompt("lead_architect", {
            expertReports: combinedReports,
            discoveryResult: state.discoveryResult,
            lessonPrompt: lessonPrompt || "No specific historical anti-patterns found."
        });

        const structuredLlm = llm.withStructuredOutput(ReportSchema, { includeRaw: true });
        console.log(`\n[Node: ${expertId}] Synthesizing Final Structured Report...`);

        const result = await structuredLlm.invoke(basePrompt);
        const usage = (result.raw as any).usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

        return {
            ...result.parsed,
            discoveredLanguages: state.discoveredLanguages,
            usage
        };
    }

    const architectAgent = createReactAgent({ llm, tools });

    basePrompt += loadPrompt("specialist_architect", {
        discoveryResult: state.discoveryResult,
        lessonPrompt: lessonPrompt || "No specific historical anti-patterns found."
    });

    const systemInstruction = new SystemMessage(`You are an elite architectural specialist. Your responsibility is to ensure the output is accurate, grounded in actual code, and follows the C4 hierarchy.`);

    console.log(`\n[Node: ${expertId}] Initiating Deep Dive...`);
    const runResult = await architectAgent.invoke({
        messages: [systemInstruction, new HumanMessage(basePrompt)]
    });

    const message = runResult.messages[runResult.messages.length - 1] as any;
    const output = extractMessageContent(message);
    const usage = message.usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    // Expert Grounding
    const extensions = blueprint.grounding?.extensions || [];
    const grounding = validateEvidence(output, state.localPath, extensions);
    if (!grounding.isValid) {
        console.log(`[Node: ${expertId}] Grounding failure detected: ${grounding.error}`);
        return { 
            report: `[${expertId}] Audit aborted due to evidence hallucination: ${grounding.error}`,
            usage 
        };
    }

    return { report: output, usage };
}

/**
 * Robustly extract string content from a LangChain message.
 * Handles string content, array of content blocks, and other edge cases.
 */
export function extractMessageContent(message: any): string {
    if (!message) return "";

    const content = typeof message === 'string' ? message : (message as BaseMessage).content;

    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((block: any) => {
                if (typeof block === 'string') return block;
                if (block?.type === 'text' && typeof block.text === 'string') return block.text;
                return "";
            })
            .join("");
    }

    return String(content || "");
}

async function retrieveRelevantLessons(discoveryResult: string, state: typeof AgentState.State): Promise<{ lessons: Lesson[], usage: TokenUsage }> {
    const filteredLessons = getLessons(state.repoUrl);
    if (filteredLessons.length === 0) return { lessons: [], usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };

    const llm = createLLM("LOW", {
        provider: state.provider as any,
        model: state.model
    });

    console.log(`[Knowledge Moat] Semantically matching institutional lessons...`);

    const lessonSelectionSchema = z.object({
        selected_patterns: z.array(z.string()).describe("List of lesson patterns that are contextually relevant to the discovery report.")
    });

    const contextSummary = `====== ARCHITECTURAL LESSONS MOAT ======
${filteredLessons.map(l => `- ${l.pattern}: ${l.rationale} (Verdict: ${l.human_verdict})`).join("\n")}
========================================

====== codebase Discovery Report ======
Languages Found: ${state.discoveredLanguages.join(", ")}
${discoveryResult}
========================================`;

    const prompt = loadPrompt("lesson_selection", {
        contextSummary: contextSummary
    });

    try {
        const extractionLlm = llm.withStructuredOutput(lessonSelectionSchema, { includeRaw: true });
        const result = await extractionLlm.invoke(prompt);
        const usage = (result.raw as any).usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

        return {
            lessons: filteredLessons.filter(l => result.parsed.selected_patterns.includes(l.pattern)),
            usage
        };
    } catch (e) {
        console.warn(`[Knowledge Moat] Semantic retrieval failed, falling back to keyword matching: ${e}`);
        // Fallback to simple keyword matching if LLM fails
        return {
            lessons: filteredLessons.filter(lesson =>
                lesson.pattern.split(' ').some(word => discoveryResult.toLowerCase().includes(word.toLowerCase()))
            ).slice(0, 3),
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
        };
    }
}

function validateEvidence(report: any, localPath: string, extensions: string[]): { isValid: boolean; error?: string } {
    if (typeof report !== 'string') {
        console.warn("[Grounding] Report is not a string, skipping regex matching.");
        return { isValid: true };
    }
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

