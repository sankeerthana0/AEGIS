import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { DeploymentScenario, MetricPoint, IncidentAnalysis } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// In-Memory Database of Deployment Scenarios
let scenarios: DeploymentScenario[] = [
  {
    id: "recommendation-engine",
    name: "Recommendation Product API",
    version: "v2.4.0-prod",
    previousVersion: "v2.3.2-prod",
    environment: "AWS ECS (Fargate)",
    runtime: "Python 3.10, FastAPI, Docker",
    modelType: "Scikit-Learn Collaborative Filtering (Random Forest Regressor)",
    status: "healthy",
    activeAnomalies: [],
    metricsConfig: {
      baseLatency: 45,
      baseDrift: 0.11,
      baseFailures: 0.3,
      baseErrors: 0.2,
      anomalyType: "none",
      anomalyIntensity: 0
    },
    metricsHistory: [],
    logs: [
      "[INFO] Loading Scikit-learn model 'recommender_v2.4.pkl' from AWS S3 storage",
      "[INFO] Cold start successful. Model weights initialized in memory.",
      "[INFO] FastAPI listening on http://0.0.0.0:8000",
      "[INFO] Scheduled cron check: Data drift monitors normal (p-value = 0.542)",
      "[INFO] Completed 20,000 successful prediction iterations. Baseline healthy."
    ],
    lastRollback: null
  },
  {
    id: "support-chatbot",
    name: "AI Support Agent Chatbot",
    version: "v1.1.2-alpha",
    previousVersion: "v1.1.0-prod",
    environment: "Kubernetes (AWS EKS)",
    runtime: "Python 3.11, FastAPI, Gunicorn, Docker",
    modelType: "Fine-Tuned LLaMA-3 (8B Instruct / PyTorch)",
    status: "healthy",
    activeAnomalies: [],
    metricsConfig: {
      baseLatency: 280,
      baseDrift: 0.03,
      baseFailures: 1.1,
      baseErrors: 0.4,
      anomalyType: "none",
      anomalyIntensity: 0
    },
    metricsHistory: [],
    logs: [
      "[INFO] Starting Gunicorn workers on Kubernetes pod 'support-chatbot-7cb94-b12'",
      "[INFO] Loading PyTorch model weights on cuda0 GPU device.",
      "[INFO] Model weights allocation: 15.6GB / 16GB VRAM loaded successfully.",
      "[INFO] Streaming completions server listening on port 8000",
      "[INFO] Connection established successfully for client tunnel WS_9921c"
    ],
    lastRollback: null
  },
  {
    id: "fraud-guard",
    name: "Real-Time Fraud Guard",
    version: "v3.0.1-prod",
    previousVersion: "v3.0.0-prod",
    environment: "AWS Lambda (Serverless Container)",
    runtime: "Python 3.9, FastAPI, AWS Chalice",
    modelType: "XGBoost Credit-Fraud Classifier v3.0",
    status: "healthy",
    activeAnomalies: [],
    metricsConfig: {
      baseLatency: 22,
      baseDrift: 0.08,
      baseFailures: 0.2,
      baseErrors: 0.3,
      anomalyType: "none",
      anomalyIntensity: 0
    },
    metricsHistory: [],
    logs: [
      "[INFO] AWS Lambda function initialized from Docker ECR tag 'fraud-guard:v3.0.1'",
      "[INFO] Model parameters un-pickled. Feature dimensional mapping contains 31 properties.",
      "[INFO] Hot-path warm cache matched 98.4% of request geo-locations.",
      "[INFO] Transaction pipeline active. Standing ready to block threat vectors.",
      "[INFO] Latency averages: 22ms. Heartbeat active."
    ],
    lastRollback: null
  },
  {
    id: "sentiment-pipeline",
    name: "Customer Sentiment Pipeline",
    version: "v2.0.0-rc1",
    previousVersion: "v1.9.5-prod",
    environment: "AWS App Runner",
    runtime: "Python 3.10, FastAPI, HuggingFace Transformers, Docker",
    modelType: "DistilBERT Text Evaluator Ensemble",
    status: "healthy",
    activeAnomalies: [],
    metricsConfig: {
      baseLatency: 75,
      baseDrift: 0.04,
      baseFailures: 0.1,
      baseErrors: 0.1,
      anomalyType: "none",
      anomalyIntensity: 0
    },
    metricsHistory: [],
    logs: [
      "[INFO] AWS App Runner pipeline synchronization check passed.",
      "[INFO] Loaded DistilBERT tokenization dictionary.",
      "[INFO] Serving endpoints live at: https://sentiment-pr-env.aws.com/POST",
      "[INFO] Heartbeat diagnostics passed. All background services operational.",
      "[INFO] Queue utilization: 0.2%. Normal operation."
    ],
    lastRollback: null
  }
];

