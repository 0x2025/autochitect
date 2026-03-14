import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';
const MANIFEST_FILE = 'manifest.json';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');

    let queue: any[] = [];

    // 1. Try GCS if configured
    if (BUCKET_NAME) {
        try {
            const bucket = storage.bucket(BUCKET_NAME);
            const file = bucket.file(MANIFEST_FILE);
            const [exists] = await file.exists();
            if (exists) {
                const [content] = await file.download();
                queue = JSON.parse(content.toString());
            }
        } catch (err) {
            console.warn('GCS manifest retrieval failed, falling back to local');
        }
    }

    // 2. Try Local Fallback if queue is still empty
    if (queue.length === 0) {
        const manifestPath = path.join(DATA_DIR, MANIFEST_FILE);
        if (fs.existsSync(manifestPath)) {
            try {
                const content = fs.readFileSync(manifestPath, 'utf-8');
                queue = JSON.parse(content);
            } catch (err) {
                console.error('Failed to read local manifest');
            }
        }
    }

    // 3. Filter by Privacy/Ownership
    const { auth } = await import('@/auth');
    const session = await auth();
    const userId = (session as any)?.user?.id;

    const filteredQueue = queue.filter(task => {
        if (!task.isPrivate) return true; // Public
        return task.ownerId === userId; // Private & Owner
    });

    const start = (page - 1) * limit;
    const end = start + limit;

    return NextResponse.json({
        tasks: filteredQueue.slice(start, end),
        hasNext: filteredQueue.length > end
    });
}
