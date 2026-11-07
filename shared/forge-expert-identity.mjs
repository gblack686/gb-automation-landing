// Presentation/schedule identity only. Registration and authorization are separate.
const profiles = Object.freeze({
  'youtube-intel': 'expert-gbautomation-youtube-intel',
  'news-agent': 'expert-gbautomation-news-agent',
  pi: 'expert-consulting-pi',
});

export function expertScheduleProfile(agentId) {
  return Object.hasOwn(profiles, agentId) ? profiles[agentId] : agentId;
}
