import React, { useState, useEffect } from "react";
import { DeploymentScenario, IncidentAnalysis } from "../types";
import {
  BrainCircuit,
  Wrench,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowRightLeft,
  Copy,
  Check,
  Terminal,
  Activity,
  AlertTriangle,
  Loader2,
  GitBranch,
} from "lucide-react";

interface AiDiagnosticsPanelProps {
  scenario: DeploymentScenario;
  onTriggerRollback: () => void;
}

export default function AiDiagnosticsPanel({
  scenario,
  onTriggerRollback,
}: AiDiagnosticsPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState(0);

  const loaderSteps = [
    "Collecting multi-dimensional API telemetry endpoints...",
    "Correlating data drift Kolmogorov-Smirnov statistical skews...",
    "Interrogating FastAPI instance container stdout log tracebacks...",
    "Querying Google Gemini SRE Reliability Model...",
    "Assembling structural CJS remediation and rollback commands...",
  ];

  useEffect(() => {
    let interval: any;
    if (analyzing) {
      setDiagnosticStep(0);
      interval = setInterval(() => {
        setDiagnosticStep((prev) => (prev < loaderSteps.length - 1 ? prev + 1 : prev));
      }, 1200);
    } else {
      setDiagnosticStep(0);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/analyze-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setAnalysis(data);
      } else {
        alert(data.error || "Failed to parse SRE incident statistics");
      }
    } catch (err) {
      console.error("Inference query failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMetrics = scenario.metricsHistory[scenario.metricsHistory.length - 1];

  const getSeverityColor = (sev: string) => {
    switch (String(sev).toLowerCase()) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "medium":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white text-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <BrainCircuit className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider font-mono text-slate-800 uppercase">
                AI SRE Reliability Engine
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generative root-cause analysis & custom step-by-step incident remediation.
              </p>
            </div>
          </div>
        </div>
        <button
          id="btn-run-analysis"
          onClick={runAnalysis}
          disabled={analyzing}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold font-sans uppercase tracking-wider py-2.5 px-5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-100 disabled:text-slate-400 hover:scale-[1.01] cursor-pointer transition-all shrink-0 shadow-xs border border-indigo-600"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Activity className="h-4 w-4 text-white" />
          )}
          Trigger AI Root Cause Analysis
        </button>
      </div>

      {/* Analyzing state */}
      {analyzing && (
        <div id="diagnostics-loader-card" className="py-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <div className="text-center max-w-sm">
            <h4 className="text-sm font-bold text-slate-800">Processing Telemetries & Logs...</h4>
            <p className="text-[11px] text-indigo-600 font-mono mt-1.5 h-8 animate-pulse font-semibold">
              {loaderSteps[diagnosticStep]}
            </p>
          </div>
          <div className="w-48 bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
              style={{ width: `${(diagnosticStep + 1) * 20}%` }}
            />
          </div>
        </div>
      )}

      {/* Static Welcome state */}
      {!analyzing && !analysis && (
        <div id="diagnostics-dashboard-placeholder" className="py-12 text-center max-w-lg mx-auto space-y-3.5">
          <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shadow-inner">
            <Terminal className="h-5 w-5 text-slate-400" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            SRE AI Co-Pilot Idle
          </h4>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Diagnose active SLA spikes, schema model mismatches, or system failures. Press the "Trigger AI Root Cause Analysis" button above to query logs and build custom rollback blueprints.
          </p>
          {scenario.status !== "healthy" && (
            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full mt-2">
              <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
              Active System Anomaly Flagged
            </div>
          )}
        </div>
      )}

      {/* Loaded Analysis Report state */}
      {analysis && !analyzing && (
        <div id="ai-analysis-report" className="space-y-6 animate-fadeIn">
          {/* Header Block Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 p-5 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-bold font-mono uppercase px-2.5 py-0.5 border rounded-full ${getSeverityColor(analysis.severity)}`}>
                  SEVERITY: {analysis.severity}
                </span>
                <span className="text-[10.5px] font-mono text-slate-400">
                  REF ID: mlo_rca_{analysis.scenarioId.substring(0, 4)}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 font-sans tracking-tight leading-snug">
                {analysis.incidentTitle}
              </h4>
            </div>
            
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2.5 px-3.5 shadow-xs">
              <span className="text-[10px] text-slate-450 font-mono font-bold uppercase tracking-wider">Throguhput Threat:</span>
              <div className="w-11 h-11 rounded-full border-2 border-red-100 flex items-center justify-center relative bg-red-50/40 shrink-0">
                <div className="text-center">
                  <span className="text-xs font-bold font-mono text-red-600 block leading-tight">
                    {analysis.impactScore.split("/")[0] || analysis.impactScore}
                  </span>
                  <span className="text-[7.5px] text-red-400 uppercase font-black tracking-wide leading-none">
                    LEVEL
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core breakdown columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Root Cause & Details */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-2.5 shadow-xs">
                <h5 className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Investigation Summary
                </h5>
                <p className="text-xs text-slate-600 font-sans leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-2.5 shadow-xs">
                <h5 className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Diagnostic Root Cause Analysis
                </h5>
                <div className="font-mono text-[11px] text-slate-800 border-l-2 border-red-500 pl-3 leading-relaxed whitespace-pre-line py-1">
                  {analysis.rootCause}
                </div>
              </div>

              {/* Observed Signals Table */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3.5 shadow-xs">
                <h5 className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-widest leading-none">
                  Telemetry Violations Triaged
                </h5>
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-450 font-bold block leading-tight uppercase mb-1">LATENCY SIGNAL</span>
                    <span className="font-mono font-bold text-slate-850 block truncate">{analysis.metricsObserved.latency}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-450 font-bold block leading-tight uppercase mb-1">DATA DRIFT KPI</span>
                    <span className="font-mono font-bold text-slate-850 block truncate">{analysis.metricsObserved.drift}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-450 font-bold block leading-tight uppercase mb-1">PRED FAILURES</span>
                    <span className="font-mono font-bold text-slate-850 block truncate">{analysis.metricsObserved.failures}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-450 font-bold block leading-tight uppercase mb-1">HTTP ERRORS</span>
                    <span className="font-mono font-bold text-slate-850 block truncate">{analysis.metricsObserved.errors}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Remediations & Rollback command block */}
            <div className="lg:col-span-5 space-y-4">
              {/* Triage checklist */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3.5 shadow-xs">
                <h5 className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />
                  SRE Diagnostic Playbook
                </h5>
                <ul className="space-y-2.5 text-xs font-sans">
                  {analysis.remediationSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-600">
                      <div className="p-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 mt-0.5 shrink-0">
                        <ChevronRight className="h-3 w-3" />
                      </div>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rollback instructions card */}
              <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h5 className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                    Rollback Option
                  </h5>
                  {analysis.rollbackRecommendation.recommended ? (
                    <span className="inline-flex items-center gap-1 bg-red-105 text-red-700 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-red-200 leading-none">
                      <ShieldAlert className="h-2.5 w-2.5 text-red-500 animate-pulse" /> High Urgency
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-200/60 text-slate-600 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-slate-350 leading-none">
                      <ShieldCheck className="h-2.5 w-2.5 text-slate-400" /> Optional
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1.5 bg-white border border-slate-150 p-4 rounded-xl shadow-xs font-sans">
                  <div className="flex items-center gap-1.5 leading-none mb-1">
                    <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">
                      Stable Backup Version: <strong className="font-bold font-mono text-slate-900 bg-slate-105 px-1.5 py-0.5 rounded border border-slate-200">{analysis.rollbackRecommendation.targetVersion}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                    {analysis.rollbackRecommendation.reason}
                  </p>
                </div>

                {/* Rollback Code panel with clip copy */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-1">
                    <span className="text-[9.5px] font-bold font-mono text-slate-450 uppercase tracking-wider">
                      CLI Rollback execution command:
                    </span>
                    <button
                      id="btn-copy-script"
                      onClick={() => copyToClipboard(analysis.rollbackRecommendation.rollbackCommands)}
                      className="text-[10px] font-bold font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:bg-slate-200/80 py-0.5 px-2 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-450" />
                          <span>Copy CLI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 border border-slate-900 text-slate-250 text-[10.5px] font-mono leading-relaxed rounded-xl overflow-x-auto text-left relative max-h-36 shadow-inner select-text">
                    {analysis.rollbackRecommendation.rollbackCommands}
                  </pre>
                </div>

                {/* Direct Action roll-back trigger */}
                {analysis.rollbackRecommendation.recommended && (
                  <button
                    id="btn-confirm-rollback"
                    onClick={onTriggerRollback}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold font-sans py-3.5 px-4 rounded-xl text-white bg-slate-900 hover:bg-slate-850 hover:scale-[1.01] transition-all cursor-pointer shadow-xs border border-slate-900 uppercase tracking-widest mt-1"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-white" />
                    Apply Automated Rollback Recommendation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
