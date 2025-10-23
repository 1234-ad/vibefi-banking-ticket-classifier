# VibeFI Banking Support Ticket Classifier

An AI-powered service that classifies banking support tickets and determines whether they need AI-generated code remediation or Vibe-coded troubleshooting scripts.

## Overview

This service accepts JSON input describing banking support tickets and intelligently routes them to the appropriate resolution path:
- **AI Code Remediation**: For technical issues requiring code patches
- **Vibe-coded Troubleshooting**: For operational issues requiring workflow scripts

## Features

- 🎯 Intelligent ticket classification based on channel, severity, and content
- 🤖 AI-assisted decision making with transparent reasoning
- 📋 Structured response with actionable next steps
- ✅ Comprehensive validation and testing framework
- 🚀 Ready for production deployment

## Quick Start

```bash
# Install dependencies
npm install

# Run the service
npm start

# Run tests
npm test
```

## API Usage

```bash
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "mobile_app",
    "severity": "high",
    "summary": "Users unable to complete wire transfers due to API timeout errors"
  }'
```

## Response Format

```json
{
  "decision": "ai_code_remediation",
  "reasoning": "Technical API issue requiring code-level fixes",
  "confidence": 0.92,
  "next_actions": [
    "Analyze API timeout patterns",
    "Generate timeout handling patch",
    "Deploy to staging environment"
  ],
  "metadata": {
    "processing_time_ms": 45,
    "model_version": "1.0.0"
  }
}
```

## Architecture

- **Core Logic**: `src/classifier.js` - Main classification engine
- **AI Integration**: `src/ai-helper.js` - GPT-powered analysis
- **Validation**: `tests/` - Comprehensive test suite
- **API**: `src/server.js` - Express.js REST API

## Validation Strategy

1. **Unit Tests**: Core logic validation
2. **Integration Tests**: End-to-end API testing
3. **Performance Tests**: Response time benchmarks
4. **Edge Case Testing**: Malformed input handling

## Trade-offs & Design Decisions

- **Language Choice**: Node.js for rapid development and JSON handling
- **AI Integration**: OpenAI GPT for natural language understanding
- **Simplicity**: Focused on core functionality over complex ML pipelines
- **Extensibility**: Modular design for easy feature additions