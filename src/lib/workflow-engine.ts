/**
 * Workflow Engine - Orchestrates multi-step AI agent workflows
 * Supports: ai_prompt, condition, transform, delay, webhook_call, parallel
 */

import { db } from "@/lib/db";
import { resolveProvider, chatCompletion, PROVIDERS, type ProviderId } from "@/lib/ai-providers";

// ─── Types ────────────────────────────────────────────────────────────

export interface StepDefinition {
  id: string;
  type: "ai_prompt" | "condition" | "transform" | "delay" | "webhook_call" | "parallel";
  name?: string;
  config: Record<string, unknown>;
  nextStep?: string;      // ID of next step (or for condition: "true" branch)
  nextStepFalse?: string; // For condition: "false" branch
  // For parallel: sub-steps
  subSteps?: StepDefinition[];
}

export interface ExecutionContext {
  input: Record<string, unknown>;
  steps: Record<string, { output: unknown; status: string }>;
  workflowId: string;
  executionId: string;
  userId: string;
}

// ─── Template Resolution ──────────────────────────────────────────────

/**
 * Replace {{variables}} in a template string with values from the execution context.
 * Supports: {{input.key}}, {{steps.stepId.output.key}}, {{steps.stepId.output}}
 */
export function resolveTemplate(template: string, context: ExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const trimmed = path.trim();
    const parts = trimmed.split(".");

    try {
      let value: unknown = context;

      for (const part of parts) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[part];
        } else {
          return `{{${trimmed}}}`; // Can't resolve, leave as-is
        }
      }

      if (value === undefined || value === null) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    } catch {
      return `{{${trimmed}}}`;
    }
  });
}

/**
 * Resolve a value that could be a string template or direct value
 */
function resolveValue(val: unknown, context: ExecutionContext): unknown {
  if (typeof val === "string") {
    return resolveTemplate(val, context);
  }
  return val;
}

// ─── Step Executors ───────────────────────────────────────────────────

async function executeAiPrompt(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const { agentId, prompt, model: requestedModel } = step.config as {
    agentId?: string;
    prompt?: string;
    model?: string;
  };

  if (!prompt) {
    throw new Error(`Step ${step.id}: prompt is required for ai_prompt`);
  }

  const resolvedPrompt = resolveTemplate(prompt, context);

  // If agentId provided, use that agent's system prompt
  let systemPrompt = "Tu es un assistant IA utile et professionnel. Réponds en français.";
  if (agentId) {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (agent) {
      systemPrompt = agent.systemPrompt;
    }
  }

  // Resolve AI provider
  const providerInfo = await resolveProvider(context.userId);
  if (!providerInfo) {
    // Fallback to z-ai-web-dev-sdk
    try {
      const { getZAI } = await import("@/lib/zai");
      const zai = await getZAI();
      const result = await zai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: resolvedPrompt },
        ],
      });
      const responseText = result.choices?.[0]?.message?.content || result.text || result.content || "";
      return {
        output: typeof responseText === "string" ? responseText : JSON.stringify(responseText),
        nextStep: step.nextStep,
      };
    } catch (err) {
      throw new Error(`Step ${step.id}: Aucun fournisseur IA disponible`);
    }
  }

  const { provider, apiKey, model } = providerInfo;
  const actualModel = (requestedModel && requestedModel !== "auto") ? requestedModel : model;

  const result = await chatCompletion({
    provider,
    apiKey,
    model: actualModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: resolvedPrompt },
    ],
    temperature: 0.7,
    maxTokens: 2048,
  });

  return {
    output: result.content,
    nextStep: step.nextStep,
  };
}

async function executeCondition(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const { field, operator, value, trueStep, falseStep } = step.config as {
    field?: string;
    operator?: string;
    value?: unknown;
    trueStep?: string;
    falseStep?: string;
  };

  if (!field || !operator) {
    throw new Error(`Step ${step.id}: field and operator required for condition`);
  }

  // Resolve the field value from context
  const resolvedField = resolveTemplate(`{{${field}}}`, context);
  const resolvedValue = typeof value === "string" ? resolveTemplate(value, context) : value;

  let conditionMet = false;

  switch (operator) {
    case "equals":
    case "==":
      conditionMet = resolvedField === String(resolvedValue);
      break;
    case "not_equals":
    case "!=":
      conditionMet = resolvedField !== String(resolvedValue);
      break;
    case "contains":
      conditionMet = resolvedField.includes(String(resolvedValue));
      break;
    case "greater_than":
    case ">":
      conditionMet = parseFloat(resolvedField) > parseFloat(String(resolvedValue));
      break;
    case "less_than":
    case "<":
      conditionMet = parseFloat(resolvedField) < parseFloat(String(resolvedValue));
      break;
    case "exists":
      conditionMet = resolvedField !== "" && resolvedField !== "undefined" && resolvedField !== "null";
      break;
    default:
      conditionMet = resolvedField === String(resolvedValue);
  }

  return {
    output: { conditionMet, field: resolvedField, operator, comparedTo: resolvedValue },
    nextStep: conditionMet
      ? (trueStep || step.nextStep)
      : (falseStep || step.nextStepFalse),
  };
}

