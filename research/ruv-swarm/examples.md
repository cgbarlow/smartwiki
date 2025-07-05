# ruv-swarm: Practical Examples

## 📚 Table of Contents

1. [Basic Examples](#basic-examples)
2. [Research Projects](#research-projects)
3. [Development Projects](#development-projects)
4. [Analysis & Optimization](#analysis--optimization)
5. [Advanced Workflows](#advanced-workflows)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)

## 🚀 Basic Examples

### Example 1: Simple Research Task

**Task**: Research the latest trends in AI development

```javascript
// Single message with parallel execution
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "mesh",
      maxAgents: 4,
      strategy: "balanced"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "AI Trends Researcher"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Market Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Technical Researcher"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Research Coordinator"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Research AI development trends 2024",
      strategy: "parallel",
      priority: "high"
    }
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "research/ai-trends/init",
      value: {
        timestamp: "2024-01-01T00:00:00Z",
        task: "AI trends research",
        scope: "comprehensive analysis"
      }
    }
```

### Example 2: Code Analysis

**Task**: Analyze a React component for performance issues

```javascript
// Single message with star topology for centralized analysis
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "star",
      maxAgents: 5,
      strategy: "centralized"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Performance Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Code Quality Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Security Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Optimization Specialist"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Analysis Coordinator"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Analyze React component performance",
      strategy: "sequential",
      priority: "medium"
    }
  - Read("src/components/UserProfile.jsx")
  - Read("src/components/UserProfile.test.jsx")
  - Read("package.json")
```

## 🔬 Research Projects

### Example 3: Comprehensive Market Research

**Task**: Analyze competitive landscape for a new SaaS product

```javascript
// Hierarchical topology for comprehensive research
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "hierarchical",
      maxAgents: 8,
      strategy: "specialized"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Market Research Lead"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Competitor Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Customer Research"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Pricing Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Feature Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Trend Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Technology Researcher"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Research Director"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Comprehensive SaaS market analysis",
      strategy: "parallel",
      priority: "high"
    }
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "market-research/saas/init",
      value: {
        sector: "SaaS",
        focus: "competitive analysis",
        timeline: "Q1 2024"
      }
    }
  - TodoWrite {
      todos: [
        { id: "competitor-analysis", content: "Analyze top 10 competitors", status: "pending", priority: "high" },
        { id: "pricing-research", content: "Research pricing models", status: "pending", priority: "high" },
        { id: "feature-comparison", content: "Compare feature sets", status: "pending", priority: "medium" },
        { id: "market-trends", content: "Identify market trends", status: "pending", priority: "medium" },
        { id: "customer-feedback", content: "Analyze customer reviews", status: "pending", priority: "low" }
      ]
    }
```

### Example 4: Technical Documentation Research

**Task**: Research and document best practices for API design

```javascript
// Mesh topology for collaborative documentation
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "mesh",
      maxAgents: 6,
      strategy: "collaborative"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "API Standards Researcher"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "researcher",
      name: "Industry Practices Researcher"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Best Practices Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Implementation Expert"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Documentation Specialist"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Documentation Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Research API design best practices",
      strategy: "adaptive",
      priority: "high"
    }
  - Bash("mkdir -p research/api-design/{standards,examples,tools}")
  - Write("research/api-design/outline.md", "# API Design Best Practices Research\n\n## Scope\n- REST API standards\n- GraphQL considerations\n- Authentication patterns\n- Error handling\n- Documentation standards")
```

## 💻 Development Projects

### Example 5: Full-Stack Web Application

**Task**: Build a complete e-commerce platform

```javascript
// Hierarchical topology for complex development
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "hierarchical",
      maxAgents: 12,
      strategy: "specialized"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "architect",
      name: "System Architect"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "architect",
      name: "Database Architect"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Backend Lead"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Frontend Lead"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "API Developer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "UI/UX Developer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Auth Specialist"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Payment Integration"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "QA Engineer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Integration Tester"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Performance Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Project Manager"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Build e-commerce platform",
      strategy: "parallel",
      priority: "high"
    }
  - TodoWrite {
      todos: [
        { id: "architecture", content: "Design system architecture", status: "in_progress", priority: "high" },
        { id: "database", content: "Design database schema", status: "pending", priority: "high" },
        { id: "auth", content: "Implement authentication", status: "pending", priority: "high" },
        { id: "api", content: "Build REST API", status: "pending", priority: "high" },
        { id: "frontend", content: "Build React frontend", status: "pending", priority: "high" },
        { id: "payment", content: "Integrate payment system", status: "pending", priority: "medium" },
        { id: "testing", content: "Write comprehensive tests", status: "pending", priority: "medium" },
        { id: "deployment", content: "Setup deployment pipeline", status: "pending", priority: "low" }
      ]
    }
  - Bash("mkdir -p ecommerce/{backend,frontend,database,tests,docs}")
  - Bash("mkdir -p ecommerce/backend/{src,tests,config}")
  - Bash("mkdir -p ecommerce/frontend/{src,public,tests}")
  - Write("ecommerce/README.md", "# E-commerce Platform\n\n## Architecture\n- Backend: Node.js/Express\n- Frontend: React/TypeScript\n- Database: PostgreSQL\n- Auth: JWT + OAuth\n- Payment: Stripe")
  - Write("ecommerce/backend/package.json", JSON.stringify({
      name: "ecommerce-backend",
      version: "1.0.0",
      description: "E-commerce backend API",
      main: "src/server.js",
      scripts: {
        start: "node src/server.js",
        dev: "nodemon src/server.js",
        test: "jest"
      },
      dependencies: {
        express: "^4.18.0",
        cors: "^2.8.5",
        helmet: "^6.0.0",
        "jsonwebtoken": "^9.0.0",
        "bcryptjs": "^2.4.3",
        "pg": "^8.8.0"
      }
    }, null, 2))
```

### Example 6: API Microservice

**Task**: Build a user management microservice

```javascript
// Ring topology for sequential development pipeline
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "ring",
      maxAgents: 6,
      strategy: "sequential"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "architect",
      name: "Service Architect"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "API Developer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Database Developer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Test Engineer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Security Analyst"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Service Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Build user management microservice",
      strategy: "pipeline",
      priority: "high"
    }
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "microservice/user-mgmt/requirements",
      value: {
        features: ["CRUD operations", "authentication", "authorization", "validation"],
        tech_stack: ["Node.js", "Express", "PostgreSQL", "JWT"],
        endpoints: ["/users", "/auth/login", "/auth/register", "/auth/refresh"]
      }
    }
  - Bash("mkdir -p user-service/{src,tests,docs,config}")
  - Bash("mkdir -p user-service/src/{controllers,models,routes,middleware,utils}")
  - Write("user-service/src/server.js", `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`User service running on port \${PORT}\`);
});`)
```

## 📊 Analysis & Optimization

### Example 7: Performance Optimization

**Task**: Optimize a slow React application

```javascript
// Star topology for centralized performance analysis
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "star",
      maxAgents: 7,
      strategy: "centralized"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Performance Profiler"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Bundle Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Render Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Memory Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Optimization Specialist"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Performance Tester"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Optimization Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Optimize React app performance",
      strategy: "systematic",
      priority: "high"
    }
  - TodoWrite {
      todos: [
        { id: "audit", content: "Performance audit", status: "in_progress", priority: "high" },
        { id: "bundle", content: "Bundle size analysis", status: "pending", priority: "high" },
        { id: "renders", content: "Identify unnecessary renders", status: "pending", priority: "high" },
        { id: "memory", content: "Memory leak detection", status: "pending", priority: "medium" },
        { id: "optimize", content: "Implement optimizations", status: "pending", priority: "medium" },
        { id: "test", content: "Performance testing", status: "pending", priority: "low" }
      ]
    }
  - Bash("npm install --save-dev webpack-bundle-analyzer")
  - Bash("npm install --save-dev @welldone-software/why-did-you-render")
  - Read("package.json")
  - Read("src/App.jsx")
  - Read("src/components/")
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "optimization/react-app/baseline",
      value: {
        initial_bundle_size: "unknown",
        initial_load_time: "unknown",
        components_count: "unknown",
        optimization_targets: ["bundle size", "render performance", "memory usage"]
      }
    }
```

### Example 8: Security Audit

**Task**: Conduct comprehensive security audit of a web application

```javascript
// Hierarchical topology for systematic security analysis
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "hierarchical",
      maxAgents: 9,
      strategy: "systematic"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Security Audit Lead"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Authentication Security"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Input Validation"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "XSS Prevention"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "CSRF Protection"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "SQL Injection"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Dependency Audit"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Security Fixer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Security Manager"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Comprehensive security audit",
      strategy: "parallel",
      priority: "critical"
    }
  - Bash("npm audit --audit-level=moderate")
  - Bash("npm install --save-dev eslint-plugin-security")
  - Read("package.json")
  - Read("src/")
  - Read("server/")
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "security/audit/checklist",
      value: {
        areas: [
          "Authentication & Authorization",
          "Input Validation",
          "XSS Prevention",
          "CSRF Protection",
          "SQL Injection",
          "Dependency Vulnerabilities",
          "HTTPS Configuration",
          "Error Handling",
          "Session Management"
        ],
        tools: ["npm audit", "eslint-plugin-security", "manual review"],
        priority: "critical"
      }
    }
