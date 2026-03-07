# AgilePulse

AgilePulse is a next-gen sprint planning platform with collaborative story pointing, consensus detection, analytics, and integration scaffolding for Jira and Microsoft Teams.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

Optional: point the UI directly to deployed AWS API Gateway instead of local Next API routes.

```bash
# PowerShell
$env:NEXT_PUBLIC_AGILEPULSE_API_BASE_URL="https://1wfk2wbuw3.execute-api.us-east-1.amazonaws.com"
```

3. Open:

`http://localhost:3000/agilepulse`

## Implemented app capabilities

- Session management (create + join by session link)
- Participant roster with avatars and invite QR preview
- Story queue (manual add + Jira import stub)
- Private voting, reveal, outlier detection, and revote rounds
- Discussion timer and session-level analytics
- AI insight endpoint (risk + clarity heuristics)
- Teams channel payload endpoint
- Optional Jira point sync on finalization
- Realtime session updates via event stream endpoint

## API overview

- `POST /api/agilepulse/sessions`
- `GET /api/agilepulse/sessions/:sessionId`
- `POST /api/agilepulse/sessions/:sessionId/join`
- `POST /api/agilepulse/sessions/:sessionId/stories`
- `POST /api/agilepulse/sessions/:sessionId/stories/import-jira`
- `POST /api/agilepulse/sessions/:sessionId/votes`
- `POST /api/agilepulse/sessions/:sessionId/votes/reveal`
- `POST /api/agilepulse/sessions/:sessionId/round`
- `POST /api/agilepulse/sessions/:sessionId/finalize`
- `GET /api/agilepulse/sessions/:sessionId/analytics`
- `GET /api/agilepulse/sessions/:sessionId/events`
- `POST /api/agilepulse/ai/insights`
- `POST /api/agilepulse/integrations/teams/share`

## Infrastructure and delivery

- Architecture and implementation details: `ARCHITECTURE.md`
- AWS CDK project: `infrastructure/`
- CI/CD workflow: `.github/workflows/agilepulse-ci-cdk.yml`
