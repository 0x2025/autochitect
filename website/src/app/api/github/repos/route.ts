import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "30";

    try {
        const response = await fetch(
            `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
            {
                headers: {
                    Authorization: `token ${accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(error, { status: response.status });
        }

        const data = await response.json();
        // Return only relevant info
        const repos = data.map((repo: any) => ({
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            isPrivate: repo.private,
            description: repo.description,
            updatedAt: repo.updated_at,
        }));

        return NextResponse.json(repos);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