```

## 🧠 Advanced Workflows

### Example 9: Machine Learning Pipeline

**Task**: Build an ML data processing pipeline

```javascript
// Ring topology for sequential ML pipeline
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "ring",
      maxAgents: 8,
      strategy: "pipeline"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "architect",
      name: "ML Architect"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Data Ingestion"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Data Preprocessing"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Feature Engineering"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Model Training"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Model Evaluation"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Model Deployment"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "ML Pipeline Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Build ML data pipeline",
      strategy: "sequential",
      priority: "high"
    }
  - Bash("mkdir -p ml-pipeline/{data,models,src,tests,notebooks}")
  - Bash("mkdir -p ml-pipeline/src/{ingestion,preprocessing,training,evaluation,deployment}")
  - Write("ml-pipeline/requirements.txt", `pandas==1.5.3
numpy==1.24.3
scikit-learn==1.3.0
matplotlib==3.7.1
seaborn==0.12.2
jupyter==1.0.0
pytest==7.4.0`)
  - Write("ml-pipeline/README.md", "# ML Data Pipeline\n\n## Components\n1. Data Ingestion\n2. Data Preprocessing\n3. Feature Engineering\n4. Model Training\n5. Model Evaluation\n6. Model Deployment\n\n## Setup\n```bash\npip install -r requirements.txt\n```")
