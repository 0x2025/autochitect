import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const MOAT_DIR = path.resolve(__dirname, '..', 'moat');
const REGISTRY_PATH = path.resolve(__dirname, '..', 'registry.json');

const storage = new Storage();

/**
 * Returns true if the system is configured for Cloud Storage sync.
 */
export function isCloudMode(): boolean {
    return !!BUCKET_NAME;
}

/**
 * Synchronizes registry.json and all lessons from GCS to local.
 */
export async function syncFromGcs() {
    if (!isCloudMode()) {
        console.log('[Mode] Local Development: Using local disk for Moat & Registry.');
        return;
    }

    try {
        const bucket = storage.bucket(BUCKET_NAME!);

        // 1. Sync registry.json
        console.log(`[GCS] Syncing registry.json from gs://${BUCKET_NAME}/registry.json...`);
        const registryFile = bucket.file('registry.json');
        const [regExists] = await registryFile.exists();
        if (regExists) {
            await registryFile.download({ destination: REGISTRY_PATH });
            console.log(`[GCS] SUCCESS: registry.json synced.`);
        } else {
            console.log(`[GCS] info: gs://${BUCKET_NAME}/registry.json does not exist. Using local default.`);
        }

        // 2. Sync moat directory
        console.log(`[GCS] Syncing moat/ directory from gs://${BUCKET_NAME}/moat/...`);
        if (!fs.existsSync(MOAT_DIR)) fs.mkdirSync(MOAT_DIR, { recursive: true });

        const [files] = await bucket.getFiles({ prefix: 'moat/' });
        for (const file of files) {
            const fileName = path.basename(file.name);
            if (!fileName || !fileName.endsWith('.json')) continue;

            const localPath = path.join(MOAT_DIR, fileName);
            console.log(`[GCS] Downloading ${file.name} to ${localPath}...`);
            await file.download({ destination: localPath });
        }
        console.log(`[GCS] SUCCESS: moat directory synced.`);
    } catch (err: any) {
        console.error(`[GCS] Sync Error: ${err.message}`);
    }
}

/**
 * Uploads a specific repository's lessons to GCS.
 */
export async function syncMoatToGcs(repoId: string) {
    if (!isCloudMode()) return;

    const fileName = `${repoId}.json`;
    const localPath = path.join(MOAT_DIR, fileName);
    const destination = `moat/${fileName}`;

    if (!fs.existsSync(localPath)) return;

    try {
        const bucket = storage.bucket(BUCKET_NAME!);
        console.log(`[GCS] Uploading ${localPath} to gs://${BUCKET_NAME}/${destination}...`);
        await bucket.upload(localPath, {
            destination,
            contentType: 'application/json'
        });
        console.log(`[GCS] SUCCESS: ${destination} uploaded.`);
    } catch (err: any) {
        console.error(`[GCS] Upload Error: ${err.message}`);
    }
}
