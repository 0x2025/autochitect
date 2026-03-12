import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ScanTask {
    repoUrl: string;
    repoId: string;
    status: TaskStatus;
    timestamp: number;
    findingsCount?: number;
    error?: string;
}

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';
const MANIFEST_FILE = 'manifest.json';

// Dynamic CLI path resolution
const DEFAULT_CLI_PATH = '/app/cli/dist/cli.js';
const LOCAL_CLI_PATH = path.resolve(process.cwd(), '../poc_agent_runner/dist/cli.js');

// Prioritize environment variable, then production fallback, then local development
const CLI_PATH = process.env.CLI_PATH || (fs.existsSync(DEFAULT_CLI_PATH) ? DEFAULT_CLI_PATH : LOCAL_CLI_PATH);

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const LOCAL_OUTPUT_DIR = path.join(DATA_DIR, 'reports');

class QueueWorker {
    private queue: ScanTask[] = [];
    private isProcessing = false;
    private initialized = false;
    private useGcs = false;

    constructor() {
        if (typeof window === 'undefined') {
            console.log('Initializing QueueWorker, CLI Path:', CLI_PATH);
            if (!fs.existsSync(LOCAL_OUTPUT_DIR)) {
                fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });
            }
            this.init();
        }
    }

    private async init() {
        if (BUCKET_NAME) {
            try {
                const [exists] = await storage.bucket(BUCKET_NAME).exists();
                this.useGcs = exists;
            } catch (e) {
                console.warn('GCS Bucket not available, falling back to local storage');
                this.useGcs = false;
            }
        }
        await this.loadManifest();
        this.initialized = true;
        this.processNext();
    }

    private async loadManifest() {
        if (this.useGcs) {
            try {
                const bucket = storage.bucket(BUCKET_NAME);
                const file = bucket.file(MANIFEST_FILE);
                const [exists] = await file.exists();
                if (exists) {
                    const [content] = await file.download();
                    this.queue = JSON.parse(content.toString());
                    return;
                }
            } catch (e) {
                console.error('Failed to load manifest from GCS:', e);
            }
        }

        const manifestPath = path.join(DATA_DIR, MANIFEST_FILE);
        if (fs.existsSync(manifestPath)) {
            try {
                this.queue = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            } catch (e) {
                console.error('Failed to load local manifest:', e);
                this.queue = [];
            }
        }
    }

    private async saveManifest() {
        const content = JSON.stringify(this.queue, null, 2);
        const manifestPath = path.join(DATA_DIR, MANIFEST_FILE);
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(manifestPath, content);

        if (this.useGcs) {
            try {
                const bucket = storage.bucket(BUCKET_NAME);
                const file = bucket.file(MANIFEST_FILE);
                await file.save(content, {
                    contentType: 'application/json',
                    resumable: false
                });
            } catch (e) {
                console.error('Failed to save manifest to GCS:', e);
            }
        }
    }

    async enqueue(repoUrl: string): Promise<string> {
        const repoId = this.generateRepoId(repoUrl);
        this.queue = this.queue.filter(t => t.repoId !== repoId);

        const task: ScanTask = {
            repoUrl,
            repoId,
            status: 'PENDING',
            timestamp: Date.now()
        };

        this.queue.unshift(task);
        await this.saveManifest();
        this.processNext();
        return repoId;
    }

    private generateRepoId(url: string): string {
        return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    private async processNext() {
        if (!this.initialized || this.isProcessing) return;

        const nextTask = this.queue.find(t => t.status === 'PENDING');
        if (!nextTask) return;

        this.isProcessing = true;
        nextTask.status = 'RUNNING';
        await this.saveManifest();

        try {
            await this.runCli(nextTask);
            nextTask.status = 'COMPLETED';

            const localReportPath = path.join(LOCAL_OUTPUT_DIR, `${nextTask.repoId}.json`);
            if (fs.existsSync(localReportPath)) {
                const reportContent = fs.readFileSync(localReportPath, 'utf-8');
                const report = JSON.parse(reportContent);
                nextTask.findingsCount = report.findings?.length || 0;
            }
        } catch (err: any) {
            console.error('Task failed:', nextTask.repoId, err);
            nextTask.status = 'FAILED';
            nextTask.error = err.message;
        } finally {
            this.isProcessing = false;
            await this.saveManifest();
            this.processNext();
        }
    }

    private runCli(task: ScanTask): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(CLI_PATH)) {
                return reject(new Error(`CLI path not found: ${CLI_PATH}`));
            }

            const localReportPath = path.join(LOCAL_OUTPUT_DIR, `${task.repoId}.json`);

            const child = spawn('node', [CLI_PATH, task.repoUrl, '--output', localReportPath], {
                env: {
                    ...process.env,
                    TARGET_REPO_URL: task.repoUrl,
                    // Explicitly pass LLM keys (Next.js replaces these at build time/runtime)
                    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
                    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                    OLLAMA_HOST: process.env.OLLAMA_HOST
                },
                cwd: process.cwd(),
                stdio: 'inherit'
            });

            child.on('close', async (code) => {
                if (code === 0) {
                    try {

                        if (this.useGcs) {
                            const bucket = storage.bucket(BUCKET_NAME);
                            await bucket.upload(localReportPath, {
                                destination: `${task.repoId}.json`,
                                contentType: 'application/json',
                            });
                        }
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`CLI exited with code ${code}`));
                }
            });

            child.on('error', (err) => reject(err));
        });
    }

    getTasks(page: number, limit: number) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            tasks: this.queue.slice(start, end),
            hasNext: this.queue.length > end
        };
    }

    getTask(repoId: string) {
        return this.queue.find(t => t.repoId === repoId);
    }
}

const globalForQueue = global as unknown as { queueWorker: QueueWorker };
export const queueWorker = globalForQueue.queueWorker || new QueueWorker();
if (process.env.NODE_ENV !== 'production') globalForQueue.queueWorker = queueWorker;
