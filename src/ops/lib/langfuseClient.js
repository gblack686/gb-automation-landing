import { generateClient } from 'aws-amplify/data';

export async function getLangfuseTraces({ hours = 168, observationPages = 5, limit = 50 } = {}) {
  const client = generateClient();
  const { data, errors } = await client.queries.langfuseTraces(
    { hours, observationPages, limit },
    { authMode: 'userPool' },
  );

  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  return data?.payload || data || {};
}
