# Quick Start Guide

Get Langfuse observability + reinforcement learning running in 5 minutes.

## Prerequisites

- OpenClaw installed and running
- Node.js 18+ installed
- npm or yarn

## Installation

### Step 1: Install Package

```bash
npm install @openclaw/langfuse
```

### Step 2: Get Langfuse Keys

**Using Langfuse Cloud (recommended):**

1. Go to https://cloud.langfuse.com
2. Sign up (free tier: 50k events/month)
3. Create a new project
4. Copy your **Public Key** (pk-lf-...)
5. Copy your **Secret Key** (sk-lf-...)

**Using Self-Hosted:**

1. Deploy Langfuse to Fly.io/Railway
2. Follow: https://langfuse.com/docs/deployment/self-host
3. Get your keys from deployed instance

### Step 3: Run Setup Wizard

```bash
npx openclaw-langfuse
```

Answer the prompts:
- Where will you host Langfuse? → **Langfuse Cloud**
- Enter your Langfuse public key: → **pk-lf-...**
- Enter your Langfuse secret key: → **sk-lf-...**
- Langfuse base URL: → **https://us.cloud.langfuse.com**
- Enable weekly trace analysis? → **Yes**
- What day should analysis run? → **Friday**
- What time? → **17:00**

The wizard generates two files:
- `openclaw-langfuse-config.json` - Plugin configuration
- `openclaw-langfuse-cron.json` - Weekly analysis cron job

### Step 4: Apply Configuration

```bash
# Apply plugin config
openclaw config patch < openclaw-langfuse-config.json

# Add cron job for weekly analysis
openclaw cron add < openclaw-langfuse-cron.json

# Restart OpenClaw
openclaw gateway restart
```

### Step 5: Verify Installation

Check that the plugin loaded:

```bash
openclaw status
```

You should see:
```
Plugins: openclaw-langfuse (enabled)
```

Check logs:
```bash
openclaw logs | grep langfuse
```

You should see:
```
[plugins] langfuse: initialized (https://us.cloud.langfuse.com)
```

### Step 6: See Your First Traces

1. Have an agent conversation (any agent)
2. Go to your Langfuse dashboard
3. Click **Traces** in sidebar
4. See your first trace!

## What Happens Now

### Real-Time (Immediate)

Every agent interaction is tracked:
- Full conversation logged
- Success/failure captured
- Latency measured
- Agent metadata tagged

### Weekly (Fridays 5pm)

Analysis agent runs automatically:
1. Queries Langfuse for past week
2. Analyzes patterns (success/fail, latency)
3. Generates `LESSONS_LEARNED.md`
4. Posts to #blackbird
5. All agents read it before next tasks

### Continuous (Ongoing)

Agents improve over time:
- Read lessons learned
- Avoid known failures
- Apply successful patterns
- Success rate increases

## Next Steps

- **View traces:** https://us.cloud.langfuse.com
- **Read RL guide:** [docs/REINFORCEMENT-LEARNING.md](./REINFORCEMENT-LEARNING.md)
- **Configure scoring:** Add `langfuse_score()` calls to agents
- **Deep dive:** Export traces to CSV for analysis

## Troubleshooting

**Plugin not loading?**
- Check `plugins.allow` includes `openclaw-langfuse`
- Verify config syntax with `openclaw config get`

**No traces appearing?**
- Verify API keys are correct
- Check network connectivity to Langfuse
- Look for errors in logs

**Analysis not running?**
- Check cron job: `openclaw cron list`
- Verify schedule is correct
- Check logs for errors

**Need help?**
- GitHub Issues: https://github.com/dave-melillo/openclaw-langfuse/issues
- OpenClaw Discord: https://discord.com/invite/clawd

---

**You're all set! Your multi-agent system is now self-improving.** 🐺
