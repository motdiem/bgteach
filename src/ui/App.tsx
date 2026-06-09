import { useEffect, useState } from "react";
import { useStore, Tab } from "../state/store";
import AnalyzeTab from "./AnalyzeTab";
import PositionEditor from "./PositionEditor";
import HistoryView from "./HistoryView";
import BlogTab from "./BlogTab";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "analyze", label: "Analyze", icon: "🎯" },
  { id: "edit", label: "Set up", icon: "✏️" },
  { id: "history", label: "History", icon: "📜" },
];

export default function App() {
  const { tab, setTab, warmEngine, engineReady, resetToStart } = useStore();
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    warmEngine();
  }, [warmEngine]);

  return (
    <div className="min-h-full flex flex-col max-w-xl mx-auto">
      <header className="safe-top px-4 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-50">
          🎲 Pocket Backgammon <span className="text-teal-400">Teacher</span>
        </h1>
        <div className="flex items-center gap-3">
          {tab === "analyze" && (
            <button onClick={resetToStart} className="text-xs text-slate-400 underline">
              Reset to start
            </button>
          )}
          <button onClick={() => setStoryOpen(true)} className="text-xs text-slate-400 underline whitespace-nowrap">
            📖 Story
          </button>
        </div>
      </header>

      {storyOpen && <BlogTab onClose={() => setStoryOpen(false)} />}

      {!engineReady && (
        <div className="mx-4 mb-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
          Loading the gnubg neural-net engine (first time downloads ~18&nbsp;MB, then cached offline)…
        </div>
      )}

      <main className="flex-1 px-4 pb-24">
        {tab === "analyze" && <AnalyzeTab />}
        {tab === "edit" && <PositionEditor />}
        {tab === "history" && <HistoryView />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 safe-bottom">
        <div className="max-w-xl mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs ${
                tab === t.id ? "text-teal-400" : "text-slate-400"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
