import { StateGraph, START, END, MemorySaver, Send } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentState, getRegistry, getModelForTask } from "./config";
import {
    discoveryNode,
    expertAgentNode,
    criticAgentNode,
    synthesizeNode,
    humanFeedbackNode
} from "./nodes";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import simpleGit from "simple-git";

// ==========================================
// 1. Router Logic (True Dynamic)
// ==========================================
async function routeToExperts(state: typeof AgentState.State) {
    const registry = getRegistry();
    const llm = new ChatGoogleGenerativeAI({
        modelName: getModelForTask("LOW"),
        temperature: 0.1
    });

    console.log(`[Router] Performing Semantic Dispatch based on Discovery Report...`);

    const expertSelectionSchema = z.object({
        selected_experts: z.array(z.string()).describe("List of expert_ids from the registry that are most relevant to the discovery report.")
    });

    const expertRegistrySummary = registry.map(e =>
        `- ${e.expert_id}: Specialties: ${e.specialties.join(", ")}`
    ).join("\n");

    const prompt = `You are the Lead Architect Dispatcher. 
Based on the [DISCOVERY REPORT] below, select the most relevant specialist experts from the [EXPERT REGISTRY] to perform a Level 3/4 deep-dive.

====== EXPERT REGISTRY ======
${expertRegistrySummary}
============================

====== DISCOVERY REPORT ======
${state.discoveryResult}
==============================

Dispatching Rules:
1. Select experts that match the technology stack (e.g., .NET, Java, Node).
2. Select experts that match the architecture patterns (e.g., DDD, Cloud-Native, Modules).
3. MANDATORY: If the Discovery Report mentions 'Dockerfile', 'docker-compose', 'appsettings', or 'secrets', you MUST spawn BOTH 'OWASP_EXPERT' and 'PENTEST_EXPERT'.
4. Do not select more than 6-8 experts to maintain focus.

Return only the list of 'expert_id's.`;

    const extractionLlm = llm.withStructuredOutput(expertSelectionSchema);
    const result = await extractionLlm.invoke(prompt);

    const destinations: any[] = [];

    // Spawn Semantic Experts
    for (const expertId of result.selected_experts) {
        if (registry.some(e => e.expert_id === expertId)) {
            console.log(`[Router] Spawning Semantic Expert: ${expertId}`);
            destinations.push(new Send("expertAgent", {
                localPath: state.localPath,
                discoveryResult: state.discoveryResult,
                discoveredLanguages: state.discoveredLanguages,
                activeExpertId: expertId,
                expertReports: []
            }));
        }
    }

    // MANDATORY EXPERT: Mermaid C4 Visualization (Phase 13)
    if (!result.selected_experts.includes("MERMAID_EXPERT")) {
        console.log(`[Router] Spawning Mandatory Expert: MERMAID_EXPERT`);
        destinations.push(new Send("expertAgent", {
            localPath: state.localPath,
            discoveryResult: state.discoveryResult,
            discoveredLanguages: state.discoveredLanguages,
            activeExpertId: "MERMAID_EXPERT",
            expertReports: []
        }));
    }

    if (destinations.length === 0) {
        console.log(`[Router] No semantic match. Spawning General Expert.`);
        destinations.push(new Send("expertAgent", {
            localPath: state.localPath,
            discoveryResult: state.discoveryResult,
            discoveredLanguages: state.discoveredLanguages || [],
            activeExpertId: "GENERAL_EXPERT",
            expertReports: []
        }));
    }
    return destinations;
}

// ==========================================
// 2. Graph Assembly
// ==========================================
export function createGraph(isTest = false) {
    const cloneNode = async (state: typeof AgentState.State) => {
        const repoUrl = state.repoUrl;
        if (!repoUrl) {
            return { localPath: state.localPath || path.join(process.cwd(), ".test-workspace") };
        }

        const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "unknown-repo";
        const localBasePath = "/tmp/autochitect";
        const localPath = path.join(localBasePath, repoName);

        if (!fs.existsSync(localBasePath)) fs.mkdirSync(localBasePath, { recursive: true });

        if (!fs.existsSync(localPath)) {
            console.log(`[Node: Clone] Cloning ${repoUrl} to ${localPath}...`);
            await simpleGit().clone(repoUrl, localPath);
        } else {
            console.log(`[Node: Clone] Repo already exists at ${localPath}. Skipping clone.`);
        }

        return { localPath };
    };

    const workflow = new StateGraph(AgentState)
        .addNode("cloneRepo", cloneNode)
        .addNode("discover", discoveryNode)
        .addNode("expertAgent", expertAgentNode)
        .addNode("auditor", criticAgentNode)
        .addNode("synthesize", synthesizeNode)
        .addNode("distill", humanFeedbackNode);

    workflow.addEdge(START, "cloneRepo");
    workflow.addEdge("cloneRepo", "discover");
    workflow.addConditionalEdges("discover", routeToExperts);
    workflow.addEdge("expertAgent", "auditor");
    workflow.addEdge("auditor", "synthesize");
    workflow.addEdge("synthesize", "distill");
    workflow.addEdge("distill", END);

    return workflow.compile({ checkpointer: new MemorySaver() });
}
