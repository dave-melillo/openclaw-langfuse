/**
 * Example integration with OpenClaw gateway
 * This demonstrates how to integrate the middleware
 */

import { OpenClawMiddleware } from './index.js';

// Initialize middleware
const langfuse = new OpenClawMiddleware({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  enabled: true
});

// Example: Track a model request
async function exampleModelRequest() {
  const sessionKey = 'agent:wolverine:main';
  const agentId = 'wolverine';
  const model = 'anthropic/claude-sonnet-4-5';
  const messages = [
    { role: 'user', content: 'Implement Langfuse integration' }
  ];

  // Before request
  const tracking = langfuse.beforeRequest({
    sessionKey,
    agentId,
    model,
    messages,
    parameters: { temperature: 0.7, max_tokens: 2000 },
    metadata: {
      missionId: 'PRD-LANGFUSE',
      phase: 'implementation',
      channel: 'discord',
      userId: 'dave'
    }
  });

  console.log('Tracking:', tracking);

  // Simulate LLM response
  const mockResponse = {
    choices: [
      {
        message: { role: 'assistant', content: 'Implementation complete.' },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 150,
      completion_tokens: 800,
      total_tokens: 950
    },
    model: 'claude-sonnet-4-5'
  };

  // After request
  langfuse.afterRequest({
    ...tracking,
    output: mockResponse.choices[0].message,
    usage: {
      promptTokens: mockResponse.usage.prompt_tokens,
      completionTokens: mockResponse.usage.completion_tokens,
      totalTokens: mockResponse.usage.total_tokens
    },
    metadata: {
      model: mockResponse.model,
      finishReason: mockResponse.choices[0].finish_reason
    }
  });

  console.log('Request tracked successfully');
}

// Example: Track agent action
function exampleAgentAction() {
  langfuse.trackAction({
    sessionKey: 'agent:gambit:main',
    agentId: 'gambit',
    actionName: 'sessions_spawn',
    input: {
      agent: 'wolverine',
      task: 'Implement Langfuse integration',
      runtime: 'subagent'
    },
    output: {
      sessionKey: 'agent:wolverine:xyz123',
      status: 'spawned'
    },
    startTime: new Date(),
    endTime: new Date(),
    metadata: {
      missionId: 'PRD-LANGFUSE'
    }
  });

  console.log('Action tracked successfully');
}

// Example: Score a mission
function exampleScoring() {
  langfuse.scoreMission({
    sessionKey: 'agent:magneto:abc789',
    scoreName: 'uat_pass',
    value: 1,
    comment: 'All acceptance criteria met. Clean implementation.'
  });

  console.log('Mission scored successfully');
}

// Run examples
if (process.env.LANGFUSE_PUBLIC_KEY) {
  console.log('Running Langfuse integration examples...\n');
  
  exampleModelRequest()
    .then(() => exampleAgentAction())
    .then(() => exampleScoring())
    .then(() => langfuse.flush())
    .then(() => {
      console.log('\nAll examples complete. Check Langfuse dashboard!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
} else {
  console.log('Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to run examples');
  console.log('Example: LANGFUSE_PUBLIC_KEY=pk-... LANGFUSE_SECRET_KEY=sk-... node src/example.js');
}
