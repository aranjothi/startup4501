// Handwritten prototype content. These prompts are not generated or adaptive.
export const SCENARIOS = [
  { id: 'everyday', title: 'Everyday conversation', icon: 'message-circle', description: 'Break the ice and keep a conversation going.', partner: 'Someone you just met', prompts: ["Hey! How has your week been?", "What's something you've been enjoying lately?", "That sounds interesting. How did you get into it?"], focus: 'Answer, add a detail, and ask something back.' },
  { id: 'introductions', title: 'Introduce yourself', icon: 'user-plus', description: 'Make a new connection, one introduction at a time.', partner: 'A new acquaintance', prompts: ["Hi, I don't think we've met. Tell me a little about yourself.", "What do you like most about what you do?", "What would you like to hear about me?"], focus: 'Share a short introduction and leave room for a reply.' },
  { id: 'interview', title: 'Interview practice', icon: 'clipboard', description: 'Tell your story with a clear, concrete example.', partner: 'An interviewer', prompts: ["Tell me about yourself and what you're looking for next.", "Can you give me an example of a challenge you worked through?", "What did you learn, and what would you do differently?"], focus: 'Use a specific example and explain your part in it.' },
  { id: 'workplace', title: 'Workplace discussion', icon: 'briefcase', description: 'Explain an idea and work through a disagreement.', partner: 'A teammate', prompts: ["What change would you suggest for our next project?", "I'm worried we don't have enough time. How would you approach that?", "What should we agree on as our next step?"], focus: 'Acknowledge the concern before offering a next step.' },
  { id: 'speaking', title: 'Public speaking', icon: 'mic', description: 'Rehearse a short talk, pitch, or presentation.', partner: 'Your audience', prompts: ["Introduce your topic and tell us why it matters.", "Walk us through one example that supports your main point.", "What is the one thing you want us to remember?"], focus: 'Give your talk a clear opening, example, and ending.' },
]

export const REVIEW_PROMPTS = [
  { id: 'clarity', title: 'What you said', question: 'Did you answer the prompt and give one clear detail?' },
  { id: 'listening', title: 'Room for a reply', question: 'Did you acknowledge the other person or invite a response?' },
  { id: 'delivery', title: 'How you delivered it', question: 'Watch your posture, head position, and gestures. What would you like to try differently?' },
]
export const MAX_RECORDING_SECONDS = 300
export const MIN_REWARD_SECONDS = 10
export const SESSION_REWARD = { coins: 10, xp: 30, mood: 5 }
export const getScenario = id => SCENARIOS.find(scenario => scenario.id === id) ?? SCENARIOS[0]
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}
