# Reinforcement Learning with Langfuse Traces

## Overview
Use Langfuse observability data to create a reinforcement learning feedback loop that continuously improves the X-Men agent system.

## The RL Loop

```
┌─────────────────┐
│ Agent executes  │
│ task (PRD, code,│
│ validation,etc.)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Langfuse logs:  │
│ - Prompts       │
│ - Responses     │
│ - Token usage   │
│ - Latency       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Score the       │
│ outcome:        │
│ - UAT pass/fail │
│ - Code quality  │
│ - User feedback │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analyze traces: │
│ - What worked?  │
│ - What failed?  │
│ - Patterns?     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Optimize:       │
│ - Adjust prompts│
│ - Switch models │
│ - Refine logic  │
└────────┬────────┘
         │
         └──────────┐
                    │
         ┌──────────▼────────┐
         │ Next iteration    │
         │ (improved)        │
         └───────────────────┘
```

## Scoring Mechanisms

### 1. Automatic Scoring
Built-in scoring based on observable outcomes:

**Code Quality (Wolverine)**
- Linting errors: 0 errors = score 1.0
- Test pass rate: 100% pass = score 1.0
- Security scan: No vulns = score 1.0

**UAT Validation (Magneto)**
- All requirements met = score 1.0
- Partial = score 0.5
- Failure = score 0.0

**Task Completion**
- Success = score 1.0
- Partial = score 0.5
- Blocked/Failed = score 0.0

### 2. Manual Scoring
Agents or users can score any task:

```typescript
langfuse_score({
  scoreName: "task_success",
  value: 1.0,
  comment: "All requirements met, clean code, tests passing"
})
```

**Score types:**
- `uat_pass` - UAT validation result (0 or 1)
- `code_quality` - Code quality rating (0-1)
- `user_satisfaction` - User feedback (0-1)
- `task_complexity` - How hard was this? (0-1)
- `prompt_effectiveness` - Did the prompt work? (0-1)

### 3. Outcome-Based Scoring
Score based on real-world results:

- **PR merged** → score 1.0
- **PR rejected** → score 0.0
- **Iteration required** → score 0.5
- **User complained** → score 0.0
- **User praised** → score 1.0

## Data Collection

### What Langfuse Captures
**For every agent interaction:**
- Full conversation history (prompts + responses)
- Model used
- Token usage (prompt, completion, total)
- Latency (ms)
- Success/failure status
- Agent ID, channel, session key

**For every scored task:**
- Score value (numeric)
- Score name (category)
- Comment (explanation)
- Timestamp

### Query Examples
**Find all failing Wolverine code generations:**
```
tags: agent:wolverine
scores.uat_pass: < 0.5
```

**Find expensive operations:**
```
usage.totalTokens: > 50000
sort: usage.totalTokens desc
```

**Find slow agents:**
```
metadata.latencyMs: > 10000
group_by: metadata.agentId
```

## Analysis Strategies

### 1. Pattern Recognition
**Question:** What prompts lead to successful UAT?

**Method:**
1. Filter traces: `scores.uat_pass = 1.0`
2. Extract successful prompts
3. Compare vs failed prompts
4. Identify common patterns

**Action:** Update agent SOUL.md or AGENTS.md with successful patterns

### 2. Model Performance
**Question:** Which model performs best for PRD writing?

**Method:**
1. Group traces by: `tags: agent:beast, model:<model_name>`
2. Calculate avg scores per model
3. Compare cost vs quality

**Action:** Switch Beast to best-performing model

### 3. Cost Optimization
**Question:** Where are we wasting tokens?

**Method:**
1. Find high-token traces: `usage.totalTokens > 100k`
2. Analyze input size
3. Check for redundant context

**Action:** Trim workspace files, optimize context injection

### 4. Latency Optimization
**Question:** Why is Magneto slow?

**Method:**
1. Filter: `tags: agent:magneto`
2. Sort by: `metadata.latencyMs desc`
3. Check for long prompts or complex logic

**Action:** Parallelize validation steps, reduce context

## Prompt Optimization

### Manual Approach
1. Find failing traces for specific task type
2. Read successful vs failed prompts
3. Manually adjust SOUL.md or skill instructions
4. Test new approach
5. Score new attempts
6. Compare before/after

### Automated Approach (Future)
1. Export successful traces to training data
2. Fine-tune model on successful patterns
3. A/B test: old prompt vs optimized
4. Track score delta
5. Roll out winner

## Integration with X-Men Workflow

### Beast (PRD Writer)
**Score:** PRD completeness (Magneto validates against checklist)
```typescript
langfuse_score({
  scoreName: "prd_complete",
  value: checklistScore, // 0-1 based on items checked
  comment: "Missing edge case documentation"
})
```

