import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type JiraImportBody = {
  issues?: Array<{ key: string; summary: string; description?: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as JiraImportBody;
    const issues = body.issues ?? [
      {
        key: 'AG-101',
        summary: 'Add SSO login flow',
        description: 'Implement Cognito-based login and callback handling.',
      },
      {
        key: 'AG-102',
        summary: 'Add export endpoint',
        description: 'Provide CSV export for sprint summary report.',
      },
    ];

    const imported = agilePulseStore.importJiraStories(
      params.sessionId,
      issues.map((issue) => ({
        title: issue.summary,
        description: issue.description ?? 'Imported from Jira.',
        externalId: issue.key,
      }))
    );

    return NextResponse.json({ importedCount: imported.length, stories: imported }, { status: 200 });
  } catch (error) {
    console.error('Failed to import Jira stories', error);
    return NextResponse.json({ error: 'Unable to import Jira stories.' }, { status: 500 });
  }
}
