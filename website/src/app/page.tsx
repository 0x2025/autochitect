import { Window, Button } from "@/components/win98-ui";
import Link from "next/link";
import { Terminal, FileText, Zap, Shield, Play } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl w-full flex flex-col gap-8">
      <Window title="Autochitect - Welcome" icon={<Zap className="w-4 h-4" />}>
        <div className="flex flex-col md:flex-row gap-8 items-center p-6 bg-win-white win98-inset">
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl font-bold border-b-2 border-win-black pb-2">Autochitect v1.0.0</h1>
            <p className="text-lg">
              Autonomous architectural discovery and audit engine. Map your code geometry,
              enforce institutional memory, and validate agent-derived findings.
            </p>
            <div className="flex gap-4 pt-4">
              <Link href="/report">
                <Button className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Load Agent Report
                </Button>
              </Link>
              <Link href="#guide">
                <Button className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  How to Run
                </Button>
              </Link>
            </div>
          </div>
          <div className="win98-inset bg-black p-4 text-green-500 font-mono text-sm hidden md:block">
            <p>{">"} autochitect --analyze ./repo</p>
            <p>Scanning L1 Context...</p>
            <p className="text-white">Found Dockerfile, .NET API</p>
            <p>Spawning Specialist Experts...</p>
            <p className="text-yellow-400">OWASP Expert: 2 Critical Findings</p>
            <p>Synthesizing structured_report.json</p>
            <p className="animate-pulse">_</p>
          </div>
        </div>
      </Window>

      <Window id="guide" title="Guide: How to Run Analyze" icon={<Terminal className="w-4 h-4" />}>
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-win-blue" />
              Direct with Local Agent
            </h3>
            <div className="bg-win-white p-4 win98-inset space-y-2">
              <p>1. Clone the repository and navigate to <code>poc_agent_runner</code>.</p>
              <p>2. Set up environment variables in <code>.env</code> (GITHUB_TOKEN, GOOGLE_API_KEY).</p>
              <p>3. Run the following command:</p>
              <pre className="bg-black text-white p-2 rounded text-xs overflow-x-auto">
                npm install && npm run start
              </pre>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-win-blue" />
              Via Docker (Cloud Runner)
            </h3>
            <div className="bg-win-white p-4 win98-inset space-y-2">
              <p>Pull and run our latest pre-configured agent container:</p>
              <pre className="bg-black text-white p-2 rounded text-xs overflow-x-auto">
                docker pull sangcungoc/autochitect:latest{"\n"}
                docker run -e GOOGLE_API_KEY=$KEY -e TARGET_REPO_URL=$URL -v $(pwd):/app/output sangcungoc/autochitect:latest
              </pre>
              <p className="text-xs text-win-dark-gray italic mt-2">
                * Ensure you mount your local volume or provide git credentials for private repos.
              </p>
            </div>
          </section>

          <div className="flex justify-center pt-2">
            <Link href="/report">
              <Button inset className="px-8 font-bold">READY TO VALIDATE REPORT -{">"}</Button>
            </Link>
          </div>
        </div>
      </Window>
    </div>
  );
}
