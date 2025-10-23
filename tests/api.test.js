const request = require('supertest');
const app = require('../src/server');

describe('VibeFI Ticket Classifier API', () => {
  
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /classify', () => {
    const validTicket = {
      channel: 'mobile_app',
      severity: 'high',
      summary: 'Users unable to complete wire transfers due to API timeout errors'
    };

    it('should classify a technical ticket as AI code remediation', async () => {
      const response = await request(app)
        .post('/classify')
        .send(validTicket)
        .expect(200);

      expect(response.body).toHaveProperty('decision');
      expect(response.body).toHaveProperty('reasoning');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('next_actions');
      expect(response.body).toHaveProperty('metadata');
      
      expect(response.body.decision).toBe('ai_code_remediation');
      expect(response.body.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(response.body.next_actions)).toBe(true);
      expect(response.body.next_actions.length).toBeGreaterThan(0);
    });

    it('should classify an operational ticket as Vibe-coded troubleshooting', async () => {
      const operationalTicket = {
        channel: 'phone',
        severity: 'medium',
        summary: 'Customer cannot access account balance and needs help with password reset'
      };

      const response = await request(app)
        .post('/classify')
        .send(operationalTicket)
        .expect(200);

      expect(response.body.decision).toBe('vibe_coded_troubleshooting');
      expect(response.body.confidence).toBeGreaterThan(0.5);
    });

    it('should return 400 for invalid input', async () => {
      const invalidTicket = {
        channel: 'invalid_channel',
        severity: 'high'
        // missing summary
      };

      const response = await request(app)
        .post('/classify')
        .send(invalidTicket)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid input');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteTicket = {
        channel: 'mobile_app'
        // missing severity and summary
      };

      await request(app)
        .post('/classify')
        .send(incompleteTicket)
        .expect(400);
    });

    it('should handle edge case with minimal summary', async () => {
      const edgeTicket = {
        channel: 'email',
        severity: 'low',
        summary: 'Help needed'
      };

      const response = await request(app)
        .post('/classify')
        .send(edgeTicket)
        .expect(200);

      expect(response.body).toHaveProperty('decision');
      expect(response.body.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should include processing metadata', async () => {
      const response = await request(app)
        .post('/classify')
        .send(validTicket)
        .expect(200);

      expect(response.body.metadata).toHaveProperty('processing_time_ms');
      expect(response.body.metadata).toHaveProperty('model_version');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(typeof response.body.metadata.processing_time_ms).toBe('number');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/unknown-route')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/classify')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});