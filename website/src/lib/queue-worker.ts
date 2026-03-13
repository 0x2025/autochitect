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

const PROJECT_ID = process.env.PROJECT_ID || '';
const REGION = process.env.REGION || 'us-central1';
const JOB_NAME = 'autochitect-runner';

let JobsClient: any;
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    try {
        JobsClient = require('@google-cloud/run').v2.JobsClient;
    } catch (e) {
        console.warn('Failed to load @google-cloud/run, will fallback to local execution');
    }
}

const SCAN_REFRESH_THRESHOLD_DAYS = parseInt(process.env.SCAN_REFRESH_THRESHOLD_DAYS || '7', 10);

class QueueWorker {
    private queue: ScanTask[] = [];
    private isProcessing = false;
    private initialized = false;
    private useGcs = false;
    private jobsClient: any;

    constructor() {
        if (typeof window === 'undefined') {
            console.log('Initializing QueueWorker, CLI Path:', CLI_PATH);
            if (!fs.existsSync(LOCAL_OUTPUT_DIR)) {
                fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });
            }
            if (JobsClient) {
                this.jobsClient = new JobsClient();
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

        // Task Recovery: If any tasks are stuck in RUNNING, check if they finished in GCS
        for (const task of this.queue) {
            if (task.status === 'RUNNING') {
                console.log(`Checking status of abandoned RUNNING task: ${task.repoId}`);
                const finished = await this.checkTaskFinished(task);
                if (finished) {
                    task.status = 'COMPLETED';
                } else {
                    // If not finished and more than 2 hours old, mark as failed
                    if (Date.now() - task.timestamp > 1000 * 60 * 60 * 2) {
                        task.status = 'FAILED';
                        task.error = 'Task timed out or instance restarted';
                    } else {
                        task.status = 'PENDING'; // Let it be picked up again
                    }
                }
            }
        }
        await this.saveManifest();

        this.initialized = true;
        this.processNext();
    }

    private isLocal(): boolean {
        return process.env.NODE_ENV !== 'production' || process.env.FORCE_LOCAL === 'true';
    }

    private async checkTaskFinished(task: ScanTask): Promise<boolean> {
        if (this.useGcs) {
            try {
                const [exists] = await storage.bucket(BUCKET_NAME).file(`${task.repoId}.json`).exists();
                if (exists) {
                    const [content] = await storage.bucket(BUCKET_NAME).file(`${task.repoId}.json`).download();
                    const report = JSON.parse(content.toString());
                    task.findingsCount = report.findings?.length || 0;
                    return true;
                }
            } catch (e) {
                console.warn(`Failed to check GCS for ${task.repoId}`, e);
            }
        }
        const localPath = path.join(LOCAL_OUTPUT_DIR, `${task.repoId}.json`);
        return fs.existsSync(localPath);
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
        
        // Deduplication Logic (Skip if running in local mode)
        if (!this.isLocal()) {
            const existingTask = this.queue.find(t => t.repoId === repoId && t.status === 'COMPLETED');
            if (existingTask) {
                const ageInDays = (Date.now() - existingTask.timestamp) / (1000 * 60 * 60 * 24);
                if (ageInDays < SCAN_REFRESH_THRESHOLD_DAYS) {
                    console.log(`[QueueWorker] Skipping duplicate scan for ${repoId} (age: ${ageInDays.toFixed(1)} days)`);
                    return repoId;
                }
            }
        } else {
            console.log(`[QueueWorker] Local execution: bypassing duplication check for ${repoId}`);
        }

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
        if (!this.initialized) return;
        
        // Limit processing if not local
        if (this.isProcessing && !this.isLocal()) return;

        const nextTask = this.queue.find(t => t.status === 'PENDING');
        if (!nextTask) return;

        if (this.isLocal()) {
            // In local mode, we don't lock isProcessing so multiple tasks can run instantly
            console.log(`[QueueWorker] Local execution: processing ${nextTask.repoId} instantly`);
        } else {
            this.isProcessing = true;
        }
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
            } else if (this.useGcs) {
                // If local report doesn't exist (running as job), sync findings count from GCS
                await this.checkTaskFinished(nextTask);
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

    private async runCli(task: ScanTask): Promise<void> {
        if (process.env.NODE_ENV === 'production' && this.jobsClient && process.env.FORCE_LOCAL !== 'true') {
            return this.runCloudRunJob(task);
        } else {
            return this.runLocalCli(task);
        }
    }

    private async runCloudRunJob(task: ScanTask): Promise<void> {
        if (!PROJECT_ID || !REGION) {
            throw new Error('PROJECT_ID and REGION must be set for Cloud Run Jobs');
        }

        console.log(`[QueueWorker] Triggering Cloud Run Job for ${task.repoId}`);
        const [operation] = await this.jobsClient.runJob({
            name: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}`,
            overrides: {
                containerOverrides: [
                    {
                        env: [
                            { name: 'TARGET_REPO_URL', value: task.repoUrl },
                            { name: 'GCS_BUCKET_NAME', value: BUCKET_NAME }
                        ]
                    }
                ]
            }
        });

        console.log(`[QueueWorker] Job triggered, waiting for completion: ${operation.name}`);
        await operation.promise();
        console.log(`[QueueWorker] Job completed for ${task.repoId}`);
    }

    private runLocalCli(task: ScanTask): Promise<void> {
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
                    OLLAMA_HOST: process.env.OLLAMA_HOST,
                    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME
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
