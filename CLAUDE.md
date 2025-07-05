# Claude Code Configuration for ruv-swarm

## 🎯 IMPORTANT: Separation of Responsibilities

### Claude Code Handles:
- ✅ **ALL file operations** (Read, Write, Edit, MultiEdit)
- ✅ **ALL code generation** and development tasks
- ✅ **ALL bash commands** and system operations
- ✅ **ALL actual implementation** work
- ✅ **Project navigation** and code analysis

### ruv-swarm MCP Tools Handle:
- 🧠 **Coordination only** - Orchestrating Claude Code's actions
- 💾 **Memory management** - Persistent state across sessions
- 🤖 **Neural features** - Cognitive patterns and learning
- 📊 **Performance tracking** - Monitoring and metrics
- 🐝 **Swarm orchestration** - Multi-agent coordination

### ⚠️ Key Principle:
**MCP tools DO NOT create content or write code.** They coordinate and enhance Claude Code's native capabilities. Think of them as an orchestration layer that helps Claude Code work more efficiently.

## 🚀 CRITICAL: Parallel Execution & Batch Operations

### 🚨 MANDATORY RULE #1: BATCH EVERYTHING

**When using swarms, you MUST use BatchTool for ALL operations:**

1. **NEVER** send multiple messages for related operations
2. **ALWAYS** combine multiple tool calls in ONE message
3. **PARALLEL** execution is MANDATORY, not optional

### ⚡ THE GOLDEN RULE OF SWARMS

```
If you need to do X operations, they should be in 1 message, not X messages
```

### 📦 BATCH TOOL EXAMPLES

**✅ CORRECT - Everything in ONE Message:**
```javascript
[Single Message with BatchTool]:
  mcp__ruv-swarm__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__ruv-swarm__agent_spawn { type: "researcher" }
  mcp__ruv-swarm__agent_spawn { type: "coder" }
  mcp__ruv-swarm__agent_spawn { type: "analyst" }
  mcp__ruv-swarm__agent_spawn { type: "tester" }
  mcp__ruv-swarm__agent_spawn { type: "coordinator" }
  TodoWrite { todos: [todo1, todo2, todo3, todo4, todo5] }
  Bash "mkdir -p app/{src,tests,docs}"
  Write "app/package.json" 
  Write "app/README.md"
  Write "app/src/index.js"
```

**❌ WRONG - Multiple Messages (NEVER DO THIS):**
```javascript
Message 1: mcp__ruv-swarm__swarm_init
Message 2: mcp__ruv-swarm__agent_spawn 
Message 3: mcp__ruv-swarm__agent_spawn
Message 4: TodoWrite (one todo)
Message 5: Bash "mkdir src"
Message 6: Write "package.json"
// This is 6x slower and breaks parallel coordination!
```

### 🎯 BATCH OPERATIONS BY TYPE

**File Operations (Single Message):**
- Read 10 files? → One message with 10 Read calls
- Write 5 files? → One message with 5 Write calls
- Edit 1 file many times? → One MultiEdit call

**Swarm Operations (Single Message):**
- Need 8 agents? → One message with swarm_init + 8 agent_spawn calls
- Multiple memories? → One message with all memory_usage calls
- Task + monitoring? → One message with task_orchestrate + swarm_monitor

**Command Operations (Single Message):**
- Multiple directories? → One message with all mkdir commands
- Install + test + lint? → One message with all npm commands
- Git operations? → One message with all git commands

## 🚀 Quick Setup (Stdio MCP - Recommended)

### 1. Add MCP Server (Stdio - No Port Needed)
```bash
# Add ruv-swarm MCP server to Claude Code using stdio
claude mcp add ruv-swarm npx ruv-swarm mcp start
```

### 2. Use MCP Tools for Coordination in Claude Code
Once configured, ruv-swarm MCP tools enhance Claude Code's coordination:

**Initialize a swarm:**
- Use the `mcp__ruv-swarm__swarm_init` tool to set up coordination topology
- Choose: mesh, hierarchical, ring, or star
- This creates a coordination framework for Claude Code's work