// Time-Series Data Generator Function
function generateMetricsHistory(scenario: DeploymentScenario, length = 30): MetricPoint[] {
  const history: MetricPoint[] = [];
  const now = new Date();
  const { baseLatency, baseDrift, baseFailures, baseErrors, anomalyType, anomalyIntensity } = scenario.metricsConfig;

  for (let i = length - 1; i >= 0; i--) {
    const pointTime = new Date(now.getTime() - i * 30 * 60 * 1000); // 30 mins interval
    const hoursStr = String(pointTime.getHours()).padStart(2, "0");
    const minsStr = String(pointTime.getMinutes()).padStart(2, "0");
    const timestamp = `${hoursStr}:${minsStr}`;

    // Random walk fluctuate
    const seed = i;
    const fluctuation = Math.sin(seed / 2) * 0.1 + (Math.sin(seed / 5) * 0.05);
    
    let latency = baseLatency + (fluctuation * baseLatency * 0.4) + (Math.random() - 0.5) * (baseLatency * 0.08);
    let dataDrift = Math.max(0, baseDrift + fluctuation * 0.02 + (Math.random() - 0.5) * 0.02);
    let predictionFailures = Math.max(0, baseFailures + fluctuation * 0.1 + (Math.random() - 0.5) * 0.05);
    let apiErrors = Math.max(0, baseErrors + fluctuation * 0.08 + (Math.random() - 0.5) * 0.05);
    let trafficRate = Math.round(50 + Math.sin(seed / 3) * 15 + (Math.random() - 0.5) * 5);

    // Apply incremental anomaly degradation trends over the last 12 points (6 hours)
    if (anomalyType !== "none" && i < 12) {
      const severityRatio = (12 - i) / 12; // 0.08 ramp to 1.0 at now
      const multiplier = severityRatio * anomalyIntensity;

      if (anomalyType === "drift") {
        dataDrift = baseDrift + multiplier * 0.14; // Drift goes up to 0.65+
        predictionFailures = baseFailures + multiplier * 1.5; // Drift degrades accuracy slightly
        latency = baseLatency + multiplier * 3; // Slighter calculation lookup overheads
      } else if (anomalyType === "latency") {
        latency = baseLatency + multiplier * 520; // Ramps LLM latency up to 2000ms+
        apiErrors = baseErrors + multiplier * 1.8; // Gateway timeouts
      } else if (anomalyType === "failure") {
        predictionFailures = baseFailures + multiplier * 8.5; // Fallback failure rate reaches 30%+
        latency = baseLatency + multiplier * 8; // Retry logic overhead
      } else if (anomalyType === "api_error") {
        apiErrors = baseErrors + multiplier * 6.5; // 5xx reaches 25%
        trafficRate = Math.max(3, trafficRate - Math.round(multiplier * 6)); // Clients giving up
      }
    }

    history.push({
      timestamp,
      latency: Math.round(Math.max(1, latency)),
      dataDrift: Math.round(Math.max(0, Math.min(1, dataDrift)) * 100) / 100,
      predictionFailures: Math.round(Math.max(0, predictionFailures) * 10) / 10,
      apiErrors: Math.round(Math.max(0, apiErrors) * 10) / 10,
      trafficRate: Math.max(1, trafficRate)
    });
  }

  return history;
}

// Generate starting histories
scenarios.forEach(s => {
  s.metricsHistory = generateMetricsHistory(s);
});

// GET all Scenarios
app.get("/api/scenarios", (req, res) => {
  res.json(scenarios);
});

