import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const LOCAL_OUTPUT_DIR = path.join(DATA_DIR, 'reports');

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ repoId: string }> }
) {
    const { repoId } = await params;

    // 1. Try GCS if configured
    if (BUCKET_NAME) {
        try {
            const bucket = storage.bucket(BUCKET_NAME);
            const file = bucket.file(`${repoId}.json`);
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                return NextResponse.json(JSON.parse(content.toString()));
            }
        } catch (err) {
            console.warn('GCS retrieval failed, falling back to local:', repoId);
        }
    }

    // 2. Try Local Fallback
    const localPath = path.join(LOCAL_OUTPUT_DIR, `${repoId}.json`);
    if (fs.existsSync(localPath)) {
        try {
            const content = fs.readFileSync(localPath, 'utf-8');
            return NextResponse.json(JSON.parse(content));
        } catch (err) {
            return NextResponse.json({ error: 'Failed to read local report' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
}
