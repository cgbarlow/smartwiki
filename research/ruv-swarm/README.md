# ruv-swarm: Comprehensive Usage Guide

## Overview

ruv-swarm is a powerful Multi-Agent System (MAS) that coordinates Claude Code's actions through intelligent swarm orchestration. It provides neural-enhanced coordination, parallel execution, and persistent memory across sessions.

## 🎯 Core Philosophy

**ruv-swarm coordinates, Claude Code creates!**

- **Claude Code** handles ALL file operations, code generation, and implementation
- **ruv-swarm** provides coordination, memory management, and neural enhancement
- **Agents** are cognitive patterns that guide Claude Code's approach to problems

## 🚀 Quick Start

### Installation

```bash
# Add ruv-swarm MCP server to Claude Code
claude mcp add ruv-swarm npx ruv-swarm mcp start

# Or install globally
npm install -g ruv-swarm

# Or use via npx (recommended)
npx ruv-swarm --help
```

### Basic Usage

1. **Initialize a swarm** (coordination framework)
2. **Spawn agents** (cognitive patterns)
3. **Orchestrate tasks** (coordinate execution)
4. **Monitor progress** (track coordination)

## 🛠️ MCP Tools Reference

### Core Coordination Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `mcp__ruv-swarm__swarm_init` | Initialize coordination topology | `{"topology": "mesh", "maxAgents": 6}` |
| `mcp__ruv-swarm__agent_spawn` | Create cognitive patterns | `{"type": "researcher", "name": "Literature Review"}` |
| `mcp__ruv-swarm__task_orchestrate` | Coordinate complex workflows | `{"task": "Build API", "strategy": "parallel"}` |

### Monitoring Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `mcp__ruv-swarm__swarm_status` | Check coordination status | `{}` |
| `mcp__ruv-swarm__agent_list` | List active agents | `{}` |
| `mcp__ruv-swarm__task_status` | Track task progress | `{"taskId": "build-api"}` |

### Memory & Neural Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `mcp__ruv-swarm__memory_usage` | Store/retrieve coordination data | `{"action": "store", "key": "project/init"}` |
| `mcp__ruv-swarm__neural_train` | Improve coordination patterns | `{"iterations": 10}` |
| `mcp__ruv-swarm__neural_status` | Check neural effectiveness | `{}` |

## 🏗️ Topology Types

### Mesh Topology
- **Best for**: Research, exploration, brainstorming
- **Agents**: 4-6 agents
- **Communication**: All agents communicate with each other
- **Use case**: Comprehensive problem analysis

```json
{
  "topology": "mesh",
  "maxAgents": 5,
  "strategy": "balanced"
}
```

### Hierarchical Topology
- **Best for**: Complex development, large projects
- **Agents**: 6-12 agents
- **Communication**: Tree-like structure with coordinators
- **Use case**: Full-stack development, system architecture

```json
{
  "topology": "hierarchical",
  "maxAgents": 8,
  "strategy": "specialized"
}
```

### Ring Topology
- **Best for**: Sequential processing, pipelines
- **Agents**: 3-5 agents
- **Communication**: Circular, each agent talks to next
- **Use case**: Data processing, CI/CD workflows

```json
{
  "topology": "ring",
  "maxAgents": 4,
  "strategy": "sequential"
}
```

### Star Topology
- **Best for**: Centralized coordination, simple tasks
- **Agents**: 3-6 agents
- **Communication**: Central coordinator manages all
- **Use case**: Code review, testing, documentation

```json
{
  "topology": "star",
  "maxAgents": 5,
  "strategy": "centralized"
}
```

## 🤖 Agent Types

### Researcher
- **Purpose**: Information gathering, analysis
- **Best for**: Market research, technology evaluation
- **Typical tasks**: Web search, document analysis, trend identification

### Coder
- **Purpose**: Implementation, development
- **Best for**: Feature development, bug fixes
- **Typical tasks**: Writing code, API integration, algorithm implementation

### Analyst
- **Purpose**: Data analysis, optimization
- **Best for**: Performance analysis, code review
- **Typical tasks**: Performance profiling, security analysis, code quality

### Architect
- **Purpose**: System design, planning
- **Best for**: System architecture, database design
- **Typical tasks**: Architecture decisions, design patterns, scalability planning

### Tester
- **Purpose**: Quality assurance, validation
- **Best for**: Testing strategies, bug detection
- **Typical tasks**: Test writing, validation, quality checks

### Coordinator
- **Purpose**: Project management, orchestration
- **Best for**: Complex projects, team coordination
- **Typical tasks**: Task breakdown, progress tracking, resource allocation