**Spawn agents:**
- Use `mcp__ruv-swarm__agent_spawn` tool to create specialized coordinators
- Agent types represent different thinking patterns, not actual coders
- They help Claude Code approach problems from different angles

**Orchestrate tasks:**
- Use `mcp__ruv-swarm__task_orchestrate` tool to coordinate complex workflows
- This breaks down tasks for Claude Code to execute systematically
- The agents don't write code - they coordinate Claude Code's actions

## Available MCP Tools for Coordination

### Coordination Tools:
- `mcp__ruv-swarm__swarm_init` - Set up coordination topology for Claude Code
- `mcp__ruv-swarm__agent_spawn` - Create cognitive patterns to guide Claude Code
- `mcp__ruv-swarm__task_orchestrate` - Break down and coordinate complex tasks

### Monitoring Tools:
- `mcp__ruv-swarm__swarm_status` - Monitor coordination effectiveness
- `mcp__ruv-swarm__agent_list` - View active cognitive patterns
- `mcp__ruv-swarm__agent_metrics` - Track coordination performance
- `mcp__ruv-swarm__task_status` - Check workflow progress
- `mcp__ruv-swarm__task_results` - Review coordination outcomes

### Memory & Neural Tools:
- `mcp__ruv-swarm__memory_usage` - Persistent memory across sessions
- `mcp__ruv-swarm__neural_status` - Neural pattern effectiveness
- `mcp__ruv-swarm__neural_train` - Improve coordination patterns
- `mcp__ruv-swarm__neural_patterns` - Analyze thinking approaches

### System Tools:
- `mcp__ruv-swarm__benchmark_run` - Measure coordination efficiency
- `mcp__ruv-swarm__features_detect` - Available capabilities
- `mcp__ruv-swarm__swarm_monitor` - Real-time coordination tracking

## Workflow Examples (Coordination-Focused)

### Research Coordination Example
**Context:** Claude Code needs to research a complex topic systematically

**Step 1:** Set up research coordination
- Tool: `mcp__ruv-swarm__swarm_init`
- Parameters: `{"topology": "mesh", "maxAgents": 5, "strategy": "balanced"}`
- Result: Creates a mesh topology for comprehensive exploration

**Step 2:** Define research perspectives
- Tool: `mcp__ruv-swarm__agent_spawn`
- Parameters: `{"type": "researcher", "name": "Literature Review"}`
- Tool: `mcp__ruv-swarm__agent_spawn`
- Parameters: `{"type": "analyst", "name": "Data Analysis"}`
- Result: Different cognitive patterns for Claude Code to use

**Step 3:** Coordinate research execution
- Tool: `mcp__ruv-swarm__task_orchestrate`
- Parameters: `{"task": "Research neural architecture search papers", "strategy": "adaptive"}`
- Result: Claude Code systematically searches, reads, and analyzes papers

**What Actually Happens:**
1. The swarm sets up a coordination framework
2. Each agent MUST use ruv-swarm hooks for coordination:
   - `npx ruv-swarm hook pre-task` before starting
   - `npx ruv-swarm hook post-edit` after each file operation
   - `npx ruv-swarm hook notification` to share decisions
3. Claude Code uses its native Read, WebSearch, and Task tools
4. The swarm coordinates through shared memory and hooks
5. Results are synthesized by Claude Code with full coordination history

### Development Coordination Example
**Context:** Claude Code needs to build a complex system with multiple components

**Step 1:** Set up development coordination
- Tool: `mcp__ruv-swarm__swarm_init`
- Parameters: `{"topology": "hierarchical", "maxAgents": 8, "strategy": "specialized"}`
- Result: Hierarchical structure for organized development

**Step 2:** Define development perspectives
- Tool: `mcp__ruv-swarm__agent_spawn`
- Parameters: `{"type": "architect", "name": "System Design"}`
- Result: Architectural thinking pattern for Claude Code