// GET single Scenario + its live calculated logs
app.get("/api/scenarios/:id", (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Deployment scenario not found" });
  }
  res.json(scenario);
});

// Trigger Simulated Anomaly Scenario
app.post("/api/scenarios/:id/simulate-anomaly", (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" });
  }

  const { anomalyType, anomalyIntensity } = req.body;
  if (!["drift", "latency", "failure", "api_error"].includes(anomalyType)) {
    return res.status(400).json({ error: "Invalid anomalyType specified" });
  }

  const intensity = parseInt(anomalyIntensity, 10) || 3;

  scenario.metricsConfig.anomalyType = anomalyType;
  scenario.metricsConfig.anomalyIntensity = intensity;
  
  // Set statuses
  scenario.status = intensity >= 4 ? "critical" : "degraded";

  // Active anomaly labels and specific crash logs injection
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  if (anomalyType === "drift") {
    scenario.activeAnomalies = ["Automated drift monitor flagged divergence in demographic vectors [KS-Stat > 0.44]"];
    scenario.logs.push(
      `[WARN] ${timestamp}: KS-test statistical margin alert! Feature 'user_demographics_v2' shifted from median 28.4 to 41.6.`,
      `[WARN] ${timestamp}: Continuous monitoring detected Data Drift Index: ${((baseDrift: number) => (baseDrift + intensity * 0.14).toFixed(2))(scenario.metricsConfig.baseDrift)}. Threshold limit is 0.3.`,
      `[WARN] ${timestamp}: Model classification confidence matches shifted outward. Accuracy degrading.`,
      `[INFO] ${timestamp}: ML inference payload features skewed towards higher age groups, invalidating baseline training assumptions.`
    );
  } else if (anomalyType === "latency") {
    scenario.activeAnomalies = ["P95 Outbound Latency exceeds SLA budget threshold [> 1500ms]"];
    scenario.logs.push(
      `[ERROR] ${timestamp}: Timeout outbound HTTP POST connection to back-end LLM endpoint exceeded (3000ms SLA limit).`,
      `[CRITICAL] ${timestamp}: FastAPI event loop congestion. Active client sockets: 160/160. Threads fully saturated.`,
      `[ERROR] ${timestamp}: HTTP 504 Gateway Timeout from API Gateway proxy during deep completion processing.`,
      `[WARN] ${timestamp}: Average internal model inference duration spiked by 400% during high peak traffic loads.`
    );
  } else if (anomalyType === "failure") {
    scenario.activeAnomalies = ["Elevated model execution exceptions returned as fallback nulls"];
    scenario.logs.push(
      `[ERROR] ${timestamp}: ValueError during preprocessing: Float format conversion failed for feature key 'transaction_zipcode'.`,
      `[CRITICAL] ${timestamp}: Pipeline transformation crashed. Exception in 'LocationCategoricalEncoder.transform()'.`,
      `[WARN] ${timestamp}: Substituting fallback default values to secure main execution path. Risk scoring un-calibrated.`,
      `[ERROR] ${timestamp}: Model predict_proba() call failed. Input dimension shape [(12,)] mismatched model weights dimension [(15,)].`
    );
  } else if (anomalyType === "api_error") {
    scenario.activeAnomalies = ["5xx Server API code errors spiked on main route endpoints"];
    scenario.logs.push(
      `[ERROR] ${timestamp}: HTTP 500 Internal Server error - Traceback: File '../main.py', line 89 inside router: DB_ConnectionError.`,
      `[CRITICAL] ${timestamp}: FastAPI worker process crashed. Gunicorn master successfully initiated auto-revamp.`,
      `[ERROR] ${timestamp}: Failed to dispatch sentiment queue requests. AWS DynamoDB throughput throttled.`,
      `[CRITICAL] ${timestamp}: Out of memory error. PyTorch GPU allocation exhausted in CUDA device memory heap.`
    );
  }

  // Regenerate history graph immediately
  scenario.metricsHistory = generateMetricsHistory(scenario);

  res.json({ success: true, scenario });
});

