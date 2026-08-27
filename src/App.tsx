/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from "react";
import { Skull, Server, AlertCircle, RefreshCcw, ExternalLink } from "lucide-react";

type BotStatus = {
  status: "online" | "offline";
  botName: string | null;
  guildCount: number;
  hasToken: boolean;
};

type LeaderboardEntry = {
  id: string;
  username: string;
  count: number;
};

export default function App() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, lbRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/leaderboard"),
      ]);
      const statusData = await statusRes.json();
      const lbData = await lbRes.json();
      
      setBotStatus(statusData);
      setLeaderboard(Array.isArray(lbData) ? lbData : []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans flex flex-col p-8 md:p-16 select-none overflow-x-hidden">
      <header className="flex flex-col lg:flex-row justify-between items-start border-b-[6px] border-[#F5F5F5] pb-8 mb-12">
        <div className="flex flex-col">
          <h1 className="text-6xl md:text-[110px] font-black leading-[0.85] tracking-tighter uppercase italic -ml-1">
            SKULL<br />BOARD
          </h1>
          <p className="text-xs md:text-sm uppercase tracking-[0.5em] mt-6 font-bold opacity-40">
            Discord Reaction Tracker
          </p>
        </div>
        <div className="text-left lg:text-right mt-12 lg:mt-0 flex flex-col lg:items-end justify-between h-full">
          {leaderboard.length > 0 && (
            <div className="mb-8">
              <div className="text-5xl md:text-6xl font-black tabular-nums leading-none">
                {leaderboard.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs uppercase tracking-widest font-bold opacity-40 mt-2">
                Total Reactions Logged
              </div>
            </div>
          )}
          <button
            onClick={fetchData}
            className="mt-auto bg-[#F5F5F5] hover:bg-gray-300 text-black px-6 py-3 text-xl font-black italic uppercase inline-flex items-center justify-center gap-3 transition-colors border-none cursor-pointer w-full lg:w-auto"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 pb-12">
        {/* Leaderboard Column */}
        <div className="lg:col-span-7 flex flex-col justify-start">
          {leaderboard.length === 0 ? (
            <div className="bg-[#151515] p-12 border border-white/10 flex flex-col items-center text-center mt-4">
              <Skull className="w-16 h-16 text-white/20 mb-6" />
              <p className="text-2xl font-black uppercase italic tracking-tighter text-white/50 mb-2">No Skulls Collected</p>
              <p className="text-xs uppercase tracking-widest font-bold text-white/30">React to a message with 💀 to start</p>
            </div>
          ) : (
            <div className="space-y-12 lg:space-y-0">
              {/* Top user */}
              <div className="mb-12">
                <div className="mb-4">
                  <span className="bg-[#F5F5F5] text-black text-xs font-black px-2 py-1 uppercase tracking-tighter">
                    All-Time Leader
                  </span>
                </div>
                <h2 className="text-5xl sm:text-7xl md:text-[110px] font-black leading-[0.85] tracking-tighter uppercase md:-ml-2 break-words">
                  @{leaderboard[0].username}
                </h2>
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mt-6">
                  <div className="h-[2px] bg-[#F5F5F5] flex-grow opacity-30 w-full md:w-auto hidden md:block"></div>
                  <div className="text-4xl md:text-7xl font-bold flex items-center gap-4 whitespace-nowrap">
                    <span className="text-xl md:text-3xl opacity-30 italic font-medium">SCORE:</span>{" "}
                    <span className="font-mono text-[#00FF41]">{leaderboard[0].count.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Rest of the users */}
              {leaderboard.length > 1 && (
                <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 lg:pl-12 space-y-8">
                  {leaderboard.slice(1).map((entry, idx) => {
                    const realRank = idx + 2;
                    let opacityClass = "opacity-100";
                    if (realRank === 3) opacityClass = "opacity-70";
                    else if (realRank === 4) opacityClass = "opacity-50";
                    else if (realRank >= 5) opacityClass = "opacity-30";

                    const textGreen = realRank === 2 ? "text-[#00FF41]" : "";

                    return (
                      <div
                        key={entry.id}
                        className={`flex justify-between items-end border-b border-white/20 pb-4 ${opacityClass}`}
                      >
                        <span className="text-xl md:text-3xl font-black uppercase italic truncate pr-4">
                          #{realRank} @{entry.username}
                        </span>
                        <span className={`text-xl md:text-2xl font-mono ${textGreen}`}>
                          {entry.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-5 flex flex-col gap-8 lg:border-l border-white/10 lg:pl-12">
          {/* Bot Status */}
          <div className="bg-[#151515] p-8 border border-white/10">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-8">
              Bot Status
            </p>

            {!botStatus?.hasToken ? (
              <div className="flex flex-col gap-2">
                <span className="text-2xl font-mono text-red-500 tracking-tighter uppercase italic font-black">
                  Missing Token
                </span>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
                  Add DISCORD_TOKEN to env
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                    Network State
                  </p>
                  {botStatus?.status === "online" ? (
                    <div className="inline-block bg-[#00FF41] text-black px-4 py-2 text-xl font-black italic uppercase">
                      Online
                    </div>
                  ) : (
                    <div className="inline-block bg-red-600 text-white px-4 py-2 text-xl font-black italic uppercase">
                      Offline
                    </div>
                  )}
                </div>
                {botStatus?.status === "online" && (
                  <>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                        Active Alias
                      </p>
                      <p className="text-xl font-black uppercase tracking-tighter truncate text-white/90">
                        {botStatus.botName}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                        Server Count
                      </p>
                      <p className="text-xl font-mono text-[#00FF41] font-bold">
                        {botStatus.guildCount} <span className="text-xs text-white/50 tracking-widest ml-1">UNITS</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Command Usage / Setup */}
          <div className="bg-[#151515] p-8 border border-white/10">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-6">
              Command Usage
            </p>
            <div className="flex flex-col gap-6">
              <div>
                <code className="text-2xl font-mono text-[#00FF41] tracking-tighter bg-black/50 px-3 py-1 border border-[#00FF41]/20 inline-block mb-1">
                  !skulls
                </code>
                <p className="text-xs text-white/40 mt-2 uppercase font-bold tracking-widest leading-relaxed">
                  View the current server leaderboard in Discord
                </p>
              </div>
              <div>
                <code className="text-2xl font-mono text-[#00FF41] tracking-tighter bg-black/50 px-3 py-1 border border-[#00FF41]/20 inline-block mb-1">
                  !myskulls
                </code>
                <p className="text-xs text-white/40 mt-2 uppercase font-bold tracking-widest leading-relaxed">
                  View your personal total skulls and server rank
                </p>
              </div>
              <div>
                <code className="text-2xl font-mono text-[#00FF41] tracking-tighter bg-black/50 px-3 py-1 border border-[#00FF41]/20 inline-block mb-1">
                  !syncskulls
                </code>
                <p className="text-xs text-white/40 mt-2 uppercase font-bold tracking-widest leading-relaxed">
                  (Admin) Resyncs all past reactions in the server
                </p>
              </div>
              <div className="h-[1px] bg-white/10 w-full"></div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] leading-loose">
                <span className="text-white">1.</span> Create bot in Discord Portal<br />
                <span className="text-white">2.</span> Enable 3 Gateway Intents<br />
                <span className="text-white">3.</span> Add DISCORD_TOKEN in secrets<br />
                <span className="text-white">4.</span> React with 💀 in server
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer (from Theme) */}
      <footer className="flex flex-col md:flex-row justify-between md:items-center border-t border-white/20 pt-8 mt-auto gap-8 md:gap-0">
        <div className="flex flex-wrap gap-8 md:gap-16">
           <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Status</p>
              <p className="text-sm font-bold uppercase">{loading ? 'Scanning...' : 'Idle'}</p>
           </div>
           <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Total Users</p>
              <p className="text-sm font-bold uppercase">{leaderboard.length} LOGGED</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className={`w-3 h-3 rounded-full ${botStatus?.status === 'online' ? 'bg-[#00FF41] animate-pulse' : 'bg-red-600'}`}></div>
           <p className="text-[10px] uppercase tracking-[0.4em] font-black">Reaction Engine Active</p>
        </div>
      </footer>
    </div>
  );
}