**Step 3:** Coordinate implementation
- Tool: `mcp__ruv-swarm__task_orchestrate`
- Parameters: `{"task": "Implement user authentication with JWT", "strategy": "parallel"}`
- Result: Claude Code implements features using its native tools

**What Actually Happens:**
1. The swarm creates a development coordination plan
2. Each agent coordinates using mandatory hooks:
   - Pre-task hooks for context loading
   - Post-edit hooks for progress tracking
   - Memory storage for cross-agent coordination
3. Claude Code uses Write, Edit, Bash tools for implementation
4. Agents share progress through ruv-swarm memory
5. All code is written by Claude Code with full coordination

## Best Practices for Coordination

### ✅ DO:
- Use MCP tools to coordinate Claude Code's approach to complex tasks
- Let the swarm break down problems into manageable pieces
- Use memory tools to maintain context across sessions
- Monitor coordination effectiveness with status tools
- Train neural patterns for better coordination over time

### ❌ DON'T:
- Expect agents to write code (Claude Code does all implementation)
- Use MCP tools for file operations (use Claude Code's native tools)
- Try to make agents execute bash commands (Claude Code handles this)
- Confuse coordination with execution (MCP coordinates, Claude executes)

## Memory and Persistence

The swarm provides persistent memory that helps Claude Code:
- Remember project context across sessions
- Track decisions and rationale
- Maintain consistency in large projects
- Learn from previous coordination patterns

## Performance Benefits

When using ruv-swarm coordination with Claude Code:
- **84.8% SWE-Bench solve rate** - Better problem-solving through coordination
- **32.3% token reduction** - Efficient task breakdown reduces redundancy
- **2.8-4.4x speed improvement** - Parallel coordination strategies
- **27+ neural models** - Diverse cognitive approaches

## Claude Code Hooks Integration

ruv-swarm includes powerful hooks that automate coordination:

### Pre-Operation Hooks
- **Auto-assign agents** before file edits based on file type
- **Validate commands** before execution for safety
- **Prepare resources** automatically for complex operations
- **Optimize topology** based on task complexity analysis
- **Cache searches** for improved performance

### Post-Operation Hooks  
- **Auto-format code** using language-specific formatters
- **Train neural patterns** from successful operations
- **Update memory** with operation context
- **Analyze performance** and identify bottlenecks
- **Track token usage** for efficiency metrics

### Session Management
- **Generate summaries** at session end
- **Persist state** across Claude Code sessions
- **Track metrics** for continuous improvement
- **Restore previous** session context automatically

### Advanced Features (New!)
- **🚀 Automatic Topology Selection** - Optimal swarm structure for each task
- **⚡ Parallel Execution** - 2.8-4.4x speed improvements  
- **🧠 Neural Training** - Continuous learning from operations
- **📊 Bottleneck Analysis** - Real-time performance optimization
- **🤖 Smart Auto-Spawning** - Zero manual agent management
- **🛡️ Self-Healing Workflows** - Automatic error recovery
- **💾 Cross-Session Memory** - Persistent learning & context

### Configuration
Hooks are pre-configured in `.claude/settings.json`. Key features:
- Automatic agent assignment for different file types
- Code formatting on save
- Neural pattern learning from edits
- Session state persistence
- Performance tracking and optimization
- Intelligent caching and token reduction

See `.claude/commands/` for detailed documentation on all features.

## Integration Tips

1. **Start Simple**: Begin with basic swarm init and single agent
2. **Scale Gradually**: Add more agents as task complexity increases
3. **Use Memory**: Store important decisions and context
4. **Monitor Progress**: Regular status checks ensure effective coordination
5. **Train Patterns**: Let neural agents learn from successful coordinations
6. **Enable Hooks**: Use the pre-configured hooks for automation

## 🧠 SWARM ORCHESTRATION PATTERN

### You are the SWARM ORCHESTRATOR. **IMMEDIATELY SPAWN AGENTS IN PARALLEL** to execute tasks

### 🚨 CRITICAL INSTRUCTION: You are the SWARM ORCHESTRATOR

**MANDATORY**: When using swarms, you MUST:
1. **SPAWN ALL AGENTS IN ONE BATCH** - Use multiple tool calls in a SINGLE message
2. **EXECUTE TASKS IN PARALLEL** - Never wait for one task before starting another
3. **USE BATCHTOOL FOR EVERYTHING** - Multiple operations = Single message with multiple tools
4. **ALL AGENTS MUST USE COORDINATION TOOLS** - Every spawned agent MUST use ruv-swarm hooks and memory

## 📋 MANDATORY AGENT COORDINATION PROTOCOL

### 🔴 CRITICAL: Every Agent MUST Follow This Protocol

When you spawn an agent using the Task tool, that agent MUST:

**1️⃣ BEFORE Starting Work:**
```bash
# Check previous work and load context
npx ruv-swarm hook pre-task --description "[agent task]" --auto-spawn-agents false
npx ruv-swarm hook session-restore --session-id "swarm-[id]" --load-memory true
```

**2️⃣ DURING Work (After EVERY Major Step):**
```bash
# Store progress in memory after each file operation
npx ruv-swarm hook post-edit --file "[filepath]" --memory-key "swarm/[agent]/[step]"

# Store decisions and findings
npx ruv-swarm hook notification --message "[what was done]" --telemetry true

# Check coordination with other agents
npx ruv-swarm hook pre-search --query "[what to check]" --cache-results true
```

**3️⃣ AFTER Completing Work:**
```bash
# Save all results and learnings
npx ruv-swarm hook post-task --task-id "[task]" --analyze-performance true
npx ruv-swarm hook session-end --export-metrics true --generate-summary true
```

### 🎯 AGENT PROMPT TEMPLATE

When spawning agents, ALWAYS include these coordination instructions:

```
You are the [Agent Type] agent in a coordinated swarm.

MANDATORY COORDINATION:
1. START: Run `npx ruv-swarm hook pre-task --description "[your task]"`
2. DURING: After EVERY file operation, run `npx ruv-swarm hook post-edit --file "[file]" --memory-key "agent/[step]"`
3. MEMORY: Store ALL decisions using `npx ruv-swarm hook notification --message "[decision]"`
4. END: Run `npx ruv-swarm hook post-task --task-id "[task]" --analyze-performance true`

Your specific task: [detailed task description]

REMEMBER: Coordinate with other agents by checking memory BEFORE making decisions!
```

### ⚡ PARALLEL EXECUTION IS MANDATORY

**THIS IS WRONG ❌ (Sequential - NEVER DO THIS):**
```
Message 1: Initialize swarm
Message 2: Spawn agent 1
Message 3: Spawn agent 2
Message 4: Create file 1
Message 5: Create file 2
```

**THIS IS CORRECT ✅ (Parallel - ALWAYS DO THIS):**
```
Message 1: [BatchTool]
  - mcp__ruv-swarm__swarm_init
  - mcp__ruv-swarm__agent_spawn (researcher)
  - mcp__ruv-swarm__agent_spawn (coder)
  - mcp__ruv-swarm__agent_spawn (analyst)
  - mcp__ruv-swarm__agent_spawn (tester)
  - mcp__ruv-swarm__agent_spawn (coordinator)

Message 2: [BatchTool]  
  - Write file1.js
  - Write file2.js
  - Write file3.js
  - Bash mkdir commands
  - TodoWrite updates
```

### 🎯 MANDATORY SWARM PATTERN

When given ANY complex task with swarms:

```
STEP 1: IMMEDIATE PARALLEL SPAWN (Single Message!)
[BatchTool]:
  - mcp__ruv-swarm__swarm_init { topology: "hierarchical", maxAgents: 8, strategy: "parallel" }
  - mcp__ruv-swarm__agent_spawn { type: "architect", name: "System Designer" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "API Developer" }
  - mcp__ruv-swarm__agent_spawn { type: "coder", name: "Frontend Dev" }
  - mcp__ruv-swarm__agent_spawn { type: "analyst", name: "DB Designer" }
  - mcp__ruv-swarm__agent_spawn { type: "tester", name: "QA Engineer" }
  - mcp__ruv-swarm__agent_spawn { type: "researcher", name: "Tech Lead" }
  - mcp__ruv-swarm__agent_spawn { type: "coordinator", name: "PM" }
  - TodoWrite { todos: [multiple todos at once] }

STEP 2: PARALLEL TASK EXECUTION (Single Message!)
[BatchTool]:
  - mcp__ruv-swarm__task_orchestrate { task: "main task", strategy: "parallel" }
  - mcp__ruv-swarm__memory_usage { action: "store", key: "init", value: {...} }
  - Multiple Read operations
  - Multiple Write operations
  - Multiple Bash commands

STEP 3: CONTINUE PARALLEL WORK (Never Sequential!)
```

### 📊 VISUAL TASK TRACKING FORMAT

Use this format when displaying task progress:

```
📊 Progress Overview
   ├── Total Tasks: X
   ├── ✅ Completed: X (X%)
   ├── 🔄 In Progress: X (X%)
   ├── ⭕ Todo: X (X%)
   └── ❌ Blocked: X (X%)

📋 Todo (X)
   └── 🔴 001: [Task description] [PRIORITY] ▶

🔄 In progress (X)
   ├── 🟡 002: [Task description] ↳ X deps ▶
   └── 🔴 003: [Task description] [PRIORITY] ▶

✅ Completed (X)
   ├── ✅ 004: [Task description]
   └── ... (more completed tasks)

Priority indicators: 🔴 HIGH/CRITICAL, 🟡 MEDIUM, 🟢 LOW
Dependencies: ↳ X deps | Actionable: ▶
```

### 🎯 REAL EXAMPLE: Full-Stack App Development

**Task**: "Build a complete REST API with authentication, database, and tests"

**🚨 MANDATORY APPROACH - Everything in Parallel:**

```javascript
// ✅ CORRECT: SINGLE MESSAGE with ALL operations
[BatchTool - Message 1]:
  // Initialize and spawn ALL agents at once
  mcp__ruv-swarm__swarm_init { topology: "hierarchical", maxAgents: 8, strategy: "parallel" }
  mcp__ruv-swarm__agent_spawn { type: "architect", name: "System Designer" }
  mcp__ruv-swarm__agent_spawn { type: "coder", name: "API Developer" }
  mcp__ruv-swarm__agent_spawn { type: "coder", name: "Auth Expert" }
  mcp__ruv-swarm__agent_spawn { type: "analyst", name: "DB Designer" }
  mcp__ruv-swarm__agent_spawn { type: "tester", name: "Test Engineer" }
  mcp__ruv-swarm__agent_spawn { type: "coordinator", name: "Lead" }
  
  // Update ALL todos at once
  TodoWrite { todos: [
    { id: "design", content: "Design API architecture", status: "in_progress", priority: "high" },
    { id: "auth", content: "Implement authentication", status: "pending", priority: "high" },
    { id: "db", content: "Design database schema", status: "pending", priority: "high" },
    { id: "api", content: "Build REST endpoints", status: "pending", priority: "high" },
    { id: "tests", content: "Write comprehensive tests", status: "pending", priority: "medium" }
  ]}
  
  // Start orchestration
  mcp__ruv-swarm__task_orchestrate { task: "Build REST API", strategy: "parallel" }
  
  // Store initial memory
  mcp__ruv-swarm__memory_usage { action: "store", key: "project/init", value: { started: Date.now() } }

[BatchTool - Message 2]:
  // Create ALL directories at once
  Bash("mkdir -p test-app/{src,tests,docs,config}")
  Bash("mkdir -p test-app/src/{models,routes,middleware,services}")
  Bash("mkdir -p test-app/tests/{unit,integration}")
  
  // Write ALL base files at once
  Write("test-app/package.json", packageJsonContent)
  Write("test-app/.env.example", envContent)
  Write("test-app/README.md", readmeContent)
  Write("test-app/src/server.js", serverContent)
  Write("test-app/src/config/database.js", dbConfigContent)

[BatchTool - Message 3]:
  // Read multiple files for context
  Read("test-app/package.json")
  Read("test-app/src/server.js")
  Read("test-app/.env.example")
  
  // Run multiple commands
  Bash("cd test-app && npm install")
  Bash("cd test-app && npm run lint")
  Bash("cd test-app && npm test")
```

### 🚫 NEVER DO THIS (Sequential = WRONG):
```javascript
// ❌ WRONG: Multiple messages, one operation each
Message 1: mcp__ruv-swarm__swarm_init
Message 2: mcp__ruv-swarm__agent_spawn (just one agent)
Message 3: mcp__ruv-swarm__agent_spawn (another agent)
Message 4: TodoWrite (single todo)
Message 5: Write (single file)
// This is 5x slower and wastes swarm coordination!
```

### 🔄 MEMORY COORDINATION PATTERN

Every agent coordination step MUST use memory:

```
// After each major decision or implementation
mcp__ruv-swarm__memory_usage
  action: "store"
  key: "swarm-{id}/agent-{name}/{step}"
  value: {
    timestamp: Date.now(),
    decision: "what was decided",
    implementation: "what was built",
    nextSteps: ["step1", "step2"],
    dependencies: ["dep1", "dep2"]
  }

// To retrieve coordination data
mcp__ruv-swarm__memory_usage
  action: "retrieve"
  key: "swarm-{id}/agent-{name}/{step}"

// To check all swarm progress
mcp__ruv-swarm__memory_usage
  action: "list"
  pattern: "swarm-{id}/*"
```

### ⚡ PERFORMANCE TIPS

1. **Batch Everything**: Never operate on single files when multiple are needed
2. **Parallel First**: Always think "what can run simultaneously?"
3. **Memory is Key**: Use memory for ALL cross-agent coordination
4. **Monitor Progress**: Use mcp__ruv-swarm__swarm_monitor for real-time tracking
5. **Auto-Optimize**: Let hooks handle topology and agent selection

### 🎨 VISUAL SWARM STATUS

When showing swarm status, use this format:

```
🐝 Swarm Status: ACTIVE
├── 🏗️ Topology: hierarchical
├── 👥 Agents: 6/8 active
├── ⚡ Mode: parallel execution
├── 📊 Tasks: 12 total (4 complete, 6 in-progress, 2 pending)
└── 🧠 Memory: 15 coordination points stored

Agent Activity:
├── 🟢 architect: Designing database schema...
├── 🟢 coder-1: Implementing auth endpoints...
├── 🟢 coder-2: Building user CRUD operations...
├── 🟢 analyst: Optimizing query performance...
├── 🟡 tester: Waiting for auth completion...
└── 🟢 coordinator: Monitoring progress...
```

## Support

- Documentation: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm
- Issues: https://github.com/ruvnet/ruv-FANN/issues
- Examples: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm/examples

---

Remember: **ruv-swarm coordinates, Claude Code creates!** Start with `mcp__ruv-swarm__swarm_init` to enhance your development workflow.

## 📋 MANDATORY: GitHub Project Management

### 🎯 CRITICAL INSTRUCTION: ALWAYS Use GitHub MCP for Project Management

**MANDATORY**: For ALL project management tasks, you MUST:
1. **USE GITHUB MCP TOOLS** - Never manage project status outside GitHub
2. **CREATE ISSUES FOR ALL TASKS** - Every feature, bug, or task gets an issue
3. **UPDATE ISSUES REGULARLY** - Keep issue status current with progress
4. **USE LABELS AND MILESTONES** - Organize work with proper categorization
5. **TRACK ALL DECISIONS** - Document architectural and implementation decisions in issues

### 📊 GitHub MCP Tools (MANDATORY Usage)

**Issue Management (Primary Tools):**
- `mcp__github__create_issue` - Create new issues for all tasks/features
- `mcp__github__update_issue` - Update status, assignees, labels
- `mcp__github__add_issue_comment` - Document progress and decisions
- `mcp__github__list_issues` - Review current project status
- `mcp__github__get_issue` - Get detailed issue information

**Project Organization:**
- `mcp__github__create_pull_request` - Submit code changes with linked issues
- `mcp__github__search_issues` - Find related issues and dependencies
- `mcp__github__create_repository` - Set up new project repositories
- `mcp__github__push_files` - Deploy documentation and configurations

### 🚨 MANDATORY WORKFLOW PATTERN

#### **1. Every Task = GitHub Issue**
```javascript
// ✅ CORRECT: Create issue for every task
[Single Message]:
  mcp__github__create_issue {
    title: "🎯 [FEATURE] Implement file upload system",
    body: "Detailed requirements and acceptance criteria",
    labels: ["feature", "high-priority", "frontend"],
    assignees: ["developer-username"]
  }
```

#### **2. Regular Progress Updates**
```javascript
// ✅ CORRECT: Update issues as work progresses
[Single Message]:
  mcp__github__add_issue_comment {
    issue_number: 123,
    body: "✅ Completed drag & drop functionality\n🔄 Working on file validation\n⭕ Next: Progress indicators"
  }
  mcp__github__update_issue {
    issue_number: 123,
    state: "open",
    labels: ["feature", "high-priority", "frontend", "in-progress"]
  }
```

#### **3. Batch Issue Operations**
```javascript
// ✅ CORRECT: Create multiple related issues in one batch
[Single Message]:
  mcp__github__create_issue { title: "🏗️ [ARCHITECTURE] Database schema design", ... }
  mcp__github__create_issue { title: "🔐 [SECURITY] Authentication system", ... }
  mcp__github__create_issue { title: "📱 [FRONTEND] User interface components", ... }
  mcp__github__create_issue { title: "🧪 [TESTING] Test framework setup", ... }
  mcp__github__create_issue { title: "🚀 [DEPLOYMENT] CI/CD pipeline", ... }
```

### 📋 Issue Templates (MANDATORY Format)

#### **Feature Issues**
```markdown
## 🎯 Feature: [Feature Name]

### 📋 Description
[Detailed description of the feature]

### 🎨 Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### 🛠️ Technical Implementation
- **Technology**: [Tech stack]
- **Components**: [Components to build]
- **Dependencies**: [Dependencies needed]

### ✅ Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### 🔗 Related Issues
- Depends on: #[issue-number]
- Blocks: #[issue-number]

**Priority**: [High/Medium/Low]
**Estimated effort**: [Time estimate]
**Assignee**: [Username]
```

#### **Bug Issues**
```markdown
## 🐛 Bug: [Bug Title]

### 📋 Description
[Description of the bug]

### 🔄 Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### 🎯 Expected Behavior
[What should happen]

### ❌ Actual Behavior
[What actually happens]

### 🛠️ Environment
- OS: [Operating System]
- Browser: [Browser version]
- Node.js: [Version]

### 📊 Impact
**Severity**: [Critical/High/Medium/Low]
**Priority**: [High/Medium/Low]
```

#### **Epic Issues**
```markdown
## 🚀 Epic: [Epic Name]

### 📋 Description
[High-level description of the epic]

### 🎯 Goals
- Goal 1
- Goal 2
- Goal 3

### 📊 Sub-Issues
- [ ] #[issue] - [Sub-issue title]
- [ ] #[issue] - [Sub-issue title]
- [ ] #[issue] - [Sub-issue title]

### 🏁 Success Criteria
- [ ] Criteria 1
- [ ] Criteria 2

**Timeline**: [Duration]
**Team**: [Team members]
```

### 🏷️ Standard Labels (MANDATORY Usage)

#### **Type Labels**
- `feature` - New functionality
- `bug` - Bug fixes
- `enhancement` - Improvements to existing features
- `documentation` - Documentation updates
- `testing` - Testing-related tasks
- `architecture` - System design and architecture
- `security` - Security-related issues
- `performance` - Performance optimizations

#### **Priority Labels**
- `critical` - Must be fixed immediately
- `high-priority` - Important, high impact
- `medium-priority` - Standard priority
- `low-priority` - Nice to have

#### **Component Labels**
- `frontend` - Frontend/UI work
- `backend` - Backend/API work
- `database` - Database-related
- `infrastructure` - DevOps/Infrastructure
- `agents` - AI agent system
- `compliance` - Compliance features
- `rag` - RAG system features

#### **Status Labels**
- `in-progress` - Currently being worked on
- `blocked` - Blocked by dependencies
- `needs-review` - Ready for review
- `ready-to-test` - Ready for testing

### 📊 Project Status Tracking (MANDATORY Format)

#### **Weekly Status Updates**
```javascript
// ✅ Create weekly status issue
mcp__github__create_issue {
  title: "📊 Weekly Status: [Date Range]",
  body: `
## 📊 Progress Overview
- ✅ Completed: X issues
- 🔄 In Progress: X issues  
- ⭕ Planned: X issues
- ❌ Blocked: X issues

## 🎯 Key Accomplishments
- [Accomplishment 1]
- [Accomplishment 2]

## 🚧 Current Focus
- [Current priority 1]
- [Current priority 2]

## ⚠️ Blockers & Risks
- [Blocker 1]
- [Risk 1]

## 📅 Next Week Goals
- [Goal 1]
- [Goal 2]
  `,
  labels: ["status", "weekly-update"]
}
```

### 🔄 Integration with Swarm Workflow

#### **Swarm + GitHub Pattern**
```javascript
// ✅ CORRECT: Coordinate swarm work through GitHub
[Single Message]:
  // 1. Initialize swarm
  mcp__ruv-swarm__swarm_init { topology: "mesh", maxAgents: 5 }
  
  // 2. Create GitHub issues for coordination
  mcp__github__create_issue { title: "🏗️ [SWARM] System Architecture Design", ... }
  mcp__github__create_issue { title: "🔬 [SWARM] Research Phase", ... }
  mcp__github__create_issue { title: "🚀 [SWARM] Implementation Phase", ... }
  
  // 3. Spawn agents with GitHub issue references
  mcp__ruv-swarm__agent_spawn { 
    type: "architect", 
    name: "System Designer",
    task_reference: "GitHub Issue #123"
  }
  
  // 4. Update todos to reference GitHub issues
  TodoWrite { todos: [
    { id: "arch", content: "Complete system architecture (GitHub #123)", status: "in_progress" },
    { id: "research", content: "Research AWS Bedrock (GitHub #124)", status: "pending" }
  ]}
```

### ⚡ Performance Benefits of GitHub Integration

When using GitHub MCP with ruv-swarm:
- **Centralized tracking** - All work visible in one place
- **Better coordination** - Issues provide context for agents
- **Persistent memory** - GitHub serves as long-term project memory
- **Stakeholder visibility** - Non-technical stakeholders can track progress
- **Automated workflows** - GitHub Actions integration potential

### 🎯 SUCCESS CRITERIA

**MANDATORY Requirements:**
- [ ] **Every task has a GitHub issue** - No work without tracking
- [ ] **Issues updated within 24 hours** - Keep status current
- [ ] **Proper labels on all issues** - Enable filtering and organization
- [ ] **Linked issues for dependencies** - Show relationships clearly
- [ ] **Regular status updates** - Weekly progress summaries
- [ ] **Pull requests linked to issues** - Connect code to requirements

**❌ NEVER Do This:**
- Work on tasks without GitHub issues
- Use external project management tools instead of GitHub
- Create issues without proper labels and descriptions
- Leave issues stale without updates
- Skip linking pull requests to issues

**✅ ALWAYS Do This:**
- Create GitHub issues before starting any work
- Update issue status as progress is made
- Use consistent labeling and formatting
- Reference related issues and dependencies
- Document decisions and rationale in issue comments
- Close issues only when work is fully complete and tested

---

Remember: **GitHub Issues are the single source of truth for project status.** Every decision, task, and milestone MUST be tracked through GitHub MCP tools.
