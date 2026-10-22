export const TOPICS = [
  { id: 'everyday', title: 'Everyday conversations', icon: 'message-circle', description: 'Small talk, listening, and keeping things going.' },
  { id: 'introductions', title: 'Meeting new people', icon: 'user-plus', description: 'Introductions and making connections.' },
  { id: 'interview', title: 'Interviews', icon: 'clipboard', description: 'Explain your experience and ask good questions.' },
  { id: 'workplace', title: 'At work', icon: 'briefcase', description: 'Collaborate, contribute, and ask for help.' },
  { id: 'difficult', title: 'Difficult conversations', icon: 'shield', description: 'Set boundaries and handle disagreements.' },
  { id: 'speaking', title: 'Speaking to a group', icon: 'mic', description: 'Present an idea and answer questions.' },
]
const definitions = {
  everyday: [
    ['Keep the conversation going', 'A friendly acquaintance', 'You run into an acquaintance at a café.', 'Ask a relevant follow-up and share a detail about yourself.', 'Hey! It’s good to see you. How has your week been?'],
    ['Find something in common', 'A neighbor', 'You meet a neighbor at a community event.', 'Discover a shared interest through open questions.', 'Hi! I’ve seen you around, but I don’t think we’ve talked. What brought you here today?'],
    ['Be a better listener', 'A friend', 'A friend wants to tell you about a busy week.', 'Acknowledge what they share before changing the subject.', 'This week has been a lot. I finally finished a project I’ve been stressing about.'],
  ],
  introductions: [
    ['Introduce yourself', 'Someone new', 'You are meeting someone at a casual gathering.', 'Give a short introduction and invite the other person to share.', 'Hi, I’m Alex. I don’t think we’ve met. What’s your name, and what do you enjoy doing?'],
    ['Join a group conversation', 'A person at a gathering', 'A group is discussing things they have tried recently.', 'Join naturally with a related question or experience.', 'We were just talking about trying new hobbies. Have you tried anything new lately?'],
    ['Make a new connection', 'A new acquaintance', 'You have had a good first conversation and want to stay in touch.', 'Suggest a comfortable, specific way to connect again.', 'I’ve really enjoyed talking about this with you. I’ve been hoping to find more people who share this interest.'],
  ],
  interview: [
    ['Tell your story', 'An interviewer', 'You are interviewing for a role you are interested in.', 'Explain your background and connect it to your next step.', 'Thanks for joining me. Tell me a little about yourself and what you’re looking for next.'],
    ['Explain a challenge', 'An interviewer', 'You are discussing a challenging project or experience.', 'Describe a specific situation, your actions, and the outcome.', 'Tell me about a challenge you worked through. What happened, and what was your role?'],
    ['Ask thoughtful questions', 'An interviewer', 'You are near the end of an interview.', 'Ask questions that help you understand the role and team.', 'We have a few minutes left. What would you like to know about the role or the team?'],
  ],
  workplace: [
    ['Share an idea', 'A teammate', 'Your team is planning its next project.', 'Explain an idea clearly and respond to a practical concern.', 'We’re looking for ways to make our next project run more smoothly. What would you suggest?'],
    ['Ask for help', 'A colleague', 'You are stuck on a task and need input.', 'Explain what you tried and make a specific request.', 'Hey, you mentioned you wanted a hand with something. What are you working on?'],
    ['Give a useful update', 'Your team lead', 'You are giving a brief progress update.', 'State the progress, the blocker, and the next step.', 'How is your work coming along, and is there anything you need from the team?'],
  ],
  difficult: [
    ['Set a boundary', 'A colleague', 'A colleague asks you to take on work when you are at capacity.', 'State a boundary respectfully and offer a realistic next step.', 'Could you take over this extra task today? I know you’re busy, but it would really help me out.'],
    ['Disagree respectfully', 'A teammate', 'You and a teammate have different ideas about a plan.', 'Acknowledge their view and explain your concern constructively.', 'I think we should move ahead with the original plan. We don’t have time to rethink it. What do you think?'],
    ['Clear up a misunderstanding', 'A friend', 'A friend thinks you ignored an important message.', 'Listen to their concern and explain without becoming defensive.', 'I felt brushed off when I didn’t hear back from you yesterday. Did I do something wrong?'],
  ],
  speaking: [
    ['Open with a clear point', 'An audience member', 'You are introducing a short talk about a topic you know.', 'State your main point and explain why the audience should care.', 'We’re ready when you are. What is your topic, and why does it matter to us?'],
    ['Make your idea concrete', 'An audience member', 'You are explaining an idea to people unfamiliar with it.', 'Use an accessible example to support your explanation.', 'Could you explain an idea you care about and give us an example of how it works?'],
    ['Handle a question', 'An audience member', 'Someone asks a challenging question after your talk.', 'Acknowledge the question and give a clear, honest answer.', 'What’s one concern someone might have about your idea, and how would you respond to it?'],
  ],
}
const partnerNames = {
  everyday: ['Sam', 'Jamie', 'Riley'], introductions: ['Alex', 'Morgan', 'Casey'],
  interview: ['Taylor', 'Jordan', 'Avery'], workplace: ['Maya', 'Chris', 'Devon'],
  difficult: ['Jordan', 'Robin', 'Jess'], speaking: ['Taylor', 'Cameron', 'Ari'],
}
export const LESSONS = TOPICS.flatMap(topic => definitions[topic.id].map(([title, partner, setting, goal, opening], index) => ({
  id: `${topic.id}-${index + 1}`, topicId: topic.id, title, partner, partnerName: partnerNames[topic.id][index], setting, goal, opening,
  level: index + 1, requiredReplies: 3, minutes: 3,
})))
export const getLesson = id => LESSONS.find(lesson => lesson.id === id)
export const getTopic = id => TOPICS.find(topic => topic.id === id)
export function validateProfile(profile) {
  return profile && Array.isArray(profile.topics) && profile.topics.length > 0
    && profile.topics.every(id => TOPICS.some(topic => topic.id === id))
    && ['starting', 'building', 'confident'].includes(profile.confidence)
    && [1, 2, 3].includes(profile.dailyGoal)
}
export function lessonFeed(profile, completions = []) {
  const priorities = profile?.topics ?? TOPICS.map(topic => topic.id)
  return priorities.map(id => ({ ...getTopic(id), lessons: LESSONS.filter(lesson => lesson.topicId === id) }))
}
export function recommendedLesson(profile, completions = []) {
  const feed = lessonFeed(profile, completions)
  const ids = new Set(completions.map(item => item.lessonId))
  // Rotate focus areas at each level rather than exhausting a single topic.
  for (let level = 1; level <= 3; level++) {
    for (const section of feed) {
      const lesson = section.lessons.find(item => item.level === level && !ids.has(item.id))
      if (lesson) return lesson
    }
  }
  const latest = new Map()
  for (const completion of completions) latest.set(completion.lessonId, Math.max(latest.get(completion.lessonId) ?? 0, completion.completedAt))
  return feed.flatMap(section => section.lessons).sort((a, b) => (latest.get(a.id) ?? 0) - (latest.get(b.id) ?? 0))[0] ?? LESSONS[0]
}
