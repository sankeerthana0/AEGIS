import React, { useState, useEffect } from "react";
import { DeploymentScenario } from "./types";
import MetricCharts from "./components/MetricCharts";
import AnomalySimulator from "./components/AnomalySimulator";
import TerminalLogsConsole from "./components/TerminalLogsConsole";
import AiDiagnosticsPanel from "./components/AiDiagnosticsPanel";
import {
  Globe,
  Settings2,
  RefreshCw,
  LayoutGrid,
  ShieldAlert,
  Sliders,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Clock,
  Terminal as TermIcon,
  PlaySquare,
  Network,
  RotateCcw,
} from "lucide-react";

export default function App() {
  const [scenarios, setScenarios] = useState<DeploymentScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("recommendation-engine");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [globalRollbackNotification, setGlobalRollbackNotification] = useState<{
    scenarioName: string;
    from: string;
    to: string;
    timestamp: string;
  } | null>(null);

  // Fetch scenarios from Express backend
  const fetchScenarios = async (isRefresher = false) => {
    if (isRefresher) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/scenarios");
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      } else {
        console.error("HTTP error loading scenarios API");
      }
    } catch (err) {
      console.error("Failed to connect to scenarios server endpoint", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const selectedScenario =
    scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleUpdateScenario = (updated: DeploymentScenario) => {
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleResetAll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/scenarios/reset-all", { method: "POST" });
      const data = await res.json();
      if (data.success && data.scenarios) {
        setScenarios(data.scenarios);
        setGlobalRollbackNotification(null);
      }
    } catch (err) {
      console.error("Reset failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTriggerRollback = async () => {
    if (!selectedScenario) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/scenarios/${selectedScenario.id}/rollback`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.scenario) {
        handleUpdateScenario(data.scenario);
        // Setup state notification toast
        setGlobalRollbackNotification({
          scenarioName: selectedScenario.name,
          from: selectedScenario.version,
          to: selectedScenario.previousVersion,
          timestamp: new Date().toLocaleTimeString(),
        });
        // Auto-dissolve notification in 8 seconds
        setTimeout(() => {
          setGlobalRollbackNotification(null);
        }, 8000);
      }
    } catch (err) {
      console.error("Rollback execution failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Local log handlers
  const handleAppendLogLocal = (logText: string) => {
    if (!selectedScenario) return;
    const updated = {
      ...selectedScenario,
      logs: [...selectedScenario.logs, logText],
    };
    handleUpdateScenario(updated);
  };

  const handleClearLogsLocal = () => {
    if (!selectedScenario) return;
    const updated = {
      ...selectedScenario,
      logs: [],
    };
    handleUpdateScenario(updated);
  };

  // Calculating overall Cluster KPIs dynamically
  const totalClusters = scenarios.length;
  const criticalClusters = scenarios.filter((s) => s.status === "critical").length;
  const degradedClusters = scenarios.filter((s) => s.status === "degraded").length;
  const healthyClusters = scenarios.filter((s) => s.status === "healthy").length;

  // Track active breaches (where metrics exceed baseline boundaries)
  let totalActiveSLAAlarms = 0;
  scenarios.forEach((s) => {
    if (s.metricsHistory.length > 0) {
      const latest = s.metricsHistory[s.metricsHistory.length - 1];
      const limits = {
        latency: s.id === "support-chatbot" ? 500 : 100,
        drift: 0.3,
        failures: 5.0,
        errors: 2.0,
      };
      if (latest.latency > limits.latency) totalActiveSLAAlarms++;
      if (latest.dataDrift > limits.drift) totalActiveSLAAlarms++;
      if (latest.predictionFailures > limits.failures) totalActiveSLAAlarms++;
      if (latest.apiErrors > limits.errors) totalActiveSLAAlarms++;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans selection:bg-indigo-150 selection:text-indigo-900">
      {/* App Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900 font-sans uppercase">
              Aegis AI Reliability
            </h1>
            <p className="text-[11px] text-slate-400 font-sans font-medium leading-none mt-0.5">
              Model Drift, Latency Signals, Exception Telemetries & SRE Rollbacks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            id="btn-help-modal"
            onClick={() => setShowHelpModal(true)}
            className="p-1 px-2.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium border border-transparent hover:border-slate-200"
          >
            <HelpCircle className="h-4 w-4 text-slate-400" />
            Reliability Playbook
          </button>

          <button
            id="btn-manual-sync"
            onClick={() => fetchScenarios(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 py-1.5 px-3 rounded-lg disabled:opacity-50 transition-all cursor-pointer shadow-xs border border-indigo-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-white/90" : ""}`} />
            Sync Metrics
          </button>
        </div>
      </header>

      {/* Global Rollback Notification Toast */}
      {globalRollbackNotification && (
        <div id="rollback-notification-toast" className="bg-white text-slate-900 border border-emerald-200 p-5 rounded-xl shadow-md mx-4 md:mx-8 mt-5 flex items-center justify-between animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md mt-0.5 border border-emerald-150">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold font-sans text-slate-800 tracking-wide">
                REDEPLOYMENT COMPLETED FOR {globalRollbackNotification.scenarioName.toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-sans leading-normal">
                Successfully rolled back from <strong className="font-mono text-slate-700">{globalRollbackNotification.from}</strong> to backup release <strong className="font-mono text-indigo-600 font-semibold">{globalRollbackNotification.to}</strong>. Baseline performance thresholds restored.
              </p>
            </div>
          </div>
          <button
            onClick={() => setGlobalRollbackNotification(null)}
            className="text-[10px] uppercase font-mono font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 px-2.5 rounded-lg border border-slate-200 cursor-pointer ml-4 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dashboard container */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-mono">Initializing monitored telemetry pipelines...</p>
          </div>
        ) : (
          <>
            {/* KPI STAT STRIP BAR */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat 1 */}
              <div id="kpi-deployments" className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Clusters Monitored
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-slate-900 font-mono">
                    {totalClusters}
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 block">
                    {healthyClusters} Healthy
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${(healthyClusters / totalClusters) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stat 2 */}
              <div id="kpi-sla-alarms" className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Active SLA Breaches
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-light font-mono ${totalActiveSLAAlarms > 0 ? "text-red-600" : "text-slate-900"}`}>
                    {totalActiveSLAAlarms}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">
                    Limit alerts active
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${totalActiveSLAAlarms > 0 ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: totalActiveSLAAlarms > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>

              {/* Stat 3 */}
              <div id="kpi-incidents" className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  System Incidents
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light font-mono text-slate-900">
                    {criticalClusters + degradedClusters}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-1 ${
                    criticalClusters > 0 ? "bg-red-50 text-red-700 border border-red-200" : degradedClusters > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-250"
                  }`}>
                    {criticalClusters > 0 ? "CRITICAL" : degradedClusters > 0 ? "DEGRADED" : "GREEN"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${criticalClusters > 0 ? "bg-red-500" : degradedClusters > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${((criticalClusters + degradedClusters) / totalClusters) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stat 4 */}
              <div id="kpi-last-rollback" className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Automated Rollback Log
                </span>
                <div className="text-sm font-semibold truncate text-slate-850 font-mono mt-0.5" title={scenarios.find(s=>s.lastRollback)?.lastRollback ? "Active Rollback Registered" : "No current session rollbacks"}>
                  {(() => {
                    const lastRun = scenarios.filter((s) => s.lastRollback !== null).sort((a,b)=> new Date(b.lastRollback!.timestamp).getTime() - new Date(a.lastRollback!.timestamp).getTime())[0];
                    if (lastRun && lastRun.lastRollback) {
                      return `${lastRun.id.toUpperCase()}: ${lastRun.lastRollback.toVersion}`;
                    }
                    return "No Active Rollbacks";
                  })()}
                </div>
                <p className="text-[10px] text-slate-400 font-sans mt-2.5">
                  Latest redeployed backup tag
                </p>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Monitored Scenarios Cluster Selector */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                      Deployments Directory ({totalClusters})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Select to Analyze</span>
                  </div>

                  <div className="space-y-3">
                    {scenarios.map((s) => {
                      const isSelected = selectedScenarioId === s.id;
                      const latestPoint = s.metricsHistory[s.metricsHistory.length - 1] || {};
                      
                      return (
                        <button
                          key={s.id}
                          id={`deployment-card-${s.id}`}
                          onClick={() => setSelectedScenarioId(s.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                            isSelected
                              ? "bg-indigo-50/50 border-indigo-200 shadow-xs ring-1 ring-indigo-50"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <div className="space-y-0.5">
                              <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${
                                s.status === "healthy"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : s.status === "degraded"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {s.status.toUpperCase()}
                              </span>
                              <h4 className={`text-xs font-bold font-sans mt-2 tracking-tight ${
                                isSelected ? "text-slate-900" : "text-slate-800"
                              }`}>
                                {s.name}
                              </h4>
                              <p className="text-[10px] font-mono leading-none text-slate-400 mt-0.5">
                                Tag ID: {s.version}
                              </p>
                            </div>
                            <ChevronRight className={`h-4 w-4 mt-1 transition-transform group-hover:translate-x-0.5 ${
                              isSelected ? "text-indigo-500" : "text-slate-300"
                            }`} />
                          </div>

                          {/* Quick miniature metrics snapshot */}
                          <div className={`mt-3.5 pt-3 border-t w-full grid grid-cols-2 gap-y-1.5 text-[10px] font-mono ${
                            isSelected ? "border-indigo-100/60 text-slate-600" : "border-slate-100 text-slate-500"
                          }`}>
                            <div className="flex justify-between pr-3 border-r border-slate-200/50">
                              <span>Latency:</span>
                              <strong className={`font-bold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{latestPoint.latency}ms</strong>
                            </div>
                            <div className="flex justify-between pl-3">
                              <span>Drift:</span>
                              <strong className={`font-bold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{latestPoint.dataDrift}</strong>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info and quick statistics helper */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-xs space-y-3.5">
                  <h4 className="font-bold text-slate-800 font-sans tracking-tight uppercase text-[10px] font-mono text-slate-400">Cluster Diagnostics</h4>
                  <div className="space-y-2.5 text-[11px] font-sans text-slate-500">
                    <p className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-medium">Scenario:</span>
                      <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">{selectedScenario.id}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-medium">Platform Frame:</span>
                      <span className="font-semibold text-slate-700">{selectedScenario.environment}</span>
                    </p>
                    <p className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400 font-medium">Model Stack:</span>
                      <span className="font-semibold text-slate-700">{selectedScenario.modelType}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400 font-medium">Container Stack:</span>
                      <span className="font-semibold text-slate-700">{selectedScenario.runtime}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Key Dashboard charts / Logs & Control Panel */}
              <div className="lg:col-span-8 space-y-6">
                {/* Visual Telemetry Time-Series charts */}
                {selectedScenario && (
                  <MetricCharts scenario={selectedScenario} />
                )}

                {/* Logs Console Terminal */}
                {selectedScenario && (
                  <TerminalLogsConsole
                    scenario={selectedScenario}
                    onAppendLog={handleAppendLogLocal}
                    onClearLogs={handleClearLogsLocal}
                  />
                )}

                {/* Anomaly simulation controllers */}
                {selectedScenario && (
                  <AnomalySimulator
                    scenario={selectedScenario}
                    onUpdateScenario={handleUpdateScenario}
                    onResetAll={handleResetAll}
                  />
                )}

                {/* Artificial Intelligence SRE diagnostics */}
                {selectedScenario && (
                  <AiDiagnosticsPanel
                    scenario={selectedScenario}
                    onTriggerRollback={handleTriggerRollback}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Help playbook modal dialog */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight uppercase flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Reliability & SRE Field Guide
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs font-mono font-bold text-slate-400 hover:text-slate-850 p-1.5 hover:bg-slate-50 rounded"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
              <p>
                Welcome to **Aegis AI Reliability**. This dashboard logs, visualizes, and remediates machine learning performance anomalies (modeling latency, schema errors, data drift, and runtime web crashes) in real-time.
              </p>
              <p className="font-semibold text-slate-800">
                Playbook Operations:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>
                  Choose any deployment microservice on the left panel (e.g. Recommendation Engine, Support Chatbot, Real-time Fraud Detector).
                </li>
                <li>
                  Use the **Anomaly Simulator** to friction-test the pipeline by injecting intentional telemetry drift or high-timeout constraints.
                </li>
                <li>
                  Track performance graphs in real-time. Signals immediately bend upwards with alerts signaling SLA breaches.
                </li>
                <li>
                  Trigger **AI Root Cause Analysis** to invoke Google Gemini SRE diagnostic lookups across runtime tracelogs.
                </li>
                <li>
                  Deploy the recommended safe CLI codebase rollback scripts. The backend automatically redeploys stable release packages.
                </li>
              </ul>
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs font-bold font-sans text-white bg-slate-900 hover:bg-slate-800 px-5  py-2.5 rounded-lg transition-all w-full sm:w-auto uppercase tracking-widest"
              >
                Proceed to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer credits bar */}
      <footer className="bg-slate-950 text-slate-500 px-8 py-5 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono tracking-widest mt-16 border-t border-slate-850">
        <div className="flex flex-wrap gap-4 uppercase justify-center sm:justify-start mb-2 sm:mb-0">
          <span>Session: model_prod_v4</span>
          <span>Kernel: py3.10-fastapi-0.95</span>
          <span>Node: ecs-agent-77x</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>SYSTEM ACTIVE - Aegis Reliable SLA Console</span>
        </div>
      </footer>
    </div>
  );
}