```

### Example 10: Multi-Language Code Migration

**Task**: Migrate a Python Flask app to Node.js Express

```javascript
// Mesh topology for collaborative migration
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "mesh",
      maxAgents: 10,
      strategy: "collaborative"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "architect",
      name: "Migration Architect"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Code Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Dependency Mapper"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Python Expert"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Node.js Expert"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "API Converter"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Database Migrator"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Migration Tester"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Performance Comparer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Migration Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Migrate Flask app to Express",
      strategy: "parallel",
      priority: "high"
    }
  - TodoWrite {
      todos: [
        { id: "analysis", content: "Analyze existing Flask app", status: "in_progress", priority: "high" },
        { id: "mapping", content: "Map dependencies Flask->Express", status: "pending", priority: "high" },
        { id: "structure", content: "Design Node.js project structure", status: "pending", priority: "high" },
        { id: "routes", content: "Convert Flask routes to Express", status: "pending", priority: "high" },
        { id: "middleware", content: "Convert Flask middleware", status: "pending", priority: "medium" },
        { id: "database", content: "Migrate database layer", status: "pending", priority: "medium" },
        { id: "tests", content: "Convert test suite", status: "pending", priority: "medium" },
        { id: "validation", content: "Validate migration completeness", status: "pending", priority: "low" }
      ]
    }
  - Read("app.py")
  - Read("requirements.txt")
  - Read("models/")
  - Read("routes/")
  - Read("tests/")
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "migration/flask-to-express/analysis",
      value: {
        source_framework: "Flask",
        target_framework: "Express",
        migration_scope: "full application",
        complexity: "high",
        estimated_effort: "2-3 weeks"
      }
    }
```

## 🚨 Error Handling

### Example 11: Error Recovery and Debugging

**Task**: Debug and fix a failing CI/CD pipeline

```javascript
// Star topology for centralized debugging
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "star",
      maxAgents: 6,
      strategy: "diagnostic"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "CI/CD Diagnostician"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Log Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Dependency Checker"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Pipeline Fixer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Pipeline Tester"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "DevOps Lead"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Debug and fix CI/CD pipeline",
      strategy: "systematic",
      priority: "critical"
    }
  - Read(".github/workflows/ci.yml")
  - Read("package.json")
  - Read("Dockerfile")
  - Bash("git log --oneline -10")
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "debugging/cicd/initial-state",
      value: {
        status: "failing",
        last_successful_run: "unknown",
        suspected_causes: ["dependency issues", "configuration changes", "environment problems"],
        priority: "critical"
      }
    }
