const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { classifyTicket } = require('./classifier');
const { validateTicketInput } = require('./validation');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Main classification endpoint
app.post('/classify', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const { error, value } = validateTicketInput(req.body);
    if (error) {
      logger.warn('Invalid input received', { error: error.details });
      return res.status(400).json({
        error: 'Invalid input',
        details: error.details.map(d => d.message)
      });
    }

    // Classify the ticket
    const result = await classifyTicket(value);
    
    // Add processing metadata
    result.metadata = {
      ...result.metadata,
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    logger.info('Ticket classified successfully', { 
      decision: result.decision,
      confidence: result.confidence,
      processingTime: result.metadata.processing_time_ms
    });

    res.json(result);

  } catch (error) {
    logger.error('Classification failed', { 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to classify ticket'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`VibeFI Ticket Classifier running on port ${PORT}`);
  });
}

module.exports = app;