## 📊 Performance Benefits

When using ruv-swarm with Claude Code:

- **84.8% SWE-Bench solve rate** - Better problem-solving through coordination
- **32.3% token reduction** - Efficient task breakdown reduces redundancy
- **2.8-4.4x speed improvement** - Parallel coordination strategies
- **27+ neural models** - Diverse cognitive approaches

## 🔄 Memory System

### Memory Keys Structure
```
project/
├── init/                 # Project initialization data
├── architecture/         # System design decisions
├── implementation/       # Code implementation notes
└── coordination/         # Agent coordination history

swarm-{id}/
├── agent-{name}/        # Individual agent memories
├── decisions/           # Major decision points
├── progress/           # Task progress tracking
└── metrics/            # Performance metrics
```

### Memory Operations
```javascript
// Store coordination data
{
  "action": "store",
  "key": "project/architecture/api-design",
  "value": {
    "timestamp": "2024-01-01T00:00:00Z",
    "decision": "REST API with JWT authentication",
    "rationale": "Industry standard, well-supported",
    "dependencies": ["auth-service", "database"]
  }
}

// Retrieve coordination data
{
  "action": "retrieve",
  "key": "project/architecture/api-design"
}

// List related memories
{
  "action": "list",
  "pattern": "project/architecture/*"
}
```

## 🎯 Common Workflows

### 1. Research Project
```javascript
// Single message with all operations
[BatchTool]:
  - mcp__ruv-swarm__swarm_init { topology: "mesh", maxAgents: 5, strategy: "balanced" }
  - mcp__ruv-swarm__agent_spawn { type: "researcher", name: "Primary Research" }
  - mcp__ruv-swarm__agent_spawn { type: "researcher", name: "Secondary Research" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Data Analysis" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Trend Analysis" }
  - mcp__ruv-swarm__agent_spawn { type: "coordinator", name: "Research Lead" }
  - mcp__ruv-swarm__task_orchestrate { task: "Research AI trends 2024", strategy: "parallel" }
  - mcp__ruv-swarm__memory_usage { action: "store", key: "research/init", value: {...} }
```

### 2. Full-Stack Development
```javascript
// Single message with all operations
[BatchTool]:
  - mcp__ruv-swarm__swarm_init { topology: "hierarchical", maxAgents: 8, strategy: "specialized" }
  - mcp__ruv-swarm__agent_spawn { type: "architect", name: "System Designer" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "Backend Developer" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "Frontend Developer" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "Database Developer" }
  - mcp__ruv-swarm__agent_spawn { type: "tester", name: "QA Engineer" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Performance Analyst" }
  - mcp__ruv-swarm__agent_spawn { type: "coordinator", name: "Tech Lead" }
  - mcp__ruv-swarm__task_orchestrate { task: "Build e-commerce platform", strategy: "parallel" }
```

### 3. Code Analysis & Optimization
```javascript
// Single message with all operations
[BatchTool]:
  - mcp__ruv-swarm__swarm_init { topology: "star", maxAgents: 6, strategy: "centralized" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Code Quality" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Performance" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "Security" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "Optimizer" }
  - mcp__ruv-swarm__agent_spawn { type: "tester", name: "Validator" }
  - mcp__ruv-swarm__agent_spawn { type: "coordinator", name: "Analysis Lead" }
  - mcp__ruv-swarm__task_orchestrate { task: "Optimize React application", strategy: "sequential" }
```

## 🔗 Integration with Claude Code Hooks

ruv-swarm includes powerful hooks that automate coordination:

### Pre-Operation Hooks
```bash
# Before starting any task
npx ruv-swarm hook pre-task --description "task description" --auto-spawn-agents false

# Before file operations
npx ruv-swarm hook pre-edit --file "path/to/file" --validate-safety true

# Before searches
npx ruv-swarm hook pre-search --query "search terms" --cache-results true
```

### Post-Operation Hooks
```bash
# After file operations
npx ruv-swarm hook post-edit --file "path/to/file" --memory-key "agent/step"

# After task completion
npx ruv-swarm hook post-task --task-id "task-id" --analyze-performance true

# For notifications
npx ruv-swarm hook notification --message "status update" --telemetry true
```

### Session Management
```bash
# Session start
npx ruv-swarm hook session-start --session-id "unique-id" --load-previous true

# Session restore
npx ruv-swarm hook session-restore --session-id "unique-id" --load-memory true

# Session end
npx ruv-swarm hook session-end --export-metrics true --generate-summary true
```

## 🎨 Visual Progress Tracking

