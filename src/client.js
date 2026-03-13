/**
 * Langfuse Client Wrapper
 * Handles connection, initialization, and basic operations
 */

import { Langfuse } from 'langfuse';

export class LangfuseClient {
  constructor(config = {}) {
    const {
      publicKey = process.env.LANGFUSE_PUBLIC_KEY,
      secretKey = process.env.LANGFUSE_SECRET_KEY,
      baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
      flushAt = 15,
      flushInterval = 10000,
      enabled = process.env.LANGFUSE_ENABLED !== 'false'
    } = config;

    if (!publicKey || !secretKey) {
      console.warn('[Langfuse] Missing API keys. Observability disabled.');
      this.enabled = false;
      return;
    }

    this.enabled = enabled;
    this.client = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
      flushAt,
      flushInterval
    });

    console.log(`[Langfuse] Initialized. Endpoint: ${baseUrl}`);
  }

  /**
   * Create a new trace for a multi-agent workflow
   */
  createTrace({ name, userId, sessionId, metadata = {}, tags = [] }) {
    if (!this.enabled) return null;

    return this.client.trace({
      name,
      userId,
      sessionId,
      metadata,
      tags
    });
  }

  /**
   * Track an LLM generation (API call)
   */
  trackGeneration({
    traceId,
    name,
    model,
    modelParameters = {},
    input,
    output,
    usage,
    startTime,
    endTime,
    metadata = {},
    level = 'DEFAULT',
    statusMessage = null
  }) {
    if (!this.enabled) return null;

    const generation = this.client.generation({
      traceId,
      name,
      model,
      modelParameters,
      input,
      output,
      usage: {
        promptTokens: usage?.promptTokens || 0,
        completionTokens: usage?.completionTokens || 0,
        totalTokens: usage?.totalTokens || 0
      },
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      metadata,
      level,
      statusMessage
    });

    return generation;
  }

  /**
   * Create a span for agent actions (tool calls, sessions)
   */
  createSpan({
    traceId,
    name,
    input,
    output,
    startTime,
    endTime,
    metadata = {},
    level = 'DEFAULT',
    statusMessage = null
  }) {
    if (!this.enabled) return null;

    return this.client.span({
      traceId,
      name,
      input,
      output,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      metadata,
      level,
      statusMessage
    });
  }

  /**
   * Score a trace (quality metrics)
   */
  scoreTrace({
    traceId,
    name,
    value,
    comment = null,
    dataType = 'NUMERIC'
  }) {
    if (!this.enabled) return null;

    return this.client.score({
      traceId,
      name,
      value,
      comment,
      dataType
    });
  }

  /**
   * Flush all pending events
   */
  async flush() {
    if (!this.enabled) return;
    await this.client.flushAsync();
  }

  /**
   * Shutdown client gracefully
   */
  async shutdown() {
    if (!this.enabled) return;
    await this.client.shutdownAsync();
  }
}
