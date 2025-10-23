const OpenAI = require('openai');
const logger = require('./logger');

// Initialize OpenAI client (will use OPENAI_API_KEY from environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key'
});

/**
 * AI-powered ticket analysis using GPT
 * This helper provides enhanced natural language understanding
 * to complement rule-based classification
 */

const ANALYSIS_PROMPT = `You are an expert banking support analyst. Analyze the following support ticket and determine whether it requires:

1. "ai_code_remediation" - Technical issues needing code fixes (API errors, bugs, system failures, integration problems)
2. "vibe_coded_troubleshooting" - Operational issues needing workflow scripts (account problems, user guidance, process issues)

Consider:
- Technical complexity of the issue
- Whether it involves system/code problems vs user/process problems  
- Severity and channel context
- Root cause likely location (code vs operations)

Respond with JSON only:
{
  "recommendation": "ai_code_remediation" or "vibe_coded_troubleshooting",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of decision factors",
  "technical_indicators": ["list", "of", "technical", "clues"],
  "operational_indicators": ["list", "of", "operational", "clues"]
}`;

/**
 * Analyze ticket using OpenAI GPT
 */
async function analyzeTicketWithAI(ticket) {
  // Skip AI analysis if no API key provided (for demo/testing)
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
    logger.info('Skipping AI analysis - no API key provided');
    return null;
  }

  try {
    const ticketContext = `
Channel: ${ticket.channel}
Severity: ${ticket.severity}  
Summary: ${ticket.summary}
    `.trim();

    logger.debug('Sending ticket to AI for analysis');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: ticketContext }
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 300,
      timeout: 10000 // 10 second timeout
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    const analysis = JSON.parse(response);
    
    // Validate response structure
    if (!analysis.recommendation || !analysis.confidence || !analysis.reasoning) {
      throw new Error('Invalid AI response structure');
    }

    // Ensure confidence is within valid range
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    logger.debug('AI analysis successful', { 
      recommendation: analysis.recommendation,
      confidence: analysis.confidence 
    });

    return analysis;

  } catch (error) {
    logger.error('AI analysis failed', { 
      error: error.message,
      type: error.constructor.name 
    });
    
    // Don't throw - let classifier fall back to rule-based only
    return null;
  }
}

/**
 * Generate AI-assisted reasoning for classification decisions
 * Used when AI analysis is not available but we want enhanced explanations
 */
function generateEnhancedReasoning(ticket, decision, ruleScores) {
  const { ai_score, vibe_score } = ruleScores;
  
  let reasoning = `Based on analysis of channel (${ticket.channel}), severity (${ticket.severity}), and content patterns: `;
  
  if (decision === 'ai_code_remediation') {
    reasoning += `Technical indicators detected (score: ${ai_score.toFixed(2)}). `;
    
    if (ticket.summary.toLowerCase().includes('api')) {
      reasoning += 'API-related issue suggests code-level intervention. ';
    }
    if (ticket.severity === 'critical' || ticket.severity === 'high') {
      reasoning += 'High severity technical issue requires immediate code remediation. ';
    }
    if (['mobile_app', 'web_app', 'api'].includes(ticket.channel)) {
      reasoning += 'Digital channel indicates system-level problem. ';
    }
  } else {
    reasoning += `Operational indicators detected (score: ${vibe_score.toFixed(2)}). `;
    
    if (ticket.summary.toLowerCase().includes('account')) {
      reasoning += 'Account-related issue best handled through workflow scripts. ';
    }
    if (['phone', 'email', 'chat'].includes(ticket.channel)) {
      reasoning += 'Human interaction channel suggests operational resolution. ';
    }
    if (ticket.severity === 'low' || ticket.severity === 'medium') {
      reasoning += 'Standard severity level appropriate for workflow handling. ';
    }
  }
  
  return reasoning.trim();
}

/**
 * Fallback analysis when AI is unavailable
 * Provides structured analysis using rule-based logic
 */
function createFallbackAnalysis(ticket, decision, ruleScores) {
  const reasoning = generateEnhancedReasoning(ticket, decision, ruleScores);
  
  return {
    recommendation: decision,
    confidence: Math.max(ruleScores.ai_score, ruleScores.vibe_score),
    reasoning,
    technical_indicators: extractTechnicalIndicators(ticket),
    operational_indicators: extractOperationalIndicators(ticket),
    fallback_used: true
  };
}

/**
 * Extract technical indicators from ticket
 */
function extractTechnicalIndicators(ticket) {
  const technical_keywords = [
    'api', 'error', 'timeout', 'bug', 'crash', 'exception', 
    'database', 'server', 'code', 'integration', 'authentication'
  ];
  
  const summary_lower = ticket.summary.toLowerCase();
  return technical_keywords.filter(keyword => summary_lower.includes(keyword));
}

/**
 * Extract operational indicators from ticket  
 */
function extractOperationalIndicators(ticket) {
  const operational_keywords = [
    'account', 'balance', 'transaction', 'payment', 'card', 
    'password', 'profile', 'help', 'support', 'verification'
  ];
  
  const summary_lower = ticket.summary.toLowerCase();
  return operational_keywords.filter(keyword => summary_lower.includes(keyword));
}

module.exports = {
  analyzeTicketWithAI,
  generateEnhancedReasoning,
  createFallbackAnalysis,
  extractTechnicalIndicators,
  extractOperationalIndicators,
  ANALYSIS_PROMPT
};