// Recover Scenario back to baseline healthy
app.post("/api/scenarios/:id/recover", (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" });
  }

  scenario.metricsConfig.anomalyType = "none";
  scenario.metricsConfig.anomalyIntensity = 0;
  scenario.status = "healthy";
  scenario.activeAnomalies = [];
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  scenario.logs.push(
    `[INFO] ${timestamp}: Admin requested automated cluster recovery sequence.`,
    `[INFO] ${timestamp}: Restored system parameters to baseline defaults. Active anomalies purged.`,
    `[INFO] ${timestamp}: System metrics returned within normal SLA boundary conditions. All checkmarks GREEN.`
  );

  scenario.metricsHistory = generateMetricsHistory(scenario);
  res.json({ success: true, scenario });
});

// Rollback simulated deployment to previous version
app.post("/api/scenarios/:id/rollback", (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found" });
  }

  const originalVersion = scenario.version;
  const targetVersion = scenario.previousVersion;

  // Perform virtual rollback
  scenario.version = targetVersion;
  scenario.previousVersion = originalVersion; // Toggle previous to make it continuous/swappable

  // Purge anomalies & recover baseline metrics
  scenario.metricsConfig.anomalyType = "none";
  scenario.metricsConfig.anomalyIntensity = 0;
  scenario.status = "healthy";
  scenario.activeAnomalies = [];

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  scenario.lastRollback = {
    timestamp,
    fromVersion: originalVersion,
    toVersion: targetVersion
  };

  scenario.logs = [
    `[INFO] ${timestamp}: Rollback triggered to ${targetVersion} on ${scenario.environment}.`,
    `[INFO] ${timestamp}: Deploying safe manifest docker image tagged '${scenario.id}:${targetVersion}'.`,
    `[INFO] ${timestamp}: Successfully terminated containers running '${originalVersion}'.`,
    `[INFO] ${timestamp}: Spawning healthy pod instance workers. Ready to accept live traffic.`,
    `[INFO] ${timestamp}: Check metrics: Latencies, inputs, and API logs recovered completely.`
  ];

  scenario.metricsHistory = generateMetricsHistory(scenario);

  res.json({ success: true, scenario });
});

