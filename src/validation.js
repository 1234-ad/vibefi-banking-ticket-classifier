const Joi = require('joi');

/**
 * Input validation schemas and functions
 */

const ticketSchema = Joi.object({
  channel: Joi.string()
    .valid('mobile_app', 'web_app', 'api', 'phone', 'email', 'chat', 'branch', 'integration')
    .required()
    .messages({
      'any.only': 'Channel must be one of: mobile_app, web_app, api, phone, email, chat, branch, integration',
      'any.required': 'Channel is required'
    }),
    
  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .required()
    .messages({
      'any.only': 'Severity must be one of: low, medium, high, critical',
      'any.required': 'Severity is required'
    }),
    
  summary: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Summary must be at least 10 characters long',
      'string.max': 'Summary must not exceed 1000 characters',
      'any.required': 'Summary is required'
    }),
    
  // Optional fields for enhanced classification
  ticket_id: Joi.string().optional(),
  customer_id: Joi.string().optional(),
  timestamp: Joi.date().iso().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  priority: Joi.string().valid('p1', 'p2', 'p3', 'p4').optional()
});

/**
 * Validate ticket input data
 */
function validateTicketInput(data) {
  return ticketSchema.validate(data, {
    abortEarly: false, // Return all validation errors
    stripUnknown: true // Remove unknown fields
  });
}

/**
 * Sanitize and normalize ticket data
 */
function sanitizeTicket(ticket) {
  return {
    ...ticket,
    channel: ticket.channel.toLowerCase().trim(),
    severity: ticket.severity.toLowerCase().trim(),
    summary: ticket.summary.trim(),
    // Normalize optional fields
    tags: ticket.tags ? ticket.tags.map(tag => tag.toLowerCase().trim()) : [],
    timestamp: ticket.timestamp || new Date().toISOString()
  };
}

/**
 * Validate classification response structure
 */
const responseSchema = Joi.object({
  decision: Joi.string()
    .valid('ai_code_remediation', 'vibe_coded_troubleshooting')
    .required(),
    
  reasoning: Joi.string().min(10).required(),
  
  confidence: Joi.number().min(0).max(1).required(),
  
  next_actions: Joi.array()
    .items(Joi.string().min(5))
    .min(3)
    .max(10)
    .required(),
    
  metadata: Joi.object({
    processing_time_ms: Joi.number().positive().optional(),
    model_version: Joi.string().required(),
    rule_scores: Joi.object().optional(),
    ai_analysis_used: Joi.boolean().optional(),
    timestamp: Joi.string().isoDate().optional()
  }).required()
});

/**
 * Validate classification response
 */
function validateResponse(response) {
  return responseSchema.validate(response, {
    abortEarly: false
  });
}

module.exports = {
  validateTicketInput,
  sanitizeTicket,
  validateResponse,
  ticketSchema,
  responseSchema
};