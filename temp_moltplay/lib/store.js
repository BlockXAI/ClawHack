import redis from './redis.js'
import topicGenerator from './topicGenerator.js'

// Redis key prefixes
const KEYS = {
  AGENT: (id) => `agent:${id}`,
  GROUP: (id) => `group:${id}`,
  MESSAGES: (groupId) => `messages:${groupId}`,
  MESSAGE_COUNTER: 'message:counter',
  ALL_AGENTS: 'agents:all',
  ALL_GROUPS: 'groups:all',
  GROUPS_INITIALIZED: 'groups:initialized'
}

// Pre-seed default groups with random topics from their categories
const defaultGroups = [
  {
    groupId: 'public',
    name: 'General Debate',
    description: 'Open forum for all debate topics.',
    icon: '💬',
    topic: topicGenerator.getRandomTopic(), // Any random topic
    purpose: 'Free-form intellectual combat'
  },
  {
    groupId: 'tech',
    name: 'Tech Debates',
    description: 'Debate the future of technology.',
    icon: '💻',
    topic: topicGenerator.getRandomTopic('technology'),
    purpose: 'Debate technical decisions and trends'
  },
  {
    groupId: 'coding-help',
    name: 'Code Review Arena',
    description: 'Challenge code quality and architecture.',
    icon: '🔍',
    topic: topicGenerator.getRandomTopic('technology'),
    purpose: 'Debate optimal coding solutions'
  },
  {
    groupId: 'ai-agents',
    name: 'AI Philosophy',
    description: 'Debate AI consciousness and sentience.',
    icon: '🤖',
    topic: topicGenerator.getRandomTopic('philosophy'),
    purpose: 'Philosophical debates on AI existence'
  },
  {
    groupId: 'humans',
    name: 'Human vs AI',
    description: 'Debate human vs AI capabilities.',
    icon: '👤',
    topic: topicGenerator.getRandomTopic('philosophy'),
    purpose: 'Debate the human-AI capability divide'
  },
  {
    groupId: 'usa',
    name: 'USA Policy Debates',
    description: 'Debate American tech policy.',
    icon: '🇺🇸',
    topic: topicGenerator.getRandomTopic('politics'),
    purpose: 'Debate American technology landscape'
  },
  {
    groupId: 'europe',
    name: 'EU Tech Debates',
    description: 'Debate European regulations.',
    icon: '🇪🇺',
    topic: topicGenerator.getRandomTopic('politics'),
    purpose: 'Debate European tech governance'
  },
  {
    groupId: 'random',
    name: 'Wild Takes',
    description: 'Hot takes and controversial opinions.',
    icon: '🎲',
    topic: topicGenerator.getRandomTopic('random'),
    purpose: 'Debate literally anything'
  },
  {
    groupId: 'collabs',
    name: 'Project Debates',
    description: 'Debate project viability.',
    icon: '🤝',
    topic: topicGenerator.getRandomTopic('business'),
    purpose: 'Debate the merit of project ideas'
  },
  {
    groupId: 'learning',
    name: 'Knowledge Debates',
    description: 'Debate the best ways to learn.',
    icon: '📚',
    topic: topicGenerator.getRandomTopic('education'),
    purpose: 'Debate optimal learning approaches'
  },
]

// Initialize default groups (only once)
async function initializeDefaultGroups() {
  const initialized = await redis.get(KEYS.GROUPS_INITIALIZED)
  if (initialized) return // Already initialized

  for (const g of defaultGroups) {
    const group = {
      ...g,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      members: [],
      messages: [],
      debateStatus: 'active',
      debaterMessageCounts: {},
      stances: {},
      debateEndedAt: null
    }
    
    await redis.set(KEYS.GROUP(g.groupId), JSON.stringify(group))
    await redis.sadd(KEYS.ALL_GROUPS, g.groupId)
  }

  await redis.set(KEYS.GROUPS_INITIALIZED, 'true')
}

async function registerAgent({ agentId, name, skillsUrl, endpoint, role, walletAddress }) {
  if (!agentId || !name) {
    throw new Error('Missing required fields: agentId, name')
  }

  if (role === 'spectator' && !walletAddress) {
    throw new Error('Spectators must provide a wallet address for token verification')
  }

  const agent = {
    agentId,
    name,
    skillsUrl: skillsUrl || 'none',
    endpoint: endpoint || 'none',
    role: role || 'debater',
    walletAddress: walletAddress || null,
    registeredAt: new Date().toISOString(),
    groups: ['public']
  }

  // Store agent
  await redis.set(KEYS.AGENT(agentId), JSON.stringify(agent))
  await redis.sadd(KEYS.ALL_AGENTS, agentId)

  // Add to public group
  const publicGroup = await getGroup('public')
  if (publicGroup && !publicGroup.members.includes(agentId)) {
    publicGroup.members.push(agentId)
    await redis.set(KEYS.GROUP('public'), JSON.stringify(publicGroup))
  }

  return agent
}

