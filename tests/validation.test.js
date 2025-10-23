const { validateTicketInput, sanitizeTicket, validateResponse } = require('../src/validation');

describe('Input Validation', () => {
  
  describe('validateTicketInput', () => {
    const validTicket = {
      channel: 'mobile_app',
      severity: 'high',
      summary: 'Users experiencing API timeout errors during authentication'
    };

    it('should accept valid ticket input', () => {
      const { error, value } = validateTicketInput(validTicket);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validTicket);
    });

    it('should reject invalid channel', () => {
      const invalidTicket = {
        ...validTicket,
        channel: 'invalid_channel'
      };

      const { error } = validateTicketInput(invalidTicket);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Channel must be one of');
    });

    it('should reject invalid severity', () => {
      const invalidTicket = {
        ...validTicket,
        severity: 'extreme'
      };

      const { error } = validateTicketInput(invalidTicket);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Severity must be one of');
    });

    it('should reject missing required fields', () => {
      const incompleteTicket = {
        channel: 'mobile_app'
        // missing severity and summary
      };

      const { error } = validateTicketInput(incompleteTicket);
      
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThan(1);
    });

    it('should reject summary that is too short', () => {
      const shortSummaryTicket = {
        ...validTicket,
        summary: 'Too short'
      };

      const { error } = validateTicketInput(shortSummaryTicket);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least 10 characters');
    });

    it('should reject summary that is too long', () => {
      const longSummaryTicket = {
        ...validTicket,
        summary: 'x'.repeat(1001)
      };

      const { error } = validateTicketInput(longSummaryTicket);
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must not exceed 1000 characters');
    });

    it('should accept optional fields', () => {
      const ticketWithOptionals = {
        ...validTicket,
        ticket_id: 'TKT-12345',
        customer_id: 'CUST-67890',
        timestamp: '2023-10-23T14:30:00.000Z',
        tags: ['urgent', 'api'],
        priority: 'p1'
      };

      const { error, value } = validateTicketInput(ticketWithOptionals);
      
      expect(error).toBeUndefined();
      expect(value.ticket_id).toBe('TKT-12345');
      expect(value.tags).toEqual(['urgent', 'api']);
    });

    it('should strip unknown fields', () => {
      const ticketWithUnknown = {
        ...validTicket,
        unknown_field: 'should be removed',
        another_unknown: 123
      };

      const { error, value } = validateTicketInput(ticketWithUnknown);
      
      expect(error).toBeUndefined();
      expect(value.unknown_field).toBeUndefined();
      expect(value.another_unknown).toBeUndefined();
    });
  });

  describe('sanitizeTicket', () => {
    it('should normalize field values', () => {
      const messyTicket = {
        channel: '  MOBILE_APP  ',
        severity: '  HIGH  ',
        summary: '  API timeout errors  ',
        tags: ['  URGENT  ', '  api  ']
      };

      const sanitized = sanitizeTicket(messyTicket);

      expect(sanitized.channel).toBe('mobile_app');
      expect(sanitized.severity).toBe('high');
      expect(sanitized.summary).toBe('API timeout errors');
      expect(sanitized.tags).toEqual(['urgent', 'api']);
    });

    it('should add timestamp if missing', () => {
      const ticket = {
        channel: 'mobile_app',
        severity: 'high',
        summary: 'Test summary'
      };

      const sanitized = sanitizeTicket(ticket);

      expect(sanitized.timestamp).toBeDefined();
      expect(new Date(sanitized.timestamp)).toBeInstanceOf(Date);
    });

    it('should preserve existing timestamp', () => {
      const existingTimestamp = '2023-10-23T14:30:00.000Z';
      const ticket = {
        channel: 'mobile_app',
        severity: 'high',
        summary: 'Test summary',
        timestamp: existingTimestamp
      };

      const sanitized = sanitizeTicket(ticket);

      expect(sanitized.timestamp).toBe(existingTimestamp);
    });
  });

  describe('validateResponse', () => {
    const validResponse = {
      decision: 'ai_code_remediation',
      reasoning: 'Technical issue requiring code-level intervention',
      confidence: 0.85,
      next_actions: [
        'Analyze error logs',
        'Generate code patch',
        'Deploy to staging'
      ],
      metadata: {
        model_version: '1.0.0',
        processing_time_ms: 150
      }
    };

    it('should accept valid response', () => {
      const { error } = validateResponse(validResponse);
      
      expect(error).toBeUndefined();
    });

    it('should reject invalid decision', () => {
      const invalidResponse = {
        ...validResponse,
        decision: 'invalid_decision'
      };

      const { error } = validateResponse(invalidResponse);
      
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('decision');
    });

    it('should reject confidence out of range', () => {
      const invalidResponse = {
        ...validResponse,
        confidence: 1.5
      };

      const { error } = validateResponse(invalidResponse);
      
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('confidence');
    });

    it('should reject insufficient next_actions', () => {
      const invalidResponse = {
        ...validResponse,
        next_actions: ['Only one action']
      };

      const { error } = validateResponse(invalidResponse);
      
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('next_actions');
    });

    it('should require metadata', () => {
      const invalidResponse = {
        ...validResponse
      };
      delete invalidResponse.metadata;

      const { error } = validateResponse(invalidResponse);
      
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('metadata');
    });
  });
});