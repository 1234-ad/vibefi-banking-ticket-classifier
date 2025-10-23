// Test setup and global configurations
require('dotenv').config({ path: '.env.test' });

// Mock OpenAI for tests to avoid API calls
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                recommendation: 'ai_code_remediation',
                confidence: 0.85,
                reasoning: 'Technical issue detected in test environment',
                technical_indicators: ['api', 'error'],
                operational_indicators: []
              })
            }
          }]
        })
      }
    }
  }));
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.OPENAI_API_KEY = 'test-key';

// Global test timeout
jest.setTimeout(10000);