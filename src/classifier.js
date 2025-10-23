const { analyzeTicketWithAI } = require('./ai-helper');
const logger = require('./logger');

/**
 * Core classification logic for banking support tickets
 * Determines whether a ticket needs AI code remediation or Vibe-coded troubleshooting
 */

// Rule-based classification patterns
const CLASSIFICATION_RULES = {
  ai_code_remediation: {
    keywords: [
      'api', 'timeout', 'error', 'bug', 'crash', 'exception', 'database',
      'integration', 'authentication', 'authorization', 'performance',
      'memory leak', 'sql', 'connection', 'server error', 'code',
      'deployment', 'build', 'compilation'
    ],
    channels: ['api', 'mobile_app', 'web_app', 'integration'],
    severities: ['high', 'critical']
  },
  vibe_coded_troubleshooting: {
    keywords: [
      'account', 'balance', 'transaction', 'transfer', 'payment',
      'statement', 'card', 'pin', 'password', 'profile', 'settings',
      'notification', 'email', 'sms', 'verification', 'kyc',
      'onboarding', 'support', 'help', 'guidance'
    ],
    channels: ['phone', 'email', 'chat', 'branch'],
    severities: ['low', 'medium']
  }
};

/**
 * Calculate confidence score based on rule matching
 */
function calculateRuleBasedScore(ticket, classification) {
  const rules = CLASSIFICATION_RULES[classification];
  let score = 0;
  let maxScore = 0;

  // Keyword matching (40% weight)
  const summaryLower = ticket.summary.toLowerCase();
  const keywordMatches = rules.keywords.filter(keyword => 
    summaryLower.includes(keyword)
  ).length;
  score += (keywordMatches / rules.keywords.length) * 0.4;
  maxScore += 0.4;

  // Channel matching (30% weight)
  if (rules.channels.includes(ticket.channel)) {
    score += 0.3;
  }
  maxScore += 0.3;

  // Severity matching (30% weight)
  if (rules.severities.includes(ticket.severity)) {
    score += 0.3;
  }
  maxScore += 0.3;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Generate action checklist based on classification
 */
function generateActionChecklist(decision, ticket) {
  const baseActions = {
    ai_code_remediation: [
      'Analyze error logs and stack traces',
      'Identify root cause in codebase',
      'Generate code patch or fix',
      'Run automated tests on fix',
      'Deploy to staging environment',
      'Monitor for regression issues'
    ],
    vibe_coded_troubleshooting: [
      'Review customer account details',
      'Execute diagnostic workflow',
      'Apply standard troubleshooting steps',
      'Update customer communication',
      'Document resolution steps',
      'Schedule follow-up if needed'
    ]
  };

  let actions = [...baseActions[decision]];

  // Customize based on severity
  if (ticket.severity === 'critical') {
    actions.unshift('Escalate to senior team immediately');
    actions.push('Prepare incident report');
  } else if (ticket.severity === 'high') {
    actions.push('Monitor resolution progress closely');
  }

  // Customize based on channel
  if (ticket.channel === 'mobile_app' && decision === 'ai_code_remediation') {
    actions.splice(3, 0, 'Test fix on multiple mobile platforms');
  }

  return actions.slice(0, 6); // Keep it concise
}

/**
 * Main classification function
 */
async function classifyTicket(ticket) {
  logger.info('Starting ticket classification', { 
    channel: ticket.channel, 
    severity: ticket.severity 
  });

  try {
    // Calculate rule-based scores
    const aiScore = calculateRuleBasedScore(ticket, 'ai_code_remediation');
    const vibeScore = calculateRuleBasedScore(ticket, 'vibe_coded_troubleshooting');

    logger.debug('Rule-based scores calculated', { aiScore, vibeScore });

    // Get AI analysis for enhanced decision making
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeTicketWithAI(ticket);
      logger.debug('AI analysis completed', { 
        aiRecommendation: aiAnalysis.recommendation 
      });
    } catch (aiError) {
      logger.warn('AI analysis failed, falling back to rule-based only', { 
        error: aiError.message 
      });
    }

    // Combine rule-based and AI analysis
    let finalDecision;
    let confidence;
    let reasoning;

    if (aiAnalysis) {
      // Weighted combination: 60% AI, 40% rules
      const aiWeight = 0.6;
      const ruleWeight = 0.4;
      
      const aiDecisionScore = aiAnalysis.recommendation === 'ai_code_remediation' ? 
        aiAnalysis.confidence : (1 - aiAnalysis.confidence);
      
      const combinedAiScore = (aiDecisionScore * aiWeight) + (aiScore * ruleWeight);
      const combinedVibeScore = ((1 - aiDecisionScore) * aiWeight) + (vibeScore * ruleWeight);

      if (combinedAiScore > combinedVibeScore) {
        finalDecision = 'ai_code_remediation';
        confidence = combinedAiScore;
        reasoning = `Technical issue detected: ${aiAnalysis.reasoning}`;
      } else {
        finalDecision = 'vibe_coded_troubleshooting';
        confidence = combinedVibeScore;
        reasoning = `Operational issue requiring workflow: ${aiAnalysis.reasoning}`;
      }
    } else {
      // Fallback to rule-based only
      if (aiScore > vibeScore) {
        finalDecision = 'ai_code_remediation';
        confidence = aiScore;
        reasoning = 'Technical indicators suggest code-level intervention needed';
      } else {
        finalDecision = 'vibe_coded_troubleshooting';
        confidence = vibeScore;
        reasoning = 'Operational indicators suggest workflow-based resolution';
      }
    }

    // Ensure minimum confidence threshold
    confidence = Math.max(confidence, 0.5);

    const result = {
      decision: finalDecision,
      reasoning,
      confidence: Math.round(confidence * 100) / 100,
      next_actions: generateActionChecklist(finalDecision, ticket),
      metadata: {
        model_version: '1.0.0',
        rule_scores: { ai_score: aiScore, vibe_score: vibeScore },
        ai_analysis_used: !!aiAnalysis
      }
    };

    logger.info('Classification completed', { 
      decision: finalDecision, 
      confidence: result.confidence 
    });

    return result;

  } catch (error) {
    logger.error('Classification failed', { error: error.message });
    throw new Error(`Classification failed: ${error.message}`);
  }
}

module.exports = {
  classifyTicket,
  calculateRuleBasedScore,
  generateActionChecklist,
  CLASSIFICATION_RULES
};