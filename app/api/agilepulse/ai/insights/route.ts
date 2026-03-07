import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

type AIInsightBody = {
  title: string;
  description: string;
  distribution?: Record<string, number>;
  consensusReached?: boolean;
  consensusValue?: string;
  participantCount?: number;
};

type InsightResult = {
  summary: string;
  discussionPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  source: 'bedrock' | 'heuristic';
};

// ─── Heuristic fallback ──────────────────────────────────────────────────────

function heuristicInsight(input: AIInsightBody): InsightResult {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const points: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (text.includes('external') || text.includes('dependency') || text.includes('third party')) {
    points.push('What is the risk if the external dependency is delayed or changes its contract?');
    riskLevel = 'medium';
  }
  if (text.includes('api') || text.includes('integration')) {
    points.push('Has the API contract been validated? Are there known rate limits or error scenarios?');
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
  }
  if (text.includes('unknown') || text.includes('tbd') || text.includes('investigate')) {
    points.push('The scope includes unknowns — should this be a spike before committing an estimate?');
    riskLevel = 'high';
  }
  if (!text.includes('acceptance') && !text.includes('criteria')) {
    points.push('Acceptance criteria are not explicit. Who defines "done" for QA and the demo?');
  }
  if (points.length === 0) {
    points.push('Are there any edge cases not covered in the description?');
    points.push('Does this story have direct dependencies on other in-flight work?');
  }

  const spread = input.distribution
    ? (() => {
        const numericVals = Object.entries(input.distribution)
          .filter(([, count]) => count > 0)
          .map(([val]) => Number(val))
          .filter((v) => !isNaN(v) && isFinite(v));
        return numericVals.length >= 2
          ? Math.max(...numericVals) - Math.min(...numericVals)
          : 0;
      })()
    : 0;
  if (spread >= 8) riskLevel = 'high';
  else if (spread >= 3) riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;

  return {
    summary: input.consensusReached
      ? `Team reached consensus on ${input.consensusValue} points. The story appears well-understood with aligned expectations.`
      : 'High variance in estimates suggests the team has different assumptions about scope or complexity. A brief discussion should clarify before re-voting.',
    discussionPoints: points,
    riskLevel,
    recommendation:
      riskLevel === 'high'
        ? 'Consider breaking this story into smaller, better-defined tasks.'
        : riskLevel === 'medium'
        ? 'Clarify assumptions and dependencies before finalizing.'
        : 'Story looks well-scoped. Proceed with the consensus estimate.',
    source: 'heuristic',
  };
}

// ─── Bedrock (Claude 3 Haiku) ──────────────────────────────────────────────────

async function bedrockInsight(input: AIInsightBody): Promise<InsightResult> {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  const distributionText = input.distribution
    ? Object.entries(input.distribution)
        .filter(([, count]) => count > 0)
        .map(([v, c]) => `${v} pts: ${c} vote${c > 1 ? 's' : ''}`)
        .join(', ')
    : 'Not yet revealed';

  const prompt = `You are an agile coach helping a scrum team with story-point estimation.

Story title: ${input.title}
Story description: ${input.description}
Vote distribution: ${distributionText}
Consensus reached: ${input.consensusReached ? `Yes — ${input.consensusValue} points` : 'No'}
Team size: ${input.participantCount ?? 'unknown'} participants

Analyze this planning poker result and respond with ONLY a JSON object in this exact shape:
{
  "summary": "<2-3 sentence analysis of why votes converged or diverged>",
  "discussionPoints": ["<question 1>", "<question 2>", "<question 3>"],
  "riskLevel": "<low|medium|high>",
  "recommendation": "<one clear next action for the team>"
}

Rules:
- discussionPoints must be exactly 2–3 specific, actionable questions
- riskLevel reflects estimation uncertainty and story complexity
- Be concise and direct — no filler words`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await client.send(command);
  const raw = JSON.parse(new TextDecoder().decode(response.body)) as {
    content?: Array<{ text?: string }>;
  };
  const text: string = raw.content?.[0]?.text ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Bedrock response');
  const parsed = JSON.parse(jsonMatch[0]) as Omit<InsightResult, 'source'>;

  return { ...parsed, source: 'bedrock' };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIInsightBody;

    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'title and description are required.' }, { status: 400 });
    }

    let result: InsightResult;
    try {
      result = await bedrockInsight(body);
    } catch (bedrockError) {
      console.warn('Bedrock unavailable, falling back to heuristic:', bedrockError);
      result = heuristicInsight(body);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Failed to generate AI insights', error);
    return NextResponse.json({ error: 'Unable to generate AI insights.' }, { status: 500 });
  }
}