// Reset entire database simulations to defaults
app.post("/api/scenarios/reset-all", (req, res) => {
  scenarios = [
    {
      id: "recommendation-engine",
      name: "Recommendation Product API",
      version: "v2.4.0-prod",
      previousVersion: "v2.3.2-prod",
      environment: "AWS ECS (Fargate)",
      runtime: "Python 3.10, FastAPI, Docker",
      modelType: "Scikit-Learn Collaborative Filtering (Random Forest Regressor)",
      status: "healthy",
      activeAnomalies: [],
      metricsConfig: {
        baseLatency: 45,
        baseDrift: 0.11,
        baseFailures: 0.3,
        baseErrors: 0.2,
        anomalyType: "none",
        anomalyIntensity: 0
      },
      metricsHistory: [],
      logs: [
        "[INFO] Loading Scikit-learn model 'recommender_v2.4.pkl' from AWS S3 storage",
        "[INFO] Cold start successful. Model weights initialized in memory.",
        "[INFO] FastAPI listening on http://0.0.0.0:8000",
        "[INFO] Scheduled cron check: Data drift monitors normal (p-value = 0.542)",
        "[INFO] Completed 20,000 successful prediction iterations. Baseline healthy."
      ],
      lastRollback: null
    },
    {
      id: "support-chatbot",
      name: "AI Support Agent Chatbot",
      version: "v1.1.2-alpha",
      previousVersion: "v1.1.0-prod",
      environment: "Kubernetes (AWS EKS)",
      runtime: "Python 3.11, FastAPI, Gunicorn, Docker",
      modelType: "Fine-Tuned LLaMA-3 (8B Instruct / PyTorch)",
      status: "healthy",
      activeAnomalies: [],
      metricsConfig: {
        baseLatency: 280,
        baseDrift: 0.03,
        baseFailures: 1.1,
        baseErrors: 0.4,
        anomalyType: "none",
        anomalyIntensity: 0
      },
      metricsHistory: [],
      logs: [
        "[INFO] Starting Gunicorn workers on Kubernetes pod 'support-chatbot-7cb94-b12'",
        "[INFO] Loading PyTorch model weights on cuda0 GPU device.",
        "[INFO] Model weights allocation: 15.6GB / 16GB VRAM loaded successfully.",
        "[INFO] Streaming completions server listening on port 8000",
        "[INFO] Connection established successfully for client tunnel WS_9921c"
      ],
      lastRollback: null
    },
    {
      id: "fraud-guard",
      name: "Real-Time Fraud Guard",
      version: "v3.0.1-prod",
      previousVersion: "v3.0.0-prod",
      environment: "AWS Lambda (Serverless Container)",
      runtime: "Python 3.9, FastAPI, AWS Chalice",
      modelType: "XGBoost Credit-Fraud Classifier v3.0",
      status: "healthy",
      activeAnomalies: [],
      metricsConfig: {
        baseLatency: 22,
        baseDrift: 0.08,
        baseFailures: 0.2,
        baseErrors: 0.3,
        anomalyType: "none",
        anomalyIntensity: 0
      },
      metricsHistory: [],
      logs: [
        "[INFO] AWS Lambda function initialized from Docker ECR tag 'fraud-guard:v3.0.1'",
        "[INFO] Model parameters un-pickled. Feature dimensional mapping contains 31 properties.",
        "[INFO] Hot-path warm cache matched 98.4% of request geo-locations.",
        "[INFO] Transaction pipeline active. Standing ready to block threat vectors.",
        "[INFO] Latency averages: 22ms. Heartbeat active."
      ],
      lastRollback: null
    },
    {
      id: "sentiment-pipeline",
      name: "Customer Sentiment Pipeline",
      version: "v2.0.0-rc1",
      previousVersion: "v1.9.5-prod",
      environment: "AWS App Runner",
      runtime: "Python 3.10, FastAPI, HuggingFace Transformers, Docker",
      modelType: "DistilBERT Text Evaluator Ensemble",
      status: "healthy",
      activeAnomalies: [],
      metricsConfig: {
        baseLatency: 75,
        baseDrift: 0.04,
        baseFailures: 0.1,
        baseErrors: 0.1,
        anomalyType: "none",
        anomalyIntensity: 0
      },
      metricsHistory: [],
      logs: [
        "[INFO] AWS App Runner pipeline synchronization check passed.",
        "[INFO] Loaded DistilBERT tokenization dictionary.",
        "[INFO] Serving endpoints live at: https://sentiment-pr-env.aws.com/POST",
        "[INFO] Heartbeat diagnostics passed. All background services operational.",
        "[INFO] Queue utilization: 0.2%. Normal operation."
      ],
      lastRollback: null
    }
  ];

  scenarios.forEach(s => {
    s.metricsHistory = generateMetricsHistory(s);
  });

  res.json({ success: true, scenarios });
});