async function executeTransform(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const { template, format } = step.config as {
    template?: string;
    format?: string; // "json" | "text" | "array"
  };

  if (!template) {
    throw new Error(`Step ${step.id}: template required for transform`);
  }

  const resolved = resolveTemplate(template, context);

  let output: unknown;
  switch (format) {
    case "json": {
      try {
        output = JSON.parse(resolved);
      } catch {
        output = { error: "Invalid JSON", raw: resolved };
      }
      break;
    }
    case "array": {
      try {
        const parsed = JSON.parse(resolved);
        output = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        output = resolved.split("\n").filter(Boolean);
      }
      break;
    }
    default:
      output = resolved;
  }

  return { output, nextStep: step.nextStep };
}

async function executeDelay(
  step: StepDefinition,
  _context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const { duration, unit } = step.config as { duration?: number; unit?: string };

  const ms = (duration || 1) * (unit === "seconds" ? 1000 : unit === "minutes" ? 60000 : 1000);

  await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 30000))); // Cap at 30s

  return {
    output: { delayed: true, duration, unit: unit || "seconds" },
    nextStep: step.nextStep,
  };
}

async function executeWebhookCall(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const { url, method, headers, body } = step.config as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };

  if (!url) {
    throw new Error(`Step ${step.id}: url required for webhook_call`);
  }

  const resolvedUrl = resolveTemplate(url, context);
  const resolvedBody = body ? resolveTemplate(body, context) : undefined;

  try {
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers || {}),
    };

    const response = await fetch(resolvedUrl, {
      method: method || "POST",
      headers: fetchHeaders,
      body: resolvedBody ? resolvedBody : undefined,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();

    let output: unknown;
    try {
      output = JSON.parse(responseText);
    } catch {
      output = responseText;
    }

    return {
      output: { status: response.status, data: output },
      nextStep: step.nextStep,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      output: { error: errorMessage, status: "failed" },
      nextStep: step.nextStep,
    };
  }
}

async function executeParallel(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  const subSteps = step.subSteps || [];
  if (subSteps.length === 0) {
    return { output: {}, nextStep: step.nextStep };
  }

  // Execute all sub-steps concurrently
  const results = await Promise.allSettled(
    subSteps.map((subStep) => executeStep(subStep, context))
  );

  const output: Record<string, unknown> = {};
  results.forEach((result, idx) => {
    const subStep = subSteps[idx];
    if (result.status === "fulfilled") {
      output[subStep.id || `step_${idx}`] = result.value.output;
    } else {
      output[subStep.id || `step_${idx}`] = { error: result.reason?.message || "Failed" };
    }
  });

  return { output, nextStep: step.nextStep };
}

// ─── Main Step Executor ───────────────────────────────────────────────

export async function executeStep(
  step: StepDefinition,
  context: ExecutionContext
): Promise<{ output: unknown; nextStep: string | undefined }> {
  switch (step.type) {
    case "ai_prompt":
      return executeAiPrompt(step, context);
    case "condition":
      return executeCondition(step, context);
    case "transform":
      return executeTransform(step, context);
    case "delay":
      return executeDelay(step, context);
    case "webhook_call":
      return executeWebhookCall(step, context);
    case "parallel":
      return executeParallel(step, context);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

// ─── Workflow Execution ───────────────────────────────────────────────

/**
 * Execute a workflow from start to finish
 */
export async function executeWorkflow(
  workflowId: string,
  input: Record<string, unknown> = {}
): Promise<{ executionId: string; status: string; output: unknown; error?: string }> {
  // Fetch the workflow
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { user: true },
  });

  if (!workflow) {
    throw new Error("Workflow non trouvé");
  }

  // Parse steps
  let steps: StepDefinition[];
  try {
    steps = JSON.parse(workflow.steps);
  } catch {
    throw new Error("Étapes du workflow invalides");
  }

  if (!steps || steps.length === 0) {
    throw new Error("Le workflow n'a aucune étape");
  }

  // Create execution record
  const execution = await db.workflowExecution.create({
    data: {
      workflowId,
      status: "running",
      currentStep: 0,
      input: JSON.stringify(input),
      startedAt: new Date(),
    },
  });

  const context: ExecutionContext = {
    input,
    steps: {},
    workflowId,
    executionId: execution.id,
    userId: workflow.userId,
  };

  try {
    // Start from first step
    let currentStepIndex = 0;
    let currentStep: StepDefinition | undefined = steps[0];
    let stepOutputs: Record<string, unknown> = {};
    let maxIterations = 50; // Prevent infinite loops
    let iteration = 0;

    while (currentStep && iteration < maxIterations) {
      iteration++;

      // Update execution progress
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: { currentStep: currentStepIndex },
      });

      // Execute the step
      const result = await executeStep(currentStep, context);

      // Store step output in context
      context.steps[currentStep.id] = {
        output: result.output,
        status: "completed",
      };

      stepOutputs[currentStep.id] = result.output;

      // Determine next step
      if (result.nextStep) {
        const nextIdx = steps.findIndex((s) => s.id === result.nextStep);
        if (nextIdx >= 0) {
          currentStepIndex = nextIdx;
          currentStep = steps[nextIdx];
        } else {
          currentStep = undefined; // Unknown next step, end workflow
        }
      } else {
        // Default: go to next step in sequence
        currentStepIndex++;
        currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : undefined;
      }
    }

    // Mark execution as completed
    const finalOutput = stepOutputs;
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        output: JSON.stringify(finalOutput),
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "completed",
      output: finalOutput,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";

    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "failed",
      output: null,
      error: errorMessage,
    };
  }
}

