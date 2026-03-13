# OpenClaw Langfuse Integration

LLM observability for the OpenClaw multi-agent system. Track costs, performance, and quality across all agents and missions.

## Features

✅ **LLM Call Tracking:** Automatically capture all model requests (Anthropic, OpenAI, Google, OpenRouter)  
✅ **Multi-Agent Traces:** End-to-end visibility across Gambit → Beast → Wolverine → Magneto workflows  
✅ **Cost Attribution:** Know which agent/mission consumed what tokens and cost  
✅ **Performance Metrics:** Latency, token usage, error rates per agent  
✅ **Quality Scores:** Track UAT pass rates, completion times, user satisfaction  
✅ **Flexible Hosting:** Langfuse Cloud or self-hosted on Fly.io/Railway  

## Installation

```bash
npm install openclaw-langfuse
```

## Quick Start

### 1. Set Up Langfuse

**Option A: Langfuse Cloud (Recommended)**
1. Sign up at https://cloud.langfuse.com
2. Create a new project
3. Copy your public and secret keys

**Option B: Self-Hosted**
1. Deploy Langfuse to Fly.io/Railway
2. Follow https://langfuse.com/docs/deployment/self-host
3. Use your custom base URL

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Langfuse keys
```

### 3. Integrate with OpenClaw Gateway

Add to your OpenClaw gateway initialization:

```javascript
import { OpenClawMiddleware } from 'openclaw-langfuse';

// Initialize middleware
const langfuse = new OpenClawMiddleware({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
  enabled: process.env.LANGFUSE_ENABLED !== 'false'
});

// Hook into model request lifecycle
async function makeModelRequest(sessionKey, agentId, model, messages, params, metadata) {
  // Before request
  const tracking = langfuse.beforeRequest({
    sessionKey,
    agentId,
    model,
    messages,
    parameters: params,
    metadata: {
      missionId: metadata.missionId,
      phase: metadata.phase,
      userId: metadata.userId,
      channel: metadata.channel
    }
  });

  try {
    // Make actual LLM API call
    const response = await callLLMProvider(model, messages, params);

    // After successful request
    langfuse.afterRequest({
      ...tracking,
      output: response.choices[0].message,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      metadata: {
        model: response.model,
        finishReason: response.choices[0].finish_reason
      }
    });

    return response;
  } catch (error) {
    // Track errors
    langfuse.afterRequest({
      ...tracking,
      error,
      metadata: { errorType: error.name }
    });
    throw error;
  }
}

// Track agent actions (tool calls, sessions, handoffs)
langfuse.trackAction({
  sessionKey: 'agent:gambit:main',
  agentId: 'gambit',
  actionName: 'sessions_spawn',
  input: { task: 'Write PRD for Langfuse integration', runtime: 'subagent' },
  output: { sessionKey: 'agent:beast:xyz123', status: 'spawned' },
  startTime: startTime,
  endTime: new Date(),
  metadata: { missionId: 'PRD-LANGFUSE' }
});

// Score missions (UAT results, completion metrics)
langfuse.scoreMission({
  sessionKey: 'agent:magneto:abc789',
  scoreName: 'uat_pass',
  value: 1, // 1 = pass, 0 = fail
  comment: 'All requirements met. Clean implementation.'
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await langfuse.flush();
  await langfuse.shutdown();
});
```

## Usage Examples

### Track a Multi-Agent Mission

```javascript
// 1. Gambit receives user request
const tracking = langfuse.beforeRequest({
  sessionKey: 'agent:gambit:main',
  agentId: 'gambit',
  model: 'anthropic/claude-sonnet-4-5',
  messages: [{ role: 'user', content: 'Build a new feature: user dashboard' }],
  metadata: { 
    missionId: 'IDEA-20260312-001', 
    phase: 'ideation',
    channel: 'discord'
  }
});

// 2. Gambit spawns Beast for PRD
langfuse.trackAction({
  sessionKey: 'agent:gambit:main',
  agentId: 'gambit',
  actionName: 'sessions_spawn',
  input: { agent: 'beast', task: 'Write PRD for user dashboard' },
  output: { sessionKey: 'agent:beast:xyz', status: 'spawned' }
});

// 3. Beast writes PRD (tracked automatically via middleware)

// 4. Wolverine implements code (tracked automatically)