// POST Automated Anomaly Root Cause Analysis (RCA) route using Gemini API
app.post("/api/analyze-incident", async (req, res) => {
  const { scenarioId } = req.body;
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: "Deployment scenario not found" });
  }

  // Fallback if API key is missing
  if (!ai) {
    // Generate an automated response locally so the user can test the dashboard even if they don't have GEMINI_API_KEY set up in secrets yet
    const currentMetrics = scenario.metricsHistory[scenario.metricsHistory.length - 1];
    const isDrift = scenario.metricsConfig.anomalyType === "drift";
    const isLatency = scenario.metricsConfig.anomalyType === "latency";
    const isFailure = scenario.metricsConfig.anomalyType === "failure";
    const isApiErr = scenario.metricsConfig.anomalyType === "api_error";

    let localMock: IncidentAnalysis = {
      scenarioId: scenario.id,
      incidentTitle: isDrift ? "Gradual Demographics Data Drift Anomaly" :
                     isLatency ? "Outbound Chatbot Gateway Timeout Spike" :
                     isFailure ? "Input Validation Shape Transformation Crash" :
                     isApiErr ? "Core Router Out-Of-Memory Crash Spike" :
                     "Baseline Diagnostic Inspection Profile",
      severity: scenario.status === "healthy" ? "low" : (scenario.status === "degraded" ? "high" : "critical"),
      summary: `The service is undergoing issues. This diagnostic analysis is generated locally on the node server because process.env.GEMINI_API_KEY is not configured. To enable full generative AI diagnostics, enter your Google Gemini API key in the 'Settings > Secrets' menu in the AI Studio editor.`,
      metricsObserved: {
        latency: `${currentMetrics.latency}ms (Status: ${currentMetrics.latency > 150 ? 'VIOLATION' : 'OK'})`,
        drift: `${currentMetrics.dataDrift} D.I. (Status: ${currentMetrics.dataDrift > 0.3 ? 'DRIFT ALERT' : 'OK'})`,
        failures: `${currentMetrics.predictionFailures}% (Status: ${currentMetrics.predictionFailures > 5 ? 'ELEVATED' : 'OK'})`,
        errors: `${currentMetrics.apiErrors}% (Status: ${currentMetrics.apiErrors > 2 ? 'CRITICAL' : 'OK'})`
      },
      rootCause: isDrift ? "The statistical input data distribution has shifted. The Kolmogorow-Smirnov test highlights features such as user age vector are not aligned with pre-trained coefficients. This causes feature drift skewing predictions." :
                 isLatency ? "Exceeded open HTTP KeepAlive socket configurations while awaiting upstream model service completions. FastAPI event loop threads are saturated." :
                 isFailure ? "A ValueError exception was raised. The preprocessor pipeline is expecting 15 input variables but incoming web requests omitted non-null values for zipped fields, throwing float parser crashes." :
                 isApiErr ? "Internal Gunicorn processing container exhausted its standard memory pages under concurrent payload streams. The CUDA host aborted calculations due to unreleased PyTorch tensors." :
                 "The service matches normal operating envelope SLA bounds.",
      impactScore: scenario.status === "healthy" ? "5/100" : (scenario.status === "degraded" ? "65/100" : "90/100"),
      remediationSteps: [
        "1. Check the inbound data stream serialization schemas",
        "2. Review FastAPI container logs using AWS Cloudwatch or kubectl logs command",
        "3. Confirm upstream API provider services status",
        "4. Trigger Docker image rollback to previous version immediately if performance suffers"
      ],
      rollbackRecommendation: {
        recommended: scenario.status !== "healthy",
        reason: scenario.status !== "healthy" ? `Rollback recommended due to critical service degradation in version ${scenario.version}. Rolling back will restore production stability with ${scenario.previousVersion}.` : "System is healthy, no rollback required.",
        targetVersion: scenario.previousVersion,
        environmentTarget: scenario.environment,
        rollbackCommands: scenario.environment.includes("ECS") ? 
          `# Docker tag & push rollback commands for AWS ECS Fargate\naws ecs update-service --cluster production-ml-cluster --service ${scenario.id}-service --force-new-deployment --task-definition ${scenario.id}-${scenario.previousVersion}` :
          scenario.environment.includes("EKS") ?
          `# Kubernetes image deployment rollback \nkubectl set image deployment/${scenario.id}-deployment ${scenario.id}-container=prod-registry.io/${scenario.id}:${scenario.previousVersion}\nkubectl rollout status deployment/${scenario.id}-deployment` :
          scenario.environment.includes("Lambda") ?
          `# AWS Lambda Function rollback command\naws lambda update-function-code --function-name ${scenario.id}-lambda --image-uri prod-registry.io/${scenario.id}:${scenario.previousVersion}` :
          `# Standalone general Docker Rollback commands\ndocker pull registry.hub.docker.com/production/${scenario.id}:${scenario.previousVersion}\ndocker tag registry.hub.docker.com/production/${scenario.id}:${scenario.previousVersion} live-app:latest\ndocker run -d -p 3000:3000 --name ${scenario.id}-container live-app:latest`
      }
    };

    return res.json(localMock);
  }

  // Real Gemini logic
  const currentMetrics = scenario.metricsHistory[scenario.metricsHistory.length - 1];
  const midMetrics = scenario.metricsHistory[Math.floor(scenario.metricsHistory.length / 2)];
  const baselineMetrics = scenario.metricsHistory[0];

  const promptText = `
    You are an expert Principal AI Reliability Engineer (MLOps SRE).
    Analyze the model degradation or API telemetry failure signals for service "${scenario.name}".
    
    SYSTEM ATTRIBUTES:
    - Service Identifier: ${scenario.id}
    - Deployed Release Version: ${scenario.version}
    - Rollback Release Version Target: ${scenario.previousVersion}
    - Deployment Infrastructure: ${scenario.environment}
    - Server Runtime Stack: ${scenario.runtime}
    - ML / LLM Model Stack: ${scenario.modelType}
    - Current System Operational State: ${scenario.status}
    
    TIME-SERIES METRIC SIGNALS (Baseline baseline -> 12-hour midpoint -> Current now):
    - P95 Response Latency: ${baselineMetrics.latency}ms -> ${midMetrics.latency}ms -> ${currentMetrics.latency}ms
    - Feature/Data Drift Index: ${baselineMetrics.dataDrift} -> ${midMetrics.dataDrift} -> ${currentMetrics.dataDrift} (drift metrics scale 0.0 - 1.0, warning starts > 0.3)
    - Prediction Failures (% of total): ${baselineMetrics.predictionFailures}% -> ${midMetrics.predictionFailures}% -> ${currentMetrics.predictionFailures}%
    - API HTTP 5xx Server Errors (%): ${baselineMetrics.apiErrors}% -> ${midMetrics.apiErrors}% -> ${currentMetrics.apiErrors}%
    - Active Simulated Anomalies flagged: ${scenario.activeAnomalies.join(", ") || "None declared"}
    
    RECENT CONSOLE CONTAINER STDERR/STDOUT TRACES:
    ${scenario.logs.join("\n")}
    
    Your goal is to parse this telemetry sequence, diagnose the logical ROOT CAUSE, calculate the operational risk score (0 to 100), define the diagnostic remediation triage points, and provide detailed rollback instructions.
    Your rollback command should be robust, highly technical, and configure native AWS CLI/ECS commands, kubectl Docker commands, or Lambda commands (e.g., aws ecs update-service, kubectl set image, aws lambda, etc.) configured fully for this specific stack.
    Return your response strictly in the required raw JSON structure. Do not output any markdown wrappers such as \`\`\`json. Return bare parseable JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are a rigorousMLOps and Reliability AI assistant. You generate structured system root-cause analyses in JSON conforming exactly to the parameters outlined.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenarioId: { type: Type.STRING },
            incidentTitle: { type: Type.STRING },
            severity: { type: Type.STRING, description: "Must be low, medium, high, or critical" },
            summary: { type: Type.STRING },
            metricsObserved: {
              type: Type.OBJECT,
              properties: {
                latency: { type: Type.STRING },
                drift: { type: Type.STRING },
                failures: { type: Type.STRING },
                errors: { type: Type.STRING }
              },
              required: ["latency", "drift", "failures", "errors"]
            },
            rootCause: { type: Type.STRING, description: "Deep tech-focused analysis on why this happened, citing specific log issues or mismatched variables." },
            impactScore: { type: Type.STRING, description: "Numerical impact range e.g., '85/100 due to severe payment process blockages'" },
            remediationSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            rollbackRecommendation: {
              type: Type.OBJECT,
              properties: {
                recommended: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
                targetVersion: { type: Type.STRING },
                environmentTarget: { type: Type.STRING },
                rollbackCommands: { type: Type.STRING, description: "Raw executable lines of bash CLI code to rollback this stack successfully" }
              },
              required: ["recommended", "reason", "targetVersion", "environmentTarget", "rollbackCommands"]
            }
          },
          required: [
            "scenarioId", "incidentTitle", "severity", "summary", "metricsObserved", "rootCause", "impactScore", "remediationSteps", "rollbackRecommendation"
          ]
        }
      }
    });

    const textOutput = response.text;
    const parsed = JSON.parse(textOutput.trim());
    res.json(parsed);

  } catch (error: any) {
    console.error("Gemini runtime analysis failure:", error);
    res.status(500).json({ error: "Failed to query Gemini model. Reason: " + (error.message || error) });
  }
});


// Boot the Server with Vite Middleware or Production Statics
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Monitoring Server running at http://0.0.0.0:${PORT}`);
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is missing on server startup. The server will use automated local ML diagnostic mock scripts instead of real generative Gemini calls.");
    } else {
      console.log("SUCCESS: GEMINI_API_KEY detected. Gemini models operational for root-cause analysis.");
    }
  });
}

startServer();
