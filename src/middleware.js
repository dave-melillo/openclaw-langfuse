/**
 * OpenClaw Middleware
 * Intercepts LLM API calls and tracks them in Langfuse
 */

import { LangfuseClient } from './client.js';
import { AgentTagger } from './tagger.js';

export class OpenClawMiddleware {
  constructor(config = {}) {
    this.client = new LangfuseClient(config);
    this.tagger = new AgentTagger();
    this.activeTraces = new Map(); // sessionKey -> traceId
  }

  /**
   * Hook into OpenClaw model request
   * Call this BEFORE sending request to LLM provider
   */
  beforeRequest({ sessionKey, agentId, model, messages, parameters = {}, metadata = {} }) {
    if (!this.client.enabled) return null;

    // Get or create trace for this session
    let traceId = this.activeTraces.get(sessionKey);
    
    if (!traceId) {
      const traceName = metadata.missionId 
        ? `Mission: ${metadata.missionId}` 
        : `Session: ${sessionKey}`;

      const trace = this.client.createTrace({
        name: traceName,
        sessionId: sessionKey,
        userId: metadata.userId || agentId,
        metadata: {
          agentId,
          missionId: metadata.missionId,
          phase: metadata.phase,
          channel: metadata.channel
        },
        tags: this.tagger.generateTags({ agentId, missionId: metadata.missionId, phase: metadata.phase })
      });

      traceId = trace?.id;
      if (traceId) {
        this.activeTraces.set(sessionKey, traceId);
      }
    }

    // Track generation start
    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      traceId,
      generationId,
      startTime: new Date(),
      model,
      input: messages,
      modelParameters: parameters
    };
  }

  /**
   * Hook into OpenClaw model response
   * Call this AFTER receiving response from LLM provider
   */
  afterRequest({ 
    traceId, 
    generationId, 
    startTime, 
    model, 
    input, 
    output, 
    usage, 
    modelParameters = {},
    error = null,
    metadata = {}
  }) {
    if (!this.client.enabled || !traceId) return;

    const endTime = new Date();
    const level = error ? 'ERROR' : 'DEFAULT';
    const statusMessage = error ? error.message : null;

    this.client.trackGeneration({
      traceId,
      name: generationId,
      model,
      modelParameters,
      input,
      output: error ? { error: error.message } : output,
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      startTime,
      endTime,
      metadata: {
        ...metadata,
        latencyMs: endTime - startTime,
        provider: this.extractProvider(model)
      },
      level,
      statusMessage
    });
  }

  /**
   * Track agent action (tool call, session spawn, etc)
   */
  trackAction({ 
    sessionKey, 
    agentId, 
    actionName, 
    input, 
    output, 
    startTime, 
    endTime, 
    metadata = {},
    error = null 
  }) {
    if (!this.client.enabled) return;

    const traceId = this.activeTraces.get(sessionKey);
    if (!traceId) return;

    const level = error ? 'ERROR' : 'DEFAULT';
    const statusMessage = error ? error.message : null;

    this.client.createSpan({
      traceId,
      name: `${agentId}:${actionName}`,
      input,
      output: error ? { error: error.message } : output,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      metadata: {
        ...metadata,
        agentId,
        actionType: actionName
      },
      level,
      statusMessage
    });
  }

  /**
   * Score a mission/workflow
   */
  scoreMission({ sessionKey, scoreName, value, comment }) {
    if (!this.client.enabled) return;

    const traceId = this.activeTraces.get(sessionKey);
    if (!traceId) return;

    this.client.scoreTrace({
      traceId,
      name: scoreName,
      value,
      comment,
      dataType: typeof value === 'number' ? 'NUMERIC' : 'CATEGORICAL'
    });
  }

  /**
   * End trace for a session
   */
  endTrace(sessionKey) {
    this.activeTraces.delete(sessionKey);
  }

  /**
   * Extract provider from model string (e.g., "anthropic/claude-sonnet-4-5" -> "anthropic")
   */
  extractProvider(model) {
    if (!model) return 'unknown';
    if (model.includes('/')) return model.split('/')[0];
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return 'unknown';
  }

  /**
   * Flush pending events
   */
  async flush() {
    await this.client.flush();
  }

  /**
   * Shutdown middleware
   */
  async shutdown() {
    await this.client.shutdown();
  }
}
