import * as fs from 'fs';
import * as path from 'path';
import { Annotation } from "@langchain/langgraph";

// ==========================================
// 1. Shared Graph State
// ==========================================
export const AgentState = Annotation.Root({
    repoUrl: Annotation<string>(),
    token: Annotation<string | null>({
        reducer: (curr, next) => next || curr,
        default: () => null
    }),
    localPath: Annotation<string>(),
    activeExpertId: Annotation<string>({
        reducer: (curr, next) => next || curr,
        default: () => ""
    }),
    discoveryResult: Annotation<string>(),
    discoveredLanguages: Annotation<string[]>({
        reducer: (curr, next) => next,
        default: () => []
    }),
    expertReports: Annotation<string[]>({
        reducer: (curr, next) => curr.concat(next),
        default: () => []
    }),
    analysisResult: Annotation<string>(),
    structuredAnalysisResult: Annotation<any>({
        reducer: (curr, next) => next || curr,
        default: () => null
    }),
    // LLM Configuration
    provider: Annotation<string | undefined>(),
    model: Annotation<string | undefined>(),
});

export interface ExpertBlueprint {
    expert_id: string;
    specialties: string[];
    triggers: {
        file_patterns: string[];
        dependency_match: string[];
    };
    grounding: {
        extensions: string[];
    };
    discovery: {
        sequence_id: string;
        ast_queries: string[];
    };
    expert_prompt_ref: string;
    tools: string[];
}

export interface Lesson {
    lesson_id: string;
    tech_stack: string[];
    violation_type: string;
    pattern: string;
    rationale: string;
    human_verdict: 'CORRECT' | 'INCORRECT';
}

const REGISTRY_PATH = path.resolve(__dirname, '..', 'registry.json');
const LESSONS_PATH = path.resolve(__dirname, '..', 'moat', 'lessons_learned.json');

export function getRegistry(): ExpertBlueprint[] {
    if (!fs.existsSync(REGISTRY_PATH)) {
        console.error(`[Config] ERROR: Registry not found at ${REGISTRY_PATH}`);
        return [];
    }
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

export function getLessons(): Lesson[] {
    if (!fs.existsSync(LESSONS_PATH)) return [];
    return JSON.parse(fs.readFileSync(LESSONS_PATH, 'utf-8'));
}

export function saveLesson(lesson: Lesson) {
    const lessons = getLessons();
    lessons.push(lesson);
    fs.writeFileSync(LESSONS_PATH, JSON.stringify(lessons, null, 2));
}

export function getModelForTask(complexity: 'LOW' | 'HIGH'): string {
    return "gemini-2.0-flash"; // Standard POC model for Phase 0 reliability
}
