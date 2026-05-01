# Task: AI Agent Workflow/Orchestration AND Function Calling/Tool Use

## Agent: Main Developer
## Task ID: workflow-function-calling

## Summary of Work Completed

### PART 1: Prisma Schema Updated
- Added `Workflow` model with fields: id, userId, name, description, steps (JSON), isActive, timestamps, relations to User and WorkflowExecution
- Added `WorkflowExecution` model with fields: id, workflowId, status, currentStep, input (JSON), output (JSON), error, startedAt, completedAt, timestamps
- Added `AgentTool` model with fields: id, agentId, name, description, parameters (JSON Schema), type, isActive, unique constraint on [agentId, name]
- Added `workflows Workflow[]` to User model
- Added `tools AgentTool[]` to Agent model
- Ran `npx prisma db push --accept-data-loss` successfully

### PART 2: Workflow Engine Library
Created `/src/lib/workflow-engine.ts` with:
- **Step types**: ai_prompt, condition, transform, delay, webhook_call, parallel
- **resolveTemplate()**: Replaces {{variables}} with values from execution context (supports input.key, steps.stepId.output)
- **executeStep()**: Routes to appropriate step executor
- **executeWorkflow()**: Main orchestrator - creates execution record, iterates through steps, handles errors, updates status
- **getTemplateWorkflows()**: Returns 3 template workflows (Analyse de données, Génération de rapport, Veille concurrentielle)

### PART 3: Function Calling / Tool Use Library
Created `/src/lib/agent-tools.ts` with:
- **6 built-in tools**: web_search, calculator, code_executor, json_transform, text_analysis, datetime
- **processToolCalls()**: Main function that handles tool calling with both native and prompt-based approaches
- **Native function calling**: For OpenAI, Groq, Anthropic - uses tools/functions API parameter
- **Prompt-based fallback**: For providers without native support - adds tool descriptions to system prompt, parses `<<<TOOL_CALL>>>` markers
- **Tool execution**: Safe sandboxed execution for each tool type

### PART 4: Workflow API Routes
- **GET /api/workflows**: List user's workflows with last execution status
- **POST /api/workflows**: Create workflow with name, description, steps
- **GET /api/workflows/[id]**: Get workflow with execution history
- **PATCH /api/workflows/[id]**: Update workflow (with ownership verification)
- **DELETE /api/workflows/[id]**: Delete workflow (with ownership verification)
- **POST /api/workflows/[id]/execute**: Execute workflow with input data

### PART 5: Agent Tools API Routes
- **GET /api/agents/[id]/tools**: List agent's tools + available built-in tools not yet added
- **POST /api/agents/[id]/tools**: Add tool to agent (builtin or custom)
- **DELETE /api/agents/[id]/tools**: Remove tool from agent (by toolId or toolName)

### PART 6: WorkflowsView Component
Created `/src/components/datasphere/WorkflowsView.tsx` with:
- **Workflow List**: Cards with name, description, step count, last execution status badge
- **Workflow Builder**: Visual step editor with add step dropdown, step cards with reorder buttons, config panel for each step type
- **Workflow Execution View**: Input form (JSON), execute button, real-time progress, step-by-step results, final output display
- **Template Workflows**: 3 pre-built templates (Analyse de données, Génération de rapport, Veille concurrentielle)
- Emerald/teal theme, shadcn/ui, framer-motion animations
- All UI text in French
- StatusBadge component defined outside main component to avoid render-time creation lint error

### PART 7: Integration
- **Sidebar.tsx**: Added `{ id: 'workflows', label: 'Workflows', icon: GitBranch }` between webbuilder and saas-generator
- **page.tsx**: Imported WorkflowsView, added case 'workflows' in renderView
- **MobileNav.tsx**: Added 'workflows' to all navigation arrays for "Plus" menu active state
- **chat-stream/route.ts**: Added import of `processToolCalls`, fetch agent tools after fetching agent, if tools exist use processToolCalls (non-streaming with simulated streaming output), falls back to normal streaming if tool calling fails

### Lint Status
All lint errors resolved. `bun run lint` passes cleanly.
