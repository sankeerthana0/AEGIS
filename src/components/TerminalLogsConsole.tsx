import React, { useState, useRef, useEffect } from "react";
import { DeploymentScenario } from "../types";
import { Terminal, Copy, Check, ShieldAlert, Trash2, Plus } from "lucide-react";

interface TerminalLogsConsoleProps {
  scenario: DeploymentScenario;
  onAppendLog: (logText: string) => void;
  onClearLogs: () => void;
}

export default function TerminalLogsConsole({
  scenario,
  onAppendLog,
  onClearLogs,
}: TerminalLogsConsoleProps) {
  const [copied, setCopied] = useState(false);
  const terminalDocRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal to bottom whenever logs change
  useEffect(() => {
    if (terminalDocRef.current) {
      terminalDocRef.current.scrollTop = terminalDocRef.current.scrollHeight;
    }
  }, [scenario.logs]);

  const copyLogs = () => {
    const rawText = scenario.logs.join("\n");
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseLogLineColor = (line: string) => {
    if (line.includes("[ERROR]") || line.includes("ERROR:")) {
      return "text-red-400 font-semibold";
    }
    if (line.includes("[CRITICAL]") || line.includes("CRITICAL:")) {
      return "text-rose-500 font-bold bg-rose-500/10 px-1 py-0.5 rounded";
    }
    if (line.includes("[WARN]") || line.includes("WARNING:")) {
      return "text-amber-400 font-semibold";
    }
    if (line.includes("[INFO]") || line.includes("INFO:")) {
      return "text-slate-300";
    }
    return "text-slate-400";
  };

  const appendSimulatedPing = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    onAppendLog(`[INFO] ${timestamp}: Manual diagnostic ping dispatched to thread. Active connection status: OK.`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[380px] text-slate-800">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-500" />
          <div>
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800">
              Instance Stdout Logs Console
            </h4>
            <p className="text-[10px] text-slate-400 font-sans leading-none mt-1">
              Microservice deployment live telemetry feed (FastAPI + Docker)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            id="btn-append-log"
            onClick={appendSimulatedPing}
            className="p-1 px-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 transition-all"
            title="Append diagnostic log line"
          >
            <Plus className="h-3 w-3 text-slate-400" />
            Append Ping
          </button>
          <button
            id="btn-copy-terminal-logs"
            onClick={copyLogs}
            className="p-1 px-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-400" />
                <span>Copy Logs</span>
              </>
            )}
          </button>
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-200"
            title="Clear Log Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Board body */}
      <div
        id="terminal-log-scroller"
        ref={terminalDocRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-4 mt-4 bg-slate-950 rounded-xl space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 align-top text-left leading-relaxed shadow-inner border border-slate-900"
      >
        {scenario.logs.length === 0 ? (
          <p className="text-slate-600 italic text-center py-16">Log buffer is empty. Live traces have been cleared.</p>
        ) : (
          scenario.logs.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 select-text hover:bg-slate-900/40 p-0.5 rounded transition-all">
              <span className="text-slate-600 select-none text-[10px] mt-0.5" style={{ minWidth: "16px" }}>
                {idx + 1}
              </span>
              <p className={`whitespace-pre-line text-[11px] overflow-hidden break-all leading-normal ${parseLogLineColor(line)}`}>
                {line}
              </p>
            </div>
          ))
        )}
      </div>

      {/* SLA Check Status footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400 shrink-0 select-none">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${scenario.status === "healthy" ? "bg-emerald-500" : scenario.status === "degraded" ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
          Cluster Status: <strong className="uppercase font-bold text-slate-705">{scenario.status}</strong>
        </span>
        <span>Version: <strong className="text-slate-705">{scenario.version}</strong></span>
        <span>Platform: <strong className="text-slate-705">{scenario.environment}</strong></span>
      </div>
    </div>
  );
}
