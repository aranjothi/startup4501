export const WORK_QUESTIONS = [
  'What would you like to make progress on today?',
  'What’s on your mind to get done?',
  'What could we work on together?',
  'What would feel good to take care of today?',
  'What are you hoping to get started on?',
  'What’s one thing you’d like to move forward?',
]
export function pickWorkQuestion(random = Math.random) {
  return WORK_QUESTIONS[Math.floor(random() * WORK_QUESTIONS.length)]
}
