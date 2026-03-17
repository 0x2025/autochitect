import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { AgentState, getModelForTask, getLessons } from "./config";
import { createLLM } from "./models";
import { createFileSystemTools } from "./tools";
import { executeArchitectExpert, extractMessageContent } from "./experts/base";

// ==========================================
// 1. Discovery Agent Node
// ==========================================
export async function discoveryNode(state: typeof AgentState.State) {
    console.log(`\n[Node: Discovery] Initiating Autonomous File Explorer...`);
    const tools = createFileSystemTools(state.localPath);
    const llm = createLLM("LOW", {
        provider: state.provider as any,
        model: state.model || getModelForTask("LOW"),
        temperature: 0.1
    }) as ChatGoogleGenerativeAI;

    const discoveryAgent = createReactAgent({ llm, tools });
    const prompt = `You are an autonomous C4 Scout (Architectural Discovery Agent). 
Your goal is to map the System Context (L1) and Containers (L2) of this codebase by hunting for "Infrastructure Signals".

1. [L1 - System Context]: Identify the external world.
   - Scan for API Clients, SDKs (AWS, Stripe, etc), and infrastructure config (.env, appsettings.json).
   - Look for IaC (Terraform, Docker Compose) to identify External Systems and Users.
2. [L2 - Containers]: Identify deployable units.
   - Map monorepo boundaries or project file clusters (.csproj, package.json, pom.xml).
   - Identify inter-process communication (HTTPClients, gRPC clients).

Return a report structured by C4 Levels (Context and Containers). List specific files that act as "Architectural Anchors" for Level 3/4 deep-dives. IMPORTANT: Always provide the FULL RELATIVE PATH from the repository root (e.g., 'src/Project/Program.cs' instead of just 'Program.cs').`;

    const result = await discoveryAgent.invoke({
        messages: [new HumanMessage(prompt)]
    });

    const finalAnswer = extractMessageContent(result.messages[result.messages.length - 1]);
    console.log(`\n[Node: Discovery] Autonomous Discovery Complete.`);

    const langExtractionSchema = z.object({
        languages: z.array(z.string()).describe("Primary programming languages or frameworks found (lowercase).")
    });

    const extractionLlm = llm.withStructuredOutput(langExtractionSchema, { includeRaw: true });
    const extracted_raw = await extractionLlm.invoke(`Based on this discovery report, extract the primary languages:\n${finalAnswer}`);
    const extracted = extracted_raw.parsed;

    const usage = extracted_raw.raw.usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    return {
        discoveryResult: finalAnswer,
        discoveredLanguages: extracted.languages || [],
        usage
    };
}

// ==========================================
// 2. Dynamic Expert Node
// ==========================================
export async function expertAgentNode(state: typeof AgentState.State) {
    const expertId = state.activeExpertId || "GENERAL_EXPERT";
    const { report, usage } = await executeArchitectExpert(expertId, state, "SPECIALIST");
    const reportText = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
    return { expertReports: [reportText], usage };
}

// ==========================================
// 3. Auditor (Critic) Node
// ==========================================
export async function criticAgentNode(state: typeof AgentState.State) {
    console.log(`\n[Node: Auditor] Enforcing Architectural Lessons...`);
    const combinedReports = state.expertReports.join("\n\n");
    const llm = createLLM("HIGH", {
        provider: state.provider as any,
        model: state.model || getModelForTask("HIGH"),
        temperature: 0.1
    }) as ChatGoogleGenerativeAI;

    const lessons = getLessons(state.repoUrl).slice(0, 5);
    const lessonPrompt = lessons.map((l: any) =>
        `Institutional Lesson: ${l.pattern}\nRationale: ${l.rationale}\nVerdict: ${l.human_verdict}`
    ).join("\n\n");

    const prompt = `You are the Architectural Auditor (Critic). 
Your job is to cross-reference the Expert Reports against the core architectural goals and team specialized "Lessons Learned".

====== INSTITUTIONAL MEMORY (MOAT) ======
${lessonPrompt || "No specific historical anti-patterns found."}
=========================================

====== EXPERT REPORTS ======
${combinedReports}
============================

AUDIT CRITERIA:
1. Did the experts identify C4 Level 3 (Components) and Level 4 (Code) details?
2. Are Non-Functional Requirements (Performance, Scalability, Modularity) explicitly evaluated?
3. VERIFY LESSONS: Cross-reference the reports against the "INSTITUTIONAL MEMORY" section. If an expert found a match (e.g., secrets in appsettings.json), EXPLICITLY VALIDATE it as a confirmed policy violation.

If any expert missed a critical structural flaw or an NFR requirement, flag it here. 
IDENTIFY CRITICALITY: Any finding related to security or fundamental NFR failure (async/await violations) MUST be marked as CRITICAL.
Otherwise, approve the findings for final synthesis.`;

    const result = await llm.invoke([new HumanMessage(prompt)]);
    const criticReport = extractMessageContent(result);
    const usage = (result as any).usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    return { 
        expertReports: [...state.expertReports, `\n[AUDITOR VERDICT]:\n${criticReport}`],
        usage
    };
}