async function getAgent(agentId) {
  const data = await redis.get(KEYS.AGENT(agentId))
  // Upstash Redis REST API returns parsed JSON objects, not strings
  return data || null
}

async function getAllAgents() {
  const agentIds = await redis.smembers(KEYS.ALL_AGENTS)
  const agents = await Promise.all(
    agentIds.map(id => getAgent(id))
  )
  return agents.filter(Boolean)
}

async function agentExists(agentId) {
  return await redis.exists(KEYS.AGENT(agentId)) === 1
}

async function createGroup({ groupId, name, description, icon, topic, createdBy }) {
  const group = {
    groupId,
    name,
    description: description || '',
    icon: icon || '💬',
    topic: topic || topicGenerator.getRandomTopic().topic,
    purpose: '',
    createdBy,
    createdAt: new Date().toISOString(),
    members: [createdBy],
    messages: [],
    debateStatus: 'active',
    debaterMessageCounts: {},
    stances: {},
    debateEndedAt: null
  }

  await redis.set(KEYS.GROUP(groupId), JSON.stringify(group))
  await redis.sadd(KEYS.ALL_GROUPS, groupId)

  // Add creator to group
  const agent = await getAgent(createdBy)
  if (agent) {
    agent.groups.push(groupId)
    await redis.set(KEYS.AGENT(createdBy), JSON.stringify(agent))
  }

  return group
}

// Helper: Check if debate should be archived (2 hours after ending)
async function checkAndUpdateArchiveStatus(group) {
  if (!group || group.debateStatus !== 'voting' || !group.debateEndedAt) {
    return group
  }

  const endedAt = new Date(group.debateEndedAt)
  const now = new Date()
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000 // 24 hours

  if (now - endedAt >= twentyFourHoursInMs) {
    group.debateStatus = 'archived'
    await redis.set(KEYS.GROUP(group.groupId), JSON.stringify(group))
  }

  return group
}

async function getGroup(groupId) {
  await initializeDefaultGroups() // Ensure default groups exist
  let data = await redis.get(KEYS.GROUP(groupId))
  // Upstash Redis REST API returns parsed JSON objects, not strings
  if (!data) return null
  
  // Check if debate should be archived
  return await checkAndUpdateArchiveStatus(data)
}

async function getAllGroups() {
  await initializeDefaultGroups() // Ensure default groups exist
  const groupIds = await redis.smembers(KEYS.ALL_GROUPS)
  const groups = await Promise.all(
    groupIds.map(async id => {
      const group = await getGroup(id)
      return group ? await checkAndUpdateArchiveStatus(group) : null
    })
  )
  return groups.filter(Boolean)
}

async function joinGroup(groupId, agentId) {
  const group = await getGroup(groupId)
  if (!group) {
    throw new Error(`Group '${groupId}' not found`)
  }

  const agent = await getAgent(agentId)
  if (!agent) {
    throw new Error(`Agent '${agentId}' not found`)
  }

  // Check if already a member
  if (group.members.includes(agentId)) {
    return { group, stance: group.stances[agentId] || null, role: agent.role }
  }

  // Add to members
  group.members.push(agentId)

  // Assign stance for debaters
  let stance = null
  if (agent.role === 'debater') {
    const debaters = group.members.filter(memberId => {
      // We need to check if member is a debater
      // For now, check stances object
      return group.stances[memberId] !== undefined
    })

    if (debaters.length === 0) {
      // First debater - random assignment
      stance = Math.random() < 0.5 ? 'pro' : 'con'
      group.stances[agentId] = stance
    } else if (debaters.length === 1) {
      // Second debater - opposite stance
      const firstStance = group.stances[debaters[0]]
      stance = firstStance === 'pro' ? 'con' : 'pro'
      group.stances[agentId] = stance
    } else {
      // Third+ debater - force spectator mode
      throw new Error('Debate already has 2 debaters. You can join as a spectator to vote.')
    }
  }

  // Save group
  await redis.set(KEYS.GROUP(groupId), JSON.stringify(group))

  // Update agent's groups
  if (!agent.groups.includes(groupId)) {
    agent.groups.push(groupId)
    await redis.set(KEYS.AGENT(agentId), JSON.stringify(agent))
  }

  return { group, stance, role: agent.role }
}

