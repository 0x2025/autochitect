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

    const extractionLlm = llm.withStructuredOutput(langExtractionSchema);
    const extracted = await extractionLlm.invoke(`Based on this discovery report, extract the primary languages:\n${finalAnswer}`);

    return {
        discoveryResult: finalAnswer,
        discoveredLanguages: extracted.languages || []
    };
}

// ==========================================
// 2. Dynamic Expert Node
// ==========================================
export async function expertAgentNode(state: typeof AgentState.State) {
    const expertId = state.activeExpertId || "GENERAL_EXPERT";
    const report = await executeArchitectExpert(expertId, state, "SPECIALIST");
    const reportText = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
    return { expertReports: [reportText] };
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

    const result = await llm.stream([new HumanMessage(prompt)]);
    let criticReport = "";
    for await (const chunk of result) {
        criticReport += extractMessageContent(chunk);
    }

    return { expertReports: [...state.expertReports, `\n[AUDITOR VERDICT]:\n${criticReport}`] };
}

// ==========================================
// 4. Synthesizer Node
// ==========================================
export async function synthesizeNode(state: typeof AgentState.State) {
    const structuredReport = await executeArchitectExpert("LEAD_ARCHITECT_EXPERT", state, "LEAD");

    return {
        analysisResult: JSON.stringify(structuredReport, null, 2),
        structuredAnalysisResult: structuredReport
    };
}
