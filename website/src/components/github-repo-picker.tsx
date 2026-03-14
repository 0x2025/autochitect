"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui";
import { Lock, Globe, Search, Check } from "lucide-react";

interface Repo {
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  description: string;
}

export function GitHubRepoPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/github/repos")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRepos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search your repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all text-sm"
        />
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50 bg-white">
        {loading ? (
          <div className="p-12 text-center text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em] animate-pulse">
            Syncing Repositories
          </div>
        ) : filteredRepos.length > 0 ? (
          filteredRepos.map((repo) => (
            <button
              key={repo.fullName}
              type="button"
              onClick={() => {
                setSelected(repo.fullName);
                onSelect(repo.url);
              }}
              className={`w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors ${
                selected === repo.fullName ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {repo.isPrivate ? (
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-gray-300 shrink-0" />
                )}
                <div className="truncate">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {repo.name}
                  </div>
                </div>
              </div>
              {selected === repo.fullName && (
                <Check className="w-3 h-3 text-gray-900 shrink-0" />
              )}
            </button>
          ))
        ) : (
          <div className="p-12 text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">
            No Repositories
          </div>
        )}
      </div>
    </div>
  );
}
