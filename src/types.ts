export interface MetricPoint {
  timestamp: string; // e.g. "12:00"
  latency: number; // ms
  dataDrift: number; // 0.0 - 1.0
  predictionFailures: number; // %
  apiErrors: number; // %
  trafficRate: number; // req/sec
}

export interface DeploymentScenario {
  id: string;
  name: string;
  version: string;
  previousVersion: string;
  environment: string; // e.g., "AWS ECS (Fargate)", "Kubernetes (AWS EKS)", "AWS Lambda", "AWS App Runner"
  runtime: string; // e.g., "Python 3.10, FastAPI, Docker"
  modelType: string; // e.g., "Scikit-Learn GradientBoosting", "HuggingFace Transformers", "XGBoost Classifier", "Scikit-Learn RandomForest"
  status: "healthy" | "degraded" | "critical";
  activeAnomalies: string[];
  metricsConfig: {
    baseLatency: number;
    baseDrift: number;
    baseFailures: number;
    baseErrors: number;
    anomalyType: "none" | "drift" | "latency" | "failure" | "api_error";
    anomalyIntensity: number; // scale: 1 to 5
  };
  metricsHistory: MetricPoint[];
  logs: string[];
  lastRollback: {
    timestamp: string;
    fromVersion: string;
    toVersion: string;
  } | null;
}

export interface IncidentAnalysis {
  scenarioId: string;
  incidentTitle: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  metricsObserved: {
    latency: string;
    drift: string;
    failures: string;
    errors: string;
  };
  rootCause: string;
  impactScore: string;
  remediationSteps: string[];
  rollbackRecommendation: {
    recommended: boolean;
    reason: string;
    targetVersion: string;
    environmentTarget: string;
    rollbackCommands: string;
  };
}
