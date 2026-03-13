export function registerScoreTool(api: any, langfuse: any, cfg: any) {
  api.registerTool({
    name: "langfuse_score",
    description: "Score a conversation or task for reinforcement learning. Use to record success/failure, quality ratings, or user feedback.",
    parameters: {
      type: "object",
      properties: {
        scoreName: {
          type: "string",
          description: "Score type: 'uat_pass', 'task_success', 'code_quality', 'user_satisfaction', etc."
        },
        value: {
          type: "number",
          description: "Score value (0-1 for percentage, or any numeric scale)"
        },
        comment: {
          type: "string",
          description: "Optional explanation of the score"
        }
      },
      required: ["scoreName", "value"]
    },
    async execute(params: any, context: any) {
      const sessionKey = context.sessionKey;
      const traceId = context.traceId; // If available

      if (!sessionKey && !traceId) {
        return { error: "No active session or trace to score" };
      }

      try {
        // Score the current trace
        langfuse.score({
          traceId: traceId || sessionKey,
          name: params.scoreName,
          value: params.value,
          comment: params.comment || null
        });

        if (cfg.debug) {
          api.logger.info(`langfuse: scored ${sessionKey} - ${params.scoreName}: ${params.value}`);
        }

        return {
          ok: true,
          message: `Scored ${params.scoreName} = ${params.value}`,
          sessionKey,
          scoreName: params.scoreName,
          value: params.value
        };
      } catch (err: any) {
        api.logger.error("langfuse score failed", err);
        return { error: err.message };
      }
    }
  });
}
