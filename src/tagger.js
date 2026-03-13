/**
 * Agent Tagger
 * Generates consistent tags for traces based on agent context
 */

export class AgentTagger {
  /**
   * Generate tags for a trace
   */
  generateTags({ agentId, missionId, phase, channel, custom = [] }) {
    const tags = [];

    if (agentId) {
      tags.push(`agent:${agentId}`);
      tags.push(this.getAgentRole(agentId));
    }

    if (missionId) {
      tags.push(`mission:${missionId}`);
    }

    if (phase) {
      tags.push(`phase:${phase}`);
    }

    if (channel) {
      tags.push(`channel:${channel}`);
    }

    return [...tags, ...custom];
  }

  /**
   * Map agent ID to role for consistent tagging
   */
  getAgentRole(agentId) {
    const roleMap = {
      'gambit': 'role:orchestrator',
      'beast': 'role:prd-writer',
      'wolverine': 'role:coder',
      'magneto': 'role:validator',
      'rogue': 'role:qa',
      'storm': 'role:deploy',
      'cyclops': 'role:monitor'
    };

    return roleMap[agentId.toLowerCase()] || 'role:unknown';
  }

  /**
   * Extract mission ID from Trello card format (e.g., "PRD-20260310-001" -> "20260310-001")
   */
  extractMissionId(cardName) {
    const match = cardName.match(/(?:IDEA|PRD|PR|VALIDATED)-(\d{8}-\d{3})/);
    return match ? match[1] : null;
  }

  /**
   * Determine workflow phase from list name or context
   */
  inferPhase(listName) {
    const phaseMap = {
      'IDEA': 'ideation',
      'PRD': 'specification',
      'PR': 'implementation',
      'VALIDATED': 'validation',
      'DEPLOYED': 'deployment'
    };

    return phaseMap[listName.toUpperCase()] || 'unknown';
  }
}