### Wolverine (Coder)
**Score:** Code quality + UAT pass
```typescript
langfuse_score({
  scoreName: "code_quality",
  value: lintScore * testScore * securityScore,
  comment: "3 linting errors, 2 test failures"
})
```

### Magneto (Validator)
**Score:** Validation accuracy (did Magneto catch bugs that users found later?)
```typescript
langfuse_score({
  scoreName: "validation_accuracy",
  value: bugsFound / (bugsFound + bugsMissed),
  comment: "Missed SQL injection vuln"
})
```

### Gambit (Orchestrator)
**Score:** Task routing efficiency (did he pick the right agent?)
```typescript
langfuse_score({
  scoreName: "routing_efficiency",
  value: firstAttemptSuccess ? 1.0 : 0.0,
  comment: "Routed to Beast, should have gone to Wolverine"
})
```

## Actionable Insights

### Weekly Review
Every week, run these queries:

1. **Top performers:**
   - `group_by: agentId`
   - `avg: scores.task_success`
   - **Action:** Identify what top agents do differently

2. **Cost hogs:**
   - `group_by: agentId`
   - `sum: usage.totalTokens`
   - **Action:** Optimize high-token agents

3. **Failed missions:**
   - `scores.task_success < 0.5`
   - `group_by: tags`
   - **Action:** Fix recurring failure patterns

### Monthly Optimization
1. Export all traces to CSV
2. Analyze in spreadsheet/Jupyter
3. Identify:
   - Best prompts for each agent
   - Best models for each task type
   - Most expensive operations
   - Common failure modes
4. Update agent configs
5. Measure improvement month-over-month

## Advanced: Prompt A/B Testing

### Setup
1. Create two prompt variants in SOUL.md (A and B)
2. Randomly assign variant per task
3. Tag traces: `variant:A` or `variant:B`
4. Score outcomes

### Analysis
```
Filter: tags=variant:A
Avg score: 0.78

Filter: tags=variant:B
Avg score: 0.92

Result: B wins! Roll out to all.
```

### Implementation
```typescript
const variant = Math.random() > 0.5 ? "A" : "B";
const prompt = variant === "A" ? promptA : promptB;

// ... execute task ...

langfuse_score({
  scoreName: "task_success",
  value: success ? 1.0 : 0.0,
  comment: `variant:${variant}`
});
```

## Future: Autonomous Learning

### Vision
Agents continuously improve themselves without human intervention.

**How:**
1. **Auto-score** all tasks (UAT, lint, tests)
2. **Auto-analyze** weekly (find patterns)
3. **Auto-optimize** prompts (fine-tune or rewrite)
4. **Auto-test** new approaches (A/B test)
5. **Auto-rollout** winners (update SOUL.md via PR)

**Requirements:**
- Langfuse API integration
- Automated scoring pipeline
- Pattern recognition ML model
- Prompt optimization model
- CI/CD for agent config updates

**Timeline:**
- Phase 1 (now): Manual scoring + manual analysis
- Phase 2 (1 month): Automated scoring + dashboards
- Phase 3 (3 months): Automated prompt optimization
- Phase 4 (6 months): Fully autonomous learning loop

## Metrics to Track

### Agent-Level
- Avg task success rate (per agent)
- Avg tokens per task (per agent)
- Avg latency (per agent)
- Cost per successful task (per agent)

### System-Level
- Overall mission success rate
- Total cost per day/week/month
- Avg time to completion (per mission type)
- User satisfaction score

### Improvement Over Time
- Week-over-week success rate delta
- Month-over-month cost reduction
- Quarter-over-quarter latency improvement

## Getting Started

### Step 1: Start Scoring
Add scoring to your workflow:

**In Magneto validation:**
```typescript
if (uatPass) {
  langfuse_score({ scoreName: "uat_pass", value: 1.0 });
} else {
  langfuse_score({ scoreName: "uat_pass", value: 0.0, comment: reasons });
}
```

**In Wolverine code delivery:**
```typescript
const quality = lintClean && testsPass && securityClean ? 1.0 : 0.5;
langfuse_score({ scoreName: "code_quality", value: quality });
```

### Step 2: Weekly Review
Every Friday, check Langfuse:
- Top 10 successful traces → what did they do right?
- Top 10 failed traces → what went wrong?
- Export findings to a doc

### Step 3: Iterate
Update agent configs based on findings:
- Adjust SOUL.md tone/approach
- Update AGENTS.md workflows
- Modify skill logic
- Switch models

### Step 4: Measure
Next week, compare scores:
- Did success rate improve?
- Did cost go down?
- Did latency improve?

Repeat forever. 🐺

---

**Questions?** Check Langfuse docs: https://langfuse.com/docs/scores