/**
 * Get template workflow definitions
 */
export function getTemplateWorkflows(): Array<{
  name: string;
  description: string;
  steps: StepDefinition[];
}> {
  return [
    {
      name: "Analyse de données",
      description: "Recherche web → Analyse IA → Transformation des résultats",
      steps: [
        {
          id: "search",
          type: "ai_prompt",
          name: "Recherche web",
          config: {
            prompt: "Recherche des informations sur: {{input.query}}. Fournis une analyse détaillée avec des données chiffrées.",
          },
          nextStep: "analyze",
        },
        {
          id: "analyze",
          type: "ai_prompt",
          name: "Analyse IA",
          config: {
            prompt: "Analyse les données suivantes et fournis des insights actionnables:\n\n{{steps.search.output}}",
          },
          nextStep: "format",
        },
        {
          id: "format",
          type: "transform",
          name: "Formatage",
          config: {
            template: "📊 Rapport d'analyse\n\n🔍 Requête: {{input.query}}\n\n📝 Résultats:\n{{steps.analyze.output}}",
            format: "text",
          },
        },
      ],
    },
    {
      name: "Génération de rapport",
      description: "Génération IA → Transformation → Révision IA",
      steps: [
        {
          id: "generate",
          type: "ai_prompt",
          name: "Génération initiale",
          config: {
            prompt: "Génère un rapport professionnel sur le sujet suivant: {{input.topic}}. Structure avec introduction, développement et conclusion.",
          },
          nextStep: "transform",
        },
        {
          id: "transform",
          type: "transform",
          name: "Mise en forme",
          config: {
            template: "═══ RAPPORT ═══\n\n{{steps.generate.output}}\n\n═══ FIN DU RAPPORT ═══",
            format: "text",
          },
          nextStep: "review",
        },
        {
          id: "review",
          type: "ai_prompt",
          name: "Révision finale",
          config: {
            prompt: "Relis et améliore le rapport suivant. Rends-le plus professionnel et corrige les erreurs:\n\n{{steps.transform.output}}",
          },
        },
      ],
    },
    {
      name: "Veille concurrentielle",
      description: "Recherche → Analyse → Condition (alerte ou résumé)",
      steps: [
        {
          id: "research",
          type: "ai_prompt",
          name: "Recherche concurrentielle",
          config: {
            prompt: "Analyse le marché et les concurrents pour: {{input.subject}}. Identifie les tendances clés, menaces et opportunités.",
          },
          nextStep: "evaluate",
        },
        {
          id: "evaluate",
          type: "condition",
          name: "Évaluation du risque",
          config: {
            field: "input.riskLevel",
            operator: "equals",
            value: "high",
            trueStep: "alert",
            falseStep: "summary",
          },
          nextStep: "alert",
          nextStepFalse: "summary",
        },
        {
          id: "alert",
          type: "transform",
          name: "Alerte urgente",
          config: {
            template: "🚨 ALERTE CONCURRENTIELLE 🚨\n\n{{steps.research.output}}\n\n⚠️ Risque élevé détecté - Action immédiate requise",
            format: "text",
          },
        },
        {
          id: "summary",
          type: "transform",
          name: "Résumé veille",
          config: {
            template: "📋 Veille Concurrentielle\n\n{{steps.research.output}}\n\n✅ Pas de risque majeur identifié",
            format: "text",
          },
        },
      ],
    },
  ];
}
