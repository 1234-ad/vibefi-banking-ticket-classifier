const { 
  classifyTicket, 
  calculateRuleBasedScore, 
  generateActionChecklist,
  CLASSIFICATION_RULES 
} = require('../src/classifier');

describe('Ticket Classifier', () => {
  
  describe('calculateRuleBasedScore', () => {
    it('should score technical tickets highly for AI remediation', () => {
      const technicalTicket = {
        channel: 'api',
        severity: 'high',
        summary: 'API timeout errors causing database connection failures'
      };

      const aiScore = calculateRuleBasedScore(technicalTicket, 'ai_code_remediation');
      const vibeScore = calculateRuleBasedScore(technicalTicket, 'vibe_coded_troubleshooting');

      expect(aiScore).toBeGreaterThan(vibeScore);
      expect(aiScore).toBeGreaterThan(0.7);
    });

    it('should score operational tickets highly for Vibe troubleshooting', () => {
      const operationalTicket = {
        channel: 'phone',
        severity: 'medium',
        summary: 'Customer needs help with account balance verification and password reset'
      };

      const aiScore = calculateRuleBasedScore(operationalTicket, 'ai_code_remediation');
      const vibeScore = calculateRuleBasedScore(operationalTicket, 'vibe_coded_troubleshooting');

      expect(vibeScore).toBeGreaterThan(aiScore);
      expect(vibeScore).toBeGreaterThan(0.7);
    });

    it('should handle mixed signals appropriately', () => {
      const mixedTicket = {
        channel: 'mobile_app', // technical channel
        severity: 'low', // operational severity
        summary: 'User account shows wrong balance information' // mixed keywords
      };

      const aiScore = calculateRuleBasedScore(mixedTicket, 'ai_code_remediation');
      const vibeScore = calculateRuleBasedScore(mixedTicket, 'vibe_coded_troubleshooting');

      expect(aiScore).toBeGreaterThan(0);
      expect(vibeScore).toBeGreaterThan(0);
    });
  });

  describe('generateActionChecklist', () => {
    it('should generate appropriate actions for AI code remediation', () => {
      const ticket = { channel: 'api', severity: 'high', summary: 'API errors' };
      const actions = generateActionChecklist('ai_code_remediation', ticket);

      expect(actions).toContain('Analyze error logs and stack traces');
      expect(actions).toContain('Generate code patch or fix');
      expect(actions.length).toBeLessThanOrEqual(6);
    });

    it('should generate appropriate actions for Vibe troubleshooting', () => {
      const ticket = { channel: 'phone', severity: 'medium', summary: 'Account help' };
      const actions = generateActionChecklist('vibe_coded_troubleshooting', ticket);

      expect(actions).toContain('Review customer account details');
      expect(actions).toContain('Execute diagnostic workflow');
      expect(actions.length).toBeLessThanOrEqual(6);
    });

    it('should add critical severity escalation', () => {
      const criticalTicket = { channel: 'api', severity: 'critical', summary: 'System down' };
      const actions = generateActionChecklist('ai_code_remediation', criticalTicket);

      expect(actions[0]).toBe('Escalate to senior team immediately');
      expect(actions).toContain('Prepare incident report');
    });

    it('should customize for mobile app channel', () => {
      const mobileTicket = { channel: 'mobile_app', severity: 'high', summary: 'App crashes' };
      const actions = generateActionChecklist('ai_code_remediation', mobileTicket);

      expect(actions.some(action => action.includes('mobile platforms'))).toBe(true);
    });
  });

  describe('classifyTicket', () => {
    it('should classify technical tickets correctly', async () => {
      const technicalTicket = {
        channel: 'mobile_app',
        severity: 'high',
        summary: 'Application crashes when users try to authenticate via API'
      };

      const result = await classifyTicket(technicalTicket);

      expect(result.decision).toBe('ai_code_remediation');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning).toContain('Technical');
      expect(Array.isArray(result.next_actions)).toBe(true);
      expect(result.metadata).toHaveProperty('model_version');
    });

    it('should classify operational tickets correctly', async () => {
      const operationalTicket = {
        channel: 'chat',
        severity: 'low',
        summary: 'Customer wants to update profile information and check account balance'
      };

      const result = await classifyTicket(operationalTicket);

      expect(result.decision).toBe('vibe_coded_troubleshooting');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning).toContain('Operational');
    });

    it('should handle edge cases gracefully', async () => {
      const edgeTicket = {
        channel: 'email',
        severity: 'medium',
        summary: 'General inquiry about services'
      };

      const result = await classifyTicket(edgeTicket);

      expect(['ai_code_remediation', 'vibe_coded_troubleshooting']).toContain(result.decision);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should include proper metadata', async () => {
      const ticket = {
        channel: 'api',
        severity: 'high',
        summary: 'Database connection timeout'
      };

      const result = await classifyTicket(ticket);

      expect(result.metadata).toHaveProperty('model_version', '1.0.0');
      expect(result.metadata).toHaveProperty('rule_scores');
      expect(result.metadata.rule_scores).toHaveProperty('ai_score');
      expect(result.metadata.rule_scores).toHaveProperty('vibe_score');
    });
  });

  describe('CLASSIFICATION_RULES', () => {
    it('should have valid rule structure', () => {
      expect(CLASSIFICATION_RULES).toHaveProperty('ai_code_remediation');
      expect(CLASSIFICATION_RULES).toHaveProperty('vibe_coded_troubleshooting');
      
      expect(Array.isArray(CLASSIFICATION_RULES.ai_code_remediation.keywords)).toBe(true);
      expect(Array.isArray(CLASSIFICATION_RULES.vibe_coded_troubleshooting.keywords)).toBe(true);
    });

    it('should have non-overlapping channel preferences', () => {
      const aiChannels = CLASSIFICATION_RULES.ai_code_remediation.channels;
      const vibeChannels = CLASSIFICATION_RULES.vibe_coded_troubleshooting.channels;
      
      const overlap = aiChannels.filter(channel => vibeChannels.includes(channel));
      expect(overlap.length).toBe(0);
    });
  });
});