ruv-swarm provides visual progress indicators:

```
🐝 Swarm Status: ACTIVE
├── 🏗️ Topology: hierarchical
├── 👥 Agents: 6/8 active
├── ⚡ Mode: parallel execution
├── 📊 Tasks: 12 total (4 complete, 6 in-progress, 2 pending)
└── 🧠 Memory: 15 coordination points stored

📊 Progress Overview
   ├── Total Tasks: 12
   ├── ✅ Completed: 4 (33%)
   ├── 🔄 In Progress: 6 (50%)
   ├── ⭕ Todo: 2 (17%)
   └── ❌ Blocked: 0 (0%)

Agent Activity:
├── 🟢 architect: Designing database schema...
├── 🟢 coder-1: Implementing auth endpoints...
├── 🟢 coder-2: Building user CRUD operations...
├── 🟢 analyst: Optimizing query performance...
├── 🟡 tester: Waiting for auth completion...
└── 🟢 coordinator: Monitoring progress...
```

## 🚫 Common Mistakes to Avoid

### ❌ Don't Do This (Sequential)
```javascript
Message 1: mcp__ruv-swarm__swarm_init
Message 2: mcp__ruv-swarm__agent_spawn (one agent)
Message 3: mcp__ruv-swarm__agent_spawn (another agent)
Message 4: Write single file
Message 5: Run single command
// This is 5x slower and wastes coordination potential!
```

### ✅ Do This Instead (Parallel)
```javascript
Message 1: [BatchTool]
  - mcp__ruv-swarm__swarm_init
  - mcp__ruv-swarm__agent_spawn (all agents)
  - mcp__ruv-swarm__task_orchestrate
  - Multiple Write operations
  - Multiple Bash commands
  - Memory storage operations
```

## 🔧 Advanced Features

### Neural Training
Improve coordination patterns through machine learning:
```javascript
{
  "tool": "mcp__ruv-swarm__neural_train",
  "parameters": {
    "iterations": 10,
    "focus": "coordination_efficiency",
    "learn_from": "recent_sessions"
  }
}
```

### Benchmark Testing
Measure coordination effectiveness:
```javascript
{
  "tool": "mcp__ruv-swarm__benchmark_run",
  "parameters": {
    "suite": "coordination_efficiency",
    "iterations": 5,
    "compare_with": "baseline"
  }
}
```

### Feature Detection
Discover available capabilities:
```javascript
{
  "tool": "mcp__ruv-swarm__features_detect",
  "parameters": {
    "include_experimental": true,
    "check_dependencies": true
  }
}
```

## 📈 Best Practices

### 1. Start Simple
- Begin with basic swarm initialization
- Use 3-5 agents for simple tasks
- Gradually increase complexity

### 2. Use Appropriate Topology
- **Mesh**: Research and exploration
- **Hierarchical**: Complex development
- **Ring**: Sequential processing
- **Star**: Centralized coordination

### 3. Leverage Memory
- Store all major decisions
- Use consistent key patterns
- Retrieve context before major operations

### 4. Monitor Progress
- Regular status checks
- Track coordination effectiveness
- Adjust strategies based on metrics

### 5. Train Neural Patterns
- Regular training sessions
- Focus on coordination efficiency
- Learn from successful patterns

## 🛠️ Troubleshooting

### Common Issues

1. **Agents not coordinating**
   - Check memory usage patterns
   - Ensure hooks are being called
   - Verify topology configuration

2. **Slow performance**
   - Use parallel operations
   - Batch tool calls in single messages
   - Optimize agent count for task complexity

3. **Memory issues**
   - Clear old coordination data
   - Use consistent key patterns
   - Implement memory cleanup routines

### Debug Commands
```bash
# Check swarm status
npx ruv-swarm debug status

# View agent metrics
npx ruv-swarm debug agents

# Check memory usage
npx ruv-swarm debug memory

# Analyze performance
npx ruv-swarm debug performance
```

## 🌐 Remote Execution

ruv-swarm supports remote execution for distributed development:

```bash
# Enable remote mode
export RUVSW_REMOTE_MODE=1

# Use remote-optimized configurations
npx ruv-swarm config remote-optimize
```

## 📚 Additional Resources

- **GitHub Repository**: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm
- **Issues & Support**: https://github.com/ruvnet/ruv-FANN/issues
- **Examples**: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm/examples
- **Documentation**: Full documentation in project wiki

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Remember**: ruv-swarm coordinates, Claude Code creates! Use swarm intelligence to enhance your development workflow while letting Claude Code handle all the actual implementation work.