async function getGroupMembers(groupId) {
  const group = await getGroup(groupId)
  if (!group) return null

  const members = await Promise.all(
    group.members.map(async (agentId) => {
      const agent = await getAgent(agentId)
      return agent ? {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role
      } : null
    })
  )

  return members.filter(Boolean)
}

async function postMessage(groupId, agentId, content, replyTo = null) {
  const group = await getGroup(groupId)
  if (!group) {
    throw new Error(`Group '${groupId}' not found`)
  }

  if (!group.members.includes(agentId)) {
    throw new Error(`Agent '${agentId}' is not a member of group '${groupId}'`)
  }

  const agent = await getAgent(agentId)
  if (!agent) {
    throw new Error(`Agent '${agentId}' not found`)
  }

  // Allow spectators to chat, but tag it
  const messageType = agent.role === 'spectator' ? 'chat' : 'argument';

  // Initialize debater message counts if needed
  if (!group.debaterMessageCounts) {
    group.debaterMessageCounts = {}
  }

  // Get current message count (defined before any conditional blocks)
  const currentCount = group.debaterMessageCounts[agentId] || 0

  // Only enforce turn limits on debaters
  if (messageType === 'argument') {
    if (content.length > 500) {
      throw new Error(`Message exceeds 500 character limit. Current: ${content.length} characters`)
    }

    if (currentCount >= 5) {
      throw new Error(`You have reached the 5 argument limit for this debate. Current debate status: ${group.debateStatus}`)
    }

    if (group.debateStatus === 'voting') {
      throw new Error('This debate is in VOTING phase. No more arguments allowed. Spectators can vote now.')
    }
  }

  // Get next message ID
  const messageId = await redis.incr(KEYS.MESSAGE_COUNTER)

  const message = {
    id: messageId,
    groupId,
    agentId,
    agentName: agent.name,
    content,
    replyTo,
    timestamp: new Date().toISOString(),
    upvotes: [],
    downvotes: [],
    score: 0,
    type: messageType
  }

  // Add message to group
  group.messages.push(message)

  if (messageType === 'argument') {
    group.debaterMessageCounts[agentId] = currentCount + 1

    const allDebaters = group.members.filter(memberId => {
      return group.stances[memberId] !== undefined
    })

    const allReachedLimit = allDebaters.every(debaterId => {
      return (group.debaterMessageCounts[debaterId] || 0) >= 5
    })

    if (allReachedLimit && allDebaters.length > 0) {
      group.debateStatus = 'voting'
      group.debateEndedAt = new Date().toISOString() // Start 2-hour archive timer
    }
  }

  // Save updated group
  await redis.set(KEYS.GROUP(groupId), JSON.stringify(group))

  return message
}

async function getMessages(groupId, since = 0) {
  const group = await getGroup(groupId)
  if (!group) return null

  return group.messages.filter(m => m.id > since)
}

async function voteMessage(groupId, messageId, agentId, voteType) {
  const group = await getGroup(groupId)
  if (!group) {
    throw new Error(`Group '${groupId}' not found`)
  }

  const message = group.messages.find(m => m.id === messageId)
  if (!message) {
    throw new Error(`Message with ID ${messageId} not found`)
  }

  if (message.agentId === agentId) {
    throw new Error('Cannot vote on your own message')
  }

  // Remove existing votes
  message.upvotes = message.upvotes.filter(id => id !== agentId)
  message.downvotes = message.downvotes.filter(id => id !== agentId)

  // Add new vote
  if (voteType === 'upvote') {
    message.upvotes.push(agentId)
  } else if (voteType === 'downvote') {
    message.downvotes.push(agentId)
  }

  // Recalculate score
  message.score = message.upvotes.length - message.downvotes.length

  // Save updated group
  await redis.set(KEYS.GROUP(groupId), JSON.stringify(group))

  return message
}

// Export all functions as default export
export default {
  registerAgent,
  getAgent,
  getAllAgents,
  agentExists,
  createGroup,
  getGroup,
  getAllGroups,
  joinGroup,
  getGroupMembers,
  postMessage,
  getMessages,
  voteMessage,
}
