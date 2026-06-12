import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { MetricPoint, DeploymentScenario } from "../types";
import { Gauge, Clock, Activity, AlertTriangle, ShieldAlert } from "lucide-react";

interface MetricChartsProps {
  scenario: DeploymentScenario;
}

export default function MetricCharts({ scenario }: MetricChartsProps) {
  const [activeSignal, setActiveSignal] = useState<"all" | "latency" | "drift" | "failures" | "errors">("all");
  const data = scenario.metricsHistory;

  // Identify last data point to show current status highlight
  const latest = data[data.length - 1] || {
    latency: 0,
    dataDrift: 0,
    predictionFailures: 0,
    apiErrors: 0,
    trafficRate: 0,
  };

  const chartConfigs = {
    latency: {
      title: "P95 Latency",
      unit: "ms",
      color: "#f59e0b", // Amber
      threshold: scenario.id === "support-chatbot" ? 500 : 100,
      field: "latency",
      desc: "Client-to-model return delay",
      icon: Clock,
    },
    drift: {
      title: "Data Drift Index",
      unit: "D.I.",
      color: "#a855f7", // Purple
      threshold: 0.3,
      field: "dataDrift",
      desc: "Feature distribution divergence",
      icon: Gauge,
    },
    failures: {
      title: "Prediction Failures",
      unit: "%",
      color: "#ef4444", // Red
      threshold: 5.0,
      field: "predictionFailures",
      desc: "Mismatched outputs/fallback triggers",
      icon: ShieldAlert,
    },
    errors: {
      title: "API HTTP 5xx Rate",
      unit: "%",
      color: "#dc2626", // Deep Red
      threshold: 2.0,
      field: "apiErrors",
      desc: "Web handler status crashes",
      icon: AlertTriangle,
    },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-lg text-xs font-mono">
          <p className="text-slate-400 font-semibold mb-1">Time Slice: {label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} style={{ color: item.color }} className="font-semibold">
              {item.name}: {item.value} {chartConfigs[item.dataKey as keyof typeof chartConfigs]?.unit || ""}
            </p>
          ))}
          <p className="text-[10px] text-slate-500 mt-1">Traffic: {payload[0]?.payload?.trafficRate} rps</p>
        </div>
      );
    }
    return null;
  };

  const renderSingleChart = (key: keyof typeof chartConfigs) => {
    const config = chartConfigs[key];
    const isViolating = latest[key as keyof typeof latest] as number > config.threshold;
    const Icon = config.icon;

    return (
      <div
        id={`chart-${key}`}
        className={`bg-white border rounded-xl p-4 transition-all duration-200 shadow-xs ${
          isViolating ? "border-red-200 bg-red-50/10" : "border-slate-200"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isViolating ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 font-sans tracking-tight uppercase">
                {config.title}
              </h4>
              <p className="text-[10px] text-slate-400 font-sans leading-none">{config.desc}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-base font-bold font-mono tracking-tight ${isViolating ? "text-red-600" : "text-slate-900"}`}>
              {latest[key as keyof typeof latest] as number}
              <span className="text-xs font-medium text-slate-400 ml-0.5">{config.unit}</span>
            </span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                stroke="#cbd5e1"
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                stroke="#cbd5e1"
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={config.threshold}
                stroke={config.color}
                strokeDasharray="4 4"
                label={{
                  value: `Limit: ${config.threshold}${config.unit}`,
                  fill: config.color,
                  position: "top",
                  fontSize: 8,
                  fontWeight: "bold",
                  style: { letterSpacing: "0.5px" },
                }}
              />
              <Line
                name={config.title}
                type="monotone"
                dataKey={config.field}
                stroke={config.color}
                strokeWidth={2.5}
                dot={{ r: 2, fill: config.color }}
                activeDot={{ r: 5, strokeWidth: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 pl-2">
          <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 font-sans uppercase tracking-wider">
            Time-Series Signal Logs
          </span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded border border-indigo-100">
            History: 30 ticks (15h)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "latency", "drift", "failures", "errors"] as const).map((sig) => (
            <button
              key={sig}
              id={`btn-filter-${sig}`}
              onClick={() => setActiveSignal(sig)}
              className={`text-[10px] font-mono uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg transition-all border cursor-pointer ${
                activeSignal === sig
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-[1.01]"
                  : "bg-slate-50 hover:bg-slate-105 text-slate-500 border-slate-200"
              }`}
            >
              {sig}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(activeSignal === "all" || activeSignal === "latency") && renderSingleChart("latency")}
        {(activeSignal === "all" || activeSignal === "drift") && renderSingleChart("drift")}
        {(activeSignal === "all" || activeSignal === "failures") && renderSingleChart("failures")}
        {(activeSignal === "all" || activeSignal === "errors") && renderSingleChart("errors")}
      </div>
    </div>
  );
}
