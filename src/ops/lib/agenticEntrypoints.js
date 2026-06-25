const SKILL_CREATOR_TEMPLATE = `# Skill name

## Purpose
Describe the specialized capability this skill should add.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Workflow
1. Read only the context needed for the task.
2. Produce a small plan before changing files.
3. Validate the result with focused checks.

## Guardrails
- Stay scoped to the user request.
- Do not browse or explore broadly unless the request requires it.
- Record durable receipts for database or repo mutations.
`;

export function buildAgenticEntrypoint({
  feedbackType,
  preset,
  surface,
  route,
  title,
  details = {},
}) {
  return {
    feedback_type: feedbackType,
    preset,
    surface,
    route,
    title,
    agent_mode: 'triage_only',
    response_policy: 'database_receipt_only',
    details,
  };
}

export function buildSkillCreatorDraft({ route = '/ops/capabilities/skills' } = {}) {
  const entrypoint = buildAgenticEntrypoint({
    feedbackType: 'skill_create',
    preset: 'guided_skill_creator',
    surface: 'ops_capabilities',
    route,
    title: 'Guided skill creator',
    details: {
      target_kind: 'skill',
      canonical_path_hint: 'resources/skills/<slug>/SKILL.md',
      mutation_path: 'createCapabilityDraft',
    },
  });

  return {
    title: '',
    path: '',
    body: SKILL_CREATOR_TEMPLATE,
    summary: [
      'Guided skill creator preset.',
      `agent_mode=${entrypoint.agent_mode}`,
      `feedback_type=${entrypoint.feedback_type}`,
      `preset=${entrypoint.preset}`,
    ].join(' '),
    entrypoint,
  };
}

export const __agenticEntrypointsTest = {
  SKILL_CREATOR_TEMPLATE,
};
