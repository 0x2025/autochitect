import * as fs from 'fs';
import * as path from 'path';
import { Annotation } from "@langchain/langgraph";

// ==========================================
// 0. Shared Types
// ==========================================
export interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
}

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
    // Benchmarking
    usage: Annotation<TokenUsage>({
        reducer: (curr, next) => ({
            input_tokens: curr.input_tokens + (next.input_tokens || 0),
            output_tokens: curr.output_tokens + (next.output_tokens || 0),
            total_tokens: curr.total_tokens + (next.total_tokens || 0)
        }),
        default: () => ({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
    })
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
    repo_url?: string;
}

const REGISTRY_PATH = path.resolve(__dirname, '..', 'registry.json');
const MOAT_DIR = path.resolve(__dirname, '..', 'moat');

export function getRepoId(url: string): string {
    return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

function getMoatPath(repoUrl?: string): string {
    if (!repoUrl) return path.join(MOAT_DIR, 'global.json');
    const repoId = getRepoId(repoUrl);
    return path.join(MOAT_DIR, `${repoId}.json`);
}

export function getRegistry(): ExpertBlueprint[] {
    if (!fs.existsSync(REGISTRY_PATH)) {
        console.error(`[Config] ERROR: Registry not found at ${REGISTRY_PATH}`);
        return [];
    }
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

export function getLessons(repoUrl?: string): Lesson[] {
    const lessons: Lesson[] = [];
    
    // 1. Load global lessons
    const globalPath = getMoatPath();
    if (fs.existsSync(globalPath)) {
        lessons.push(...JSON.parse(fs.readFileSync(globalPath, 'utf-8')));
    }

    // 2. Load repo-specific lessons
    if (repoUrl) {
        const repoPath = getMoatPath(repoUrl);
        if (fs.existsSync(repoPath) && repoPath !== globalPath) {
            lessons.push(...JSON.parse(fs.readFileSync(repoPath, 'utf-8')));
        }
    }

    return lessons;
}

export function saveLesson(lesson: Lesson, repoUrl?: string) {
    const repoPath = getMoatPath(repoUrl);
    
    // Ensure directory exists
    if (!fs.existsSync(MOAT_DIR)) {
        fs.mkdirSync(MOAT_DIR, { recursive: true });
    }

    const lessons: Lesson[] = [];
    if (fs.existsSync(repoPath)) {
        lessons.push(...JSON.parse(fs.readFileSync(repoPath, 'utf-8')));
    }
    
    // Avoid duplicates by pattern
    const existingIdx = lessons.findIndex(l => l.pattern === lesson.pattern);
    if (existingIdx !== -1) {
        lessons[existingIdx] = { ...lessons[existingIdx], ...lesson };
    } else {
        lessons.push(lesson);
    }

    fs.writeFileSync(repoPath, JSON.stringify(lessons, null, 2));
}

export function getModelForTask(complexity: 'LOW' | 'HIGH'): string {
    return complexity === 'HIGH' ? "gemini-3.1-pro-preview" : "gemini-2.5-flash";
}