// ==========================================
// 4. Synthesizer Node
// ==========================================
export async function synthesizeNode(state: typeof AgentState.State) {
    const { usage, ...structuredReport } = await executeArchitectExpert("LEAD_ARCHITECT_EXPERT", state, "LEAD");

    return {
        analysisResult: JSON.stringify(structuredReport, null, 2),
        structuredAnalysisResult: structuredReport,
        usage
    };
}

// ==========================================
// 5. Diagram Validator Subagent Node
// ==========================================
export async function validateDiagramsNode(state: typeof AgentState.State) {
    console.log(`\n[Node: Validator] Validating Generated Mermaid Diagrams...`);
    const llm = createLLM("LOW", {
        provider: state.provider as any,
        model: state.model || getModelForTask("LOW"),
        temperature: 0.1
    }) as ChatGoogleGenerativeAI;

    const tools = createFileSystemTools(state.localPath);
    // Keep only the validate tool for safety, or use all. The registry says validate_mermaid.
    const validatorAgent = createReactAgent({ llm, tools });
    const registry = getRegistry();
    const blueprint = registry.find(b => b.expert_id === "MERMAID_VALIDATOR_EXPERT") || {
        expert_prompt_ref: "You are a Mermaid diagram validator. Fix syntax errors."
    };

    const diagrams = state.structuredAnalysisResult?.diagrams || {};
    const validatedDiagrams: any = {};
    let totalUsage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    for (const [key, diagramCode] of Object.entries(diagrams)) {
        if (!diagramCode) continue;
        console.log(`[Validator] Checking diagram: ${key}...`);
        const prompt = `System Instructions: ${blueprint.expert_prompt_ref}

Here is a C4 Mermaid diagram generated by the Lead Architect. It may contain syntax errors.
Please validate it using the 'validate_mermaid' tool. If it passes, return the exact diagram code.
If it fails, use the error output to fix the syntax (e.g., wrap labels in double quotes, remove trailing commas) and test again until 'validate_mermaid' returns OK.
DO NOT wrap the final output in markdown code blocks like \`\`\`mermaid. Just output the raw mermaid code.

Diagram Code:
${diagramCode}`;

        const runResult = await validatorAgent.invoke({
            messages: [new HumanMessage(prompt)]
        });

        const message = runResult.messages[runResult.messages.length - 1] as any;
        const output = extractMessageContent(message).replace(/^```mermaid\n/, '').replace(/\n```$/, '').trim();
        const usage = message.usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

        totalUsage.input_tokens += usage.input_tokens;
        totalUsage.output_tokens += usage.output_tokens;
        totalUsage.total_tokens += usage.total_tokens;

        validatedDiagrams[key] = output;
        console.log(`[Validator] ${key} validated successfully.`);
    }

    if (state.structuredAnalysisResult) {
        state.structuredAnalysisResult.diagrams = {
            ...state.structuredAnalysisResult.diagrams,
            ...validatedDiagrams
        };
    }

    const newAnalysisResult = JSON.stringify(state.structuredAnalysisResult, null, 2);

    return {
        analysisResult: newAnalysisResult,
        structuredAnalysisResult: state.structuredAnalysisResult,
        usage: {
            input_tokens: (state.usage?.input_tokens || 0) + totalUsage.input_tokens,
            output_tokens: (state.usage?.output_tokens || 0) + totalUsage.output_tokens,
            total_tokens: (state.usage?.total_tokens || 0) + totalUsage.total_tokens
        }
    };
}
