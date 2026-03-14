import { NextRequest, NextResponse } from 'next/server';
import { queueWorker } from '@/lib/queue-worker';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const githubToken = (session as any)?.accessToken;
        const ownerId = (session as any)?.user?.id;
        const { repoUrl, isPrivate } = await req.json();
        
        if (!repoUrl) {
            return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
        }

        const repoId = await queueWorker.enqueue(repoUrl, githubToken, ownerId, isPrivate);
        return NextResponse.json({ repoId, status: 'PENDING' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
        return NextResponse.json({ error: 'repoId is required' }, { status: 400 });
    }

    const task = queueWorker.getTask(repoId);
    if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
}
