import React, { useState } from "react";
import { DeploymentScenario } from "../types";
import {
  Flame,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Gauge,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface AnomalySimulatorProps {
  scenario: DeploymentScenario;
  onUpdateScenario: (updated: DeploymentScenario) => void;
  onResetAll: () => void;
}

export default function AnomalySimulator({
  scenario,
  onUpdateScenario,
  onResetAll,
}: AnomalySimulatorProps) {
  const [anomalyType, setAnomalyType] = useState<"drift" | "latency" | "failure" | "api_error">("drift");
  const [intensity, setIntensity] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const getIntensityLabel = (val: number) => {
    switch (val) {
      case 1:
        return "Minimal Fluctuations (Slight Drift)";
      case 2:
        return "Mild Threshold Drift (Limit Warn)";
      case 3:
        return "Standard SLA Violation (Alarms Trigger)";
      case 4:
        return "Severe Node Degradation (EKS/ECS auto-healing checks)";
      case 5:
        return "Complete Crash / Data Pipeline Blown";
      default:
        return "Baseline Normal";
    }
  };

  const activeAnomaly = scenario.metricsConfig.anomalyType;

  const triggerSimulation = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}/simulate-anomaly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anomalyType,
          anomalyIntensity: intensity,
        }),
      });
      const data = await response.json();
      if (data.success && data.scenario) {
        onUpdateScenario(data.scenario);
      }
    } catch (err) {
      console.error("Simulation trigger failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerRecovery = async () => {
    setRecovering(true);
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}/recover`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success && data.scenario) {
        onUpdateScenario(data.scenario);
      }
    } catch (err) {
      console.error("Recovery action failed", err);
    } finally {
      setRecovering(false);
    }
  };

  // Setup visual descriptors of what is actually happening during simulation injection
  const simulationDescriptions = {
    drift: {
      title: "Model Feature Drift",
      detail: "Alters statistic demographic parameters (e.g., shifts median consumer age upwards). Induces statistical divergence alerts using time-series Kolmogorov-Smirnov check.",
      icon: Gauge,
      colorClass: "text-purple-600 bg-purple-50 border-purple-200",
    },
    latency: {
      title: "P95 Latency Spikes",
      detail: "Simulates massive response congestion. Saturates FastAPI worker pool threads and triggers keepoff timeouts on external models completion sockets.",
      icon: Clock,
      colorClass: "text-amber-600 bg-amber-50 border-amber-200",
    },
    failure: {
      title: "Inference Schema Failures",
      detail: "Injects missing input payloads (e.g. key zipcode arrays omitted). Causes internal Scikit-learn preprocessor pipeline transform() value exceptions, forcing fallback defaults.",
      icon: ShieldAlert,
      colorClass: "text-red-600 bg-red-50 border-red-200",
    },
    api_error: {
      title: "API HTTP 5xx Failures",
      detail: "Artificially throws operational exception errors on API web routers. Mimics resource exhaustion, DB connection pool crashes, or out-of-memory outtakes.",
      icon: AlertTriangle,
      colorClass: "text-rose-600 bg-rose-50 border-rose-200",
    },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-800 tracking-wider font-mono flex items-center gap-1.5 uppercase">
            <Flame className="h-4 w-4 text-red-500" />
            Telemetry Anomaly Injector
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Friction-test the reliability panel by triggering simulated microservice disruptions.
          </p>
        </div>
        <button
          id="btn-global-reset"
          onClick={onResetAll}
          className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="h-3 w-3" />
          Global Hard Reset
        </button>
      </div>

      {activeAnomaly !== "none" ? (
        <div id="simulation-active-card" className="bg-amber-50/60 border border-amber-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg mt-0.5 border border-amber-250 shadow-xs">
              <AlertOctagon className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide font-sans">
                  Injection Active: {activeAnomaly.toUpperCase()}
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 font-bold font-mono px-2 py-0.5 rounded-full">
                  LEVEL {scenario.metricsConfig.anomalyIntensity}/5
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1.5 leading-relaxed font-sans">
                The simulated telemetry feed has shifted. Selected signals are currently reporting active drift. Trigger automated AI diagnostic tools to resolve.
              </p>
            </div>
          </div>
          <button
            id="btn-recover-scenario"
            disabled={recovering}
            onClick={triggerRecovery}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-55 hover:bg-emerald-100 border border-emerald-250 py-2.5 px-5 rounded-xl transition-all font-sans cursor-pointer shrink-0 shadow-xs uppercase tracking-wider"
          >
            {recovering ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Heal to Baseline
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Anomaly type selectors */}
          <div className="lg:col-span-1 space-y-3">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
              1. Selected Failure Signal
            </label>
            <div className="space-y-2">
              {(["drift", "latency", "failure", "api_error"] as const).map((type) => {
                const config = simulationDescriptions[type];
                const Icon = config.icon;
                const isSelected = anomalyType === type;
                return (
                  <button
                    key={type}
                    id={`opt-anomaly-${type}`}
                    onClick={() => setAnomalyType(type)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border text-xs font-semibold font-sans transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border ${isSelected ? "bg-slate-800 text-white border-slate-705" : "bg-slate-50 text-slate-600 border-slate-100"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold leading-none">{config.title}</p>
                      <span className={`text-[9.5px] font-mono block mt-1.5 ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                        {type === "drift" && "Data Drift KPI"}
                        {type === "latency" && "SLA Spikes KPI"}
                        {type === "failure" && "Model Mismatches KPI"}
                        {type === "api_error" && "HTTP Error KPI"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity and configurations */}
          <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                  2. Impact Intensity Slider
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-0.5">
                  Multiplier: {intensity}x
                </span>
              </div>
              
              <div className="space-y-1">
                <input
                  id="intensity-slider"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer appearance-none"
                />
                <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400 px-1 pt-1">
                  <span>1 (FLUTTER)</span>
                  <span>2 (WARN)</span>
                  <span>3 (VIOLATION)</span>
                  <span>4 (ALERT)</span>
                  <span>5 (FATAL)</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-sans">
                <p className="font-semibold text-slate-800">
                  {getIntensityLabel(intensity)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {simulationDescriptions[anomalyType].detail}
                </p>
              </div>
            </div>

            <button
              id="btn-inject-anomaly"
              disabled={submitting}
              onClick={triggerSimulation}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-850 disabled:bg-slate-350 py-3 px-4 rounded-xl transition-all font-sans tracking-widest uppercase shadow-xs cursor-pointer"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-300" />
              ) : (
                <Flame className="h-4 w-4 text-amber-300" />
              )}
              Inject Anomaly Signal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
