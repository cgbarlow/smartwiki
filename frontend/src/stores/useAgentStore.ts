import { create } from 'zustand'
import type { Agent, AgentStore, Task } from '@/types'

interface AgentStoreActions {
  // Agent management
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, update: Partial<Agent>) => void
  removeAgent: (id: string) => void
  
  // Task management
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, update: Partial<Task>) => void
  removeTask: (id: string) => void
  setActiveTask: (task: Task | null) => void
  
  // Swarm management
  setSwarmStatus: (status: AgentStore['swarmStatus']) => void
  
  // Computed getters
  getAgentById: (id: string) => Agent | undefined
  getAgentsByType: (type: Agent['type']) => Agent[]
  getActiveAgents: () => Agent[]
  getTasksByAgent: (agentId: string) => Task[]
  getTasksByStatus: (status: Task['status']) => Task[]
}

export const useAgentStore = create<AgentStore & AgentStoreActions>((set, get) => ({
  // Initial state
  agents: [],
  tasks: [],
  activeTask: null,
  swarmStatus: 'inactive',

  // Actions
  setAgents: (agents) => set({ agents }),
  
  addAgent: (agent) => set((state) => ({
    agents: [...state.agents, agent]
  })),
  
  updateAgent: (id, update) => set((state) => ({
    agents: state.agents.map(agent =>
      agent.id === id ? { ...agent, ...update } : agent
    )
  })),
  
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter(agent => agent.id !== id)
  })),
  
  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),
  
  updateTask: (id, update) => set((state) => ({
    tasks: state.tasks.map(task =>
      task.id === id ? { ...task, ...update } : task
    )
  })),
  
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== id)
  })),
  
  setActiveTask: (activeTask) => set({ activeTask }),
  
  setSwarmStatus: (swarmStatus) => set({ swarmStatus }),

  // Computed getters
  getAgentById: (id) => {
    const { agents } = get()
    return agents.find(agent => agent.id === id)
  },

  getAgentsByType: (type) => {
    const { agents } = get()
    return agents.filter(agent => agent.type === type)
  },

  getActiveAgents: () => {
    const { agents } = get()
    return agents.filter(agent => agent.status === 'active' || agent.status === 'busy')
  },

  getTasksByAgent: (agentId) => {
    const { tasks } = get()
    return tasks.filter(task => task.assignedAgent === agentId)
  },

  getTasksByStatus: (status) => {
    const { tasks } = get()
    return tasks.filter(task => task.status === status)
  }
}))