```

## ⚡ Performance Optimization

### Example 12: Database Query Optimization

**Task**: Optimize slow database queries in a Node.js application

```javascript
// Hierarchical topology for systematic optimization
[BatchTool]:
  - mcp__ruv-swarm__swarm_init {
      topology: "hierarchical",
      maxAgents: 8,
      strategy: "performance"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Query Performance Lead"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Index Analyzer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Execution Plan Reviewer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "analyst",
      name: "Schema Optimizer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Query Optimizer"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coder",
      name: "Caching Specialist"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "tester",
      name: "Performance Tester"
    }
  - mcp__ruv-swarm__agent_spawn {
      type: "coordinator",
      name: "Database Performance Manager"
    }
  - mcp__ruv-swarm__task_orchestrate {
      task: "Optimize database queries",
      strategy: "systematic",
      priority: "high"
    }
  - Read("src/models/")
  - Read("src/queries/")
  - Read("database/schema.sql")
  - Bash("npm install --save-dev clinic")
  - mcp__ruv-swarm__memory_usage {
      action: "store",
      key: "optimization/database/baseline",
      value: {
        slow_queries: [],
        performance_metrics: {},
        optimization_targets: ["query execution time", "index usage", "connection pooling"],
        tools: ["EXPLAIN ANALYZE", "clinic.js", "pg_stat_statements"]
      }
    }
```

## 📋 Coordination Patterns

### Memory Usage Patterns

```javascript
// Store coordination decisions
mcp__ruv-swarm__memory_usage {
  action: "store",
  key: "project/decisions/architecture",
  value: {
    timestamp: "2024-01-01T00:00:00Z",
    decision: "Microservices architecture",
    rationale: "Scalability and maintainability",
    alternatives_considered: ["monolith", "modular monolith"],
    impact: "high",
    stakeholders: ["tech lead", "architect", "team leads"]
  }
}

// Retrieve coordination context
mcp__ruv-swarm__memory_usage {
  action: "retrieve",
  key: "project/decisions/architecture"
}

// List all project decisions
mcp__ruv-swarm__memory_usage {
  action: "list",
  pattern: "project/decisions/*"
}
```

### Agent Coordination Protocol

Every agent must follow this coordination protocol:

```bash
# 1. Before starting work
npx ruv-swarm hook pre-task --description "implement user authentication" --auto-spawn-agents false

# 2. During work (after each major step)
npx ruv-swarm hook post-edit --file "src/auth/login.js" --memory-key "auth/implementation/login"
npx ruv-swarm hook notification --message "completed login endpoint" --telemetry true

# 3. After completing work
npx ruv-swarm hook post-task --task-id "auth-implementation" --analyze-performance true
```

## 🎯 Best Practices Summary

1. **Always use parallel execution** - Batch operations in single messages
2. **Choose appropriate topology** - Match topology to task complexity
3. **Leverage memory system** - Store decisions and context
4. **Monitor coordination** - Regular status checks
5. **Train neural patterns** - Continuous improvement
6. **Use hooks consistently** - Maintain coordination protocol
7. **Scale appropriately** - Right-size agent count for task

## 🔍 Troubleshooting Common Issues

### Issue: Agents not coordinating effectively
```javascript
// Check swarm status
mcp__ruv-swarm__swarm_status {}

// Review agent metrics
mcp__ruv-swarm__agent_metrics {}

// Verify memory usage
mcp__ruv-swarm__memory_usage {
  action: "list",
  pattern: "swarm-*/coordination/*"
}
```

### Issue: Poor performance
```javascript
// Run benchmark
mcp__ruv-swarm__benchmark_run {
  suite: "coordination_efficiency",
  iterations: 3
}

// Check bottlenecks
mcp__ruv-swarm__swarm_monitor {}
```

---

These examples demonstrate the power of ruv-swarm coordination with Claude Code. Remember: **swarm coordinates, Claude Code creates!**