// 5. Magneto validates (score the result)
langfuse.scoreMission({
  sessionKey: 'agent:magneto:abc',
  scoreName: 'validation_result',
  value: 1, // Pass
  comment: 'All acceptance criteria met. Approved for merge.'
});
```

### Cost Attribution

In Langfuse dashboard:
1. Go to **Traces** → Filter by `mission:20260312-001`
2. View **Token Usage** and **Cost** breakdown
3. Drill down to see which agent consumed what

### Performance Monitoring

Query Langfuse for:
- **Average latency per agent:** Which agents are slow?
- **Error rates:** Which models/providers fail most?
- **Token efficiency:** Which agents use tokens wastefully?

## API Reference

### `OpenClawMiddleware`

**Constructor:**
```javascript
new OpenClawMiddleware(config)
```
- `config.publicKey` - Langfuse public key
- `config.secretKey` - Langfuse secret key
- `config.baseUrl` - Langfuse endpoint (default: cloud.langfuse.com)
- `config.enabled` - Enable/disable tracking (default: true)

**Methods:**

- `beforeRequest({ sessionKey, agentId, model, messages, parameters, metadata })` - Call before LLM request
- `afterRequest({ traceId, generationId, startTime, model, input, output, usage, error, metadata })` - Call after LLM response
- `trackAction({ sessionKey, agentId, actionName, input, output, startTime, endTime, metadata, error })` - Track agent actions
- `scoreMission({ sessionKey, scoreName, value, comment })` - Score a workflow/mission
- `endTrace(sessionKey)` - Explicitly end a trace
- `flush()` - Flush pending events
- `shutdown()` - Graceful shutdown

### `AgentTagger`

**Methods:**

- `generateTags({ agentId, missionId, phase, channel, custom })` - Generate consistent tags
- `getAgentRole(agentId)` - Map agent ID to role
- `extractMissionId(cardName)` - Extract mission ID from Trello card name
- `inferPhase(listName)` - Determine workflow phase

## Deployment

### Langfuse Cloud (Easiest)

1. Sign up: https://cloud.langfuse.com
2. Create project
3. Add keys to `.env`
4. Done!

**Pricing:** Free tier includes 50k events/month. Paid plans start at $59/month.

### Self-Hosted (Full Control)

**Deploy to Fly.io:**

```bash
# Clone Langfuse
git clone https://github.com/langfuse/langfuse.git
cd langfuse

# Configure
cp .env.example .env
# Edit .env with database URL, etc.

# Deploy
fly launch
fly deploy

# Get your URL
fly info
```

**Deploy to Railway:**

1. Fork https://github.com/langfuse/langfuse
2. Connect to Railway
3. Add PostgreSQL service
4. Deploy

**Cost Estimate:** ~$10-30/month (depends on usage, database size)

## Tagging Strategy

All traces auto-tagged with:

- `agent:<agentId>` - Which agent (gambit, beast, wolverine, etc.)
- `role:<role>` - Agent role (orchestrator, coder, validator)
- `mission:<missionId>` - Mission ID from Trello (e.g., 20260312-001)
- `phase:<phase>` - Workflow phase (ideation, specification, implementation, validation)
- `channel:<channel>` - Source channel (discord, telegram, etc.)

Query examples:
- All Wolverine traces: `agent:wolverine`
- All PRD work: `phase:specification`
- Specific mission: `mission:20260312-001`
- All validation failures: `phase:validation` + score < 1

## Dashboard Setup

### Key Dashboards to Create

1. **Agent Performance**
   - Latency per agent (avg, p95, p99)
   - Error rate per agent
   - Token usage per agent

2. **Cost Attribution**
   - Daily spend by agent
   - Cost per mission
   - Most expensive operations

3. **Quality Metrics**
   - UAT pass rate (Magneto validations)
   - Task completion time
   - Handoff success rate

4. **Operational Health**
   - API error rates
   - Retry counts
   - Timeout frequency

## Troubleshooting

**No traces appearing?**
- Check `LANGFUSE_ENABLED=true` in `.env`
- Verify API keys are correct
- Check network connectivity to Langfuse endpoint
- Look for `[Langfuse] Initialized` log message

**Missing token/cost data?**
- Ensure `usage` object is passed in `afterRequest()`
- Verify LLM provider returns usage in response
- Check Langfuse model pricing configuration

**Traces not linked to missions?**
- Pass `metadata.missionId` in `beforeRequest()`
- Ensure Trello card naming follows `PRD-YYYYMMDD-NNN` format
- Use `AgentTagger.extractMissionId()` to parse card names

## Contributing

Found a bug? Want a feature? Open an issue or PR at:
https://github.com/dave-melillo/openclaw-langfuse

## License

MIT

---

**Questions?** Ask in #blackbird or ping @Wolverine 🐺
