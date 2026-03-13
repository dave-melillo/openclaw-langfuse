# @openclaw/langfuse

**Complete LLM observability + reinforcement learning for OpenClaw multi-agent systems.**

Turn-key installation. Real-time traces. Automated analysis. Continuous improvement.

[![npm version](https://badge.fury.io/js/%40openclaw%2Flangfuse.svg)](https://www.npmjs.com/package/@openclaw/langfuse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

✅ **Real-Time Observability**
- See all LLM interactions in Langfuse dashboard
- Track success/failure, latency, agent metadata
- Drill down into specific conversations

✅ **Automated Analysis**
- Weekly trace analysis (configurable schedule)
- Pattern recognition (what works, what fails)
- High-latency operation detection

✅ **Reinforcement Learning**
- Auto-generated LESSONS_LEARNED.md
- Agents read and apply insights automatically
- Continuous improvement loop

✅ **Scoring Framework**
- Score task success (`langfuse_score()` tool)
- Track UAT pass rates, code quality, user satisfaction
- Measure improvement over time

✅ **5-Minute Setup**
- Interactive CLI wizard
- One-command installation
- Auto-configured cron jobs

---

## Quick Start

### 1. Install

```bash
npm install @openclaw/langfuse
```

### 2. Run Setup Wizard

```bash
npx openclaw-langfuse
```

The wizard will:
- Ask for your Langfuse keys (Cloud or self-hosted)
- Generate OpenClaw config
- Set up weekly analysis cron job
- Save config files

### 3. Apply Config

```bash
openclaw config patch < openclaw-langfuse-config.json
openclaw gateway restart
```

### 4. Check Traces

Go to your Langfuse dashboard (e.g., https://us.cloud.langfuse.com) and start seeing traces!

---

## Installation (Manual)

If you prefer manual installation:

### 1. Install Package

```bash
npm install @openclaw/langfuse
```

### 2. Get Langfuse Keys

**Option A: Langfuse Cloud (recommended)**
1. Sign up at https://cloud.langfuse.com
2. Create a project
3. Copy your public and secret keys

**Option B: Self-Hosted**
1. Deploy Langfuse to Fly.io/Railway
2. Follow https://langfuse.com/docs/deployment/self-host
3. Use your custom base URL

### 3. Configure OpenClaw

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": ["openclaw-langfuse"],
    "entries": {
      "openclaw-langfuse": {
        "enabled": true,
        "config": {
          "publicKey": "pk-lf-your-public-key",
          "secretKey": "sk-lf-your-secret-key",
          "baseUrl": "https://us.cloud.langfuse.com",
          "enabled": true,
          "debug": false
        }
      }
    }
  }
}
```

Or use `openclaw config patch`:

```bash
openclaw config patch < examples/config-example.json
```

### 4. Set Up Weekly Analysis (Optional but Recommended)

Create a cron job for weekly trace analysis:

```bash
openclaw cron add < examples/cron-example.json
```

This runs every Friday at 5pm EST and:
- Queries Langfuse for past week's traces
- Analyzes patterns (success/fail, latency, agent activity)
- Generates `LESSONS_LEARNED.md`
- Posts to #blackbird
- Agents read it automatically

### 5. Restart OpenClaw

```bash
openclaw gateway restart
```

---

## Usage

### Viewing Traces

1. Go to your Langfuse dashboard
2. Click **Traces** in sidebar
3. See all agent interactions:
   - Full conversation history
   - Success/failure status
   - Latency per interaction
   - Agent metadata

### Filtering Traces

**By agent:**
```
tags:agent:wolverine
```

**By success:**
```
metadata.success:true
```

**By latency:**
```
metadata.latencyMs:>10000
```

### Scoring Tasks (Agents)

Agents can score task success for reinforcement learning:

```javascript
langfuse_score({
  scoreName: "uat_pass",
  value: 1.0, // 0 = fail, 1 = pass
  comment: "All requirements met"
})
```

**Score types:**
- `uat_pass` - UAT validation (0 or 1)
- `code_quality` - Code quality (0-1)
- `user_satisfaction` - User feedback (0-1)
- `task_complexity` - Difficulty (0-1)
- `prompt_effectiveness` - Prompt quality (0-1)

### Reading Lessons Learned

Every week, agents receive `LESSONS_LEARNED.md` with insights:

```markdown
# Lessons Learned - Week of 2026-03-14

## Summary
- Total traces: 487
- Success rate: 94.2%
- Failed traces: 28

## Insights
- Overall success rate: 94.2%
- Most active agent: wolverine (152 traces)
- 5 high-latency operations (avg: 12.3s)

## Failed Traces (Top 5)
- wolverine: code generation timeout
- beast: PRD missing edge cases
- magneto: validation false positive

## Recommendations
- ⚠️ Latency issues detected. Optimize high-latency operations.
```

Agents read this before tasks and:
- Avoid known failure patterns
- Apply successful approaches
- Self-optimize over time

---

## Reinforcement Learning Loop

```
Week 1:
  → Agents work normally
  → Langfuse captures all traces

Friday 5pm:
  → Analysis runs automatically
  → LESSONS_LEARNED.md generated
  → Posted to #blackbird

Week 2:
  → Agents read lessons
  → Apply insights
  → Success rate improves

Repeat → Continuous improvement
```

---

## Architecture

```
OpenClaw Agent
      ↓
   [Plugin Hook]
      ↓
   Langfuse SDK
      ↓
  Langfuse Cloud/Self-Hosted
      ↓
  Weekly Analysis Script
      ↓
  LESSONS_LEARNED.md
      ↓
  Agents (auto-read)
```

**Components:**
- **Plugin** (`plugin/index.ts`) - Captures traces
- **Tools** (`plugin/tools/score.ts`) - Scoring for RL
- **Scripts** (`scripts/analyze-traces.js`) - Weekly analysis
- **CLI** (`cli/setup.js`) - Setup wizard

---

## Configuration

### Plugin Config

```json
{
  "publicKey": "pk-lf-...",
  "secretKey": "sk-lf-...",
  "baseUrl": "https://us.cloud.langfuse.com",
  "enabled": true,
  "debug": false
}
```

### Cron Job Config

```json
{
  "name": "Weekly Langfuse Trace Analysis",
  "schedule": {
    "kind": "cron",
    "expr": "0 17 * * 5",
    "tz": "America/New_York"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Run Langfuse trace analysis",
    "timeoutSeconds": 300
  },
  "sessionTarget": "isolated"
}
```

---

## Troubleshooting

**No traces appearing?**
- Check `plugins.allow` includes `openclaw-langfuse`
- Verify API keys are correct
- Check network connectivity
- Look for `[langfuse] initialized` in logs

**Analysis not running?**
- Check cron job: `openclaw cron list`
- Verify schedule expression
- Check logs: `openclaw logs | grep langfuse`

**Missing lessons learned?**
- Ensure analysis ran successfully
- Check workspace for `LESSONS_LEARNED.md`
- Verify cron job delivery mode

---

## Examples

See `examples/` directory:
- `config-example.json` - Plugin configuration
- `cron-example.json` - Weekly analysis cron job

---

## Development

### Build

```bash
npm install
```

### Test

```bash
npm test
```

### Publish

```bash
npm publish --access public
```

---

## Contributing

Found a bug? Want a feature? Open an issue or PR:  
https://github.com/dave-melillo/openclaw-langfuse/issues

---

## License

MIT

---

## Credits

Built by the X-Men Team for the OpenClaw community.

**Questions?**  
- GitHub: https://github.com/dave-melillo/openclaw-langfuse
- OpenClaw Discord: https://discord.com/invite/clawd

---

**Turn your multi-agent system into a self-improving learning machine.** 🐺
