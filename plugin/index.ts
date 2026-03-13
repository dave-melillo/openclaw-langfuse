import { Langfuse } from "langfuse";
import { registerScoreTool } from "./tools/score.ts";

interface TraceData {
  traceId: string;
  startTime: Date;
  agentId: string;
}

function safeStringify(obj: any, maxLength = 500): string {
  try {
    const str = JSON.stringify(obj);
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  } catch {
    return "[unstringifiable]";
  }
}

export default {
  id: "openclaw-langfuse",
  name: "Langfuse",
  description: "Langfuse LLM observability for OpenClaw",
  kind: "observability" as const,

  register(api: any) {
    const cfg = api.pluginConfig || {};

    if (!cfg.publicKey || !cfg.secretKey) {
      api.logger.info("langfuse: not configured - add publicKey and secretKey to config");
      return;
    }

    const langfuse = new Langfuse({
      publicKey: cfg.publicKey,
      secretKey: cfg.secretKey,
      baseUrl: cfg.baseUrl || "https://cloud.langfuse.com",
      flushAt: 1,
      flushInterval: 1000
    });

    const traces = new Map<string, TraceData>();

    api.logger.info(`langfuse: initialized (${cfg.baseUrl || "https://cloud.langfuse.com"}) - DEBUG MODE`);

    // Register scoring tool
    registerScoreTool(api, langfuse, cfg);

    // Track session ends - THIS IS WHERE THE DATA IS
    api.on("agent_end", (event: any, ctx: any) => {
      if (!cfg.enabled) return;

      const sessionKey = ctx.sessionKey || "unknown";
      const traceData = traces.get(sessionKey);

      // LOG EVERYTHING
      api.logger.info(`=== LANGFUSE AGENT_END DEBUG ===`);
      api.logger.info(`sessionKey: ${sessionKey}`);
      api.logger.info(`event keys: ${Object.keys(event).join(", ")}`);
      api.logger.info(`ctx keys: ${Object.keys(ctx).join(", ")}`);
      api.logger.info(`event.messages: ${safeStringify(event.messages)}`);
      api.logger.info(`event.usage: ${safeStringify(event.usage)}`);
      api.logger.info(`event.response: ${safeStringify(event.response)}`);
      api.logger.info(`event.completion: ${safeStringify(event.completion)}`);
      api.logger.info(`ctx.model: ${ctx.model}`);
      api.logger.info(`=== END DEBUG ===`);

      if (!traceData) {
        api.logger.warn(`[langfuse] no trace for ${sessionKey}`);
        return;
      }

      const endTime = new Date();
      const messages = event.messages || [];
      
      // Extract input/output
      const inputMessages = [];
      let outputText = "";
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg || typeof msg !== "object") continue;
        
        const role = msg.role;
        let content = "";
        
        if (typeof msg.content === "string") {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          const textParts = msg.content
            .filter((b: any) => b?.type === "text")
            .map((b: any) => b.text)
            .filter(Boolean);
          content = textParts.join("\n");
        }
        
        if (role === "assistant" && i === messages.length - 1) {
          outputText = content;
        } else {
          inputMessages.push({ role, content });
        }
      }

      // Extract token usage
      const usage = event.usage || event.tokenUsage || {};
      const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
      const completionTokens = usage.completionTokens || usage.completion_tokens || 0;
      const totalTokens = usage.totalTokens || usage.total_tokens || promptTokens + completionTokens;

      api.logger.info(`[langfuse] Creating generation: input=${inputMessages.length} msgs, output=${outputText.length} chars, tokens=${totalTokens}`);

      // Create generation
      langfuse.generation({
        traceId: traceData.traceId,
        name: `${traceData.agentId} response`,
        model: ctx.model || "unknown",
        input: inputMessages,
        output: outputText,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        startTime: traceData.startTime,
        endTime: endTime,
        metadata: {
          agentId: traceData.agentId,
          channel: ctx.channel,
          latencyMs: endTime.getTime() - traceData.startTime.getTime(),
          messageCount: messages.length,
          success: event.success ?? true
        },
        level: (event.success ?? true) ? "DEFAULT" : "ERROR"
      });

      langfuse.flushAsync();
      traces.delete(sessionKey);
    });

    // Track session starts
    api.on("before_agent_start", (event: any, ctx: any) => {
      if (!cfg.enabled) return;

      const sessionKey = ctx.sessionKey || "unknown";
      const agentId = ctx.agentId || "unknown";

      const trace = langfuse.trace({
        name: `${agentId} conversation`,
        sessionId: sessionKey,
        userId: agentId,
        metadata: {
          agentId,
          channel: ctx.channel,
          messageProvider: ctx.messageProvider,
          sessionKey,
          model: ctx.model
        },
        tags: [
          `agent:${agentId}`,
          `model:${ctx.model || "unknown"}`,
          `channel:${ctx.channel || "unknown"}`
        ]
      });

      traces.set(sessionKey, {
        traceId: trace.id,
        startTime: new Date(),
        agentId
      });
    });

    // Periodic flush
    setInterval(async () => {
      await langfuse.flushAsync();
    }, 10000);

    // Register service
    api.registerService({
      id: "openclaw-langfuse",
      start: async () => {
        api.logger.info("langfuse: tracking enabled");
      },
      stop: async () => {
        await langfuse.flushAsync();
        await langfuse.shutdownAsync();
        api.logger.info("langfuse: stopped");
      }
    });
  }
};
