import axios from 'axios';

type JiraSyncInput = {
  baseUrl: string;
  email: string;
  apiToken: string;
  issueKey: string;
  storyPointsFieldId: string;
  storyPoints: number;
  estimationComment: string;
};

function authHeader(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

export async function syncEstimateToJira(input: JiraSyncInput): Promise<void> {
  const headers = {
    Authorization: authHeader(input.email, input.apiToken),
    'Content-Type': 'application/json',
  };

  try {
    await axios.put(
      `${input.baseUrl}/rest/api/3/issue/${input.issueKey}`,
      {
        fields: {
          [input.storyPointsFieldId]: input.storyPoints,
        },
      },
      { headers, timeout: 20000 }
    );
  } catch (error) {
    throw new Error(
      `Failed to update story points in Jira: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    await axios.post(
      `${input.baseUrl}/rest/api/3/issue/${input.issueKey}/comment`,
      {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: input.estimationComment,
                },
              ],
            },
          ],
        },
      },
      { headers, timeout: 20000 }
    );
  } catch (error) {
    // Story points were already synced; log a warning but do not fail the caller
    console.warn(
      `Failed to add estimation comment to Jira issue ${input.issueKey}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
