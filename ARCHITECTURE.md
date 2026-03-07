# AgilePulse Architecture and Delivery Blueprint

## 1) System Architecture Explanation

AgilePulse uses a serverless, event-driven architecture optimized for low operational overhead and high horizontal scale.

- Frontend: Next.js (React) UI served via CloudFront.
- API layer: API Gateway HTTP API for REST and WebSocket API for real-time collaboration.
- Compute: Lambda microservices split by bounded context: Session, Story, Voting, Analytics, Integration.
- Data: DynamoDB tables for sessions/stories/votes/users/session-events with composite keys and GSIs.
- AI: Bedrock-powered insight service for story summarization, risk hints, and estimate guidance.
- Security: Cognito + JWT, IAM least-privilege, TLS, WAF, and route-level validation.

## 2) AWS Architecture Diagram Description

```text
Users (Web / Teams Tab / Mobile)
        |
   CloudFront + WAF
        |
   S3 (static UI) + Next.js app
        |
  API Gateway HTTP --------------------------> Lambda: Integration Service --> Jira / Teams
        |                                          |
        |                                          +--> Bedrock (AI insights)
        v
 Lambda: Session / Story / Voting / Analytics
        |
        +--> DynamoDB: Sessions, Stories, Votes, Users, SessionEvents
        |
 API Gateway WebSocket <---------------------+
        |
    Real-time vote/reveal/discussion events

CloudWatch + X-Ray observe all runtime components.
```

## 3) Infrastructure as Code (AWS CDK)

Implemented in [infrastructure/lib/agilepulse-stack.ts](infrastructure/lib/agilepulse-stack.ts):

- DynamoDB tables for sessions and votes
- Cognito user pool and app client
- HTTP API + Lambda integration
- WebSocket API + routes
- IAM policy for Bedrock invocation
- Outputs for API URLs and identity resources

## 4) Backend Service Implementation Examples

Implemented API routes:

- Create/Get/Join session
- Add/import stories (manual + Jira-import stub)
- Submit private vote, reveal votes, revote rounds
- Finalize story estimate and optional Jira sync
- Session analytics endpoint

Reference paths:

- [app/api/agilepulse/sessions/route.ts](app/api/agilepulse/sessions/route.ts)
- [app/api/agilepulse/sessions/[sessionId]/votes/route.ts](app/api/agilepulse/sessions/[sessionId]/votes/route.ts)
- [app/api/agilepulse/sessions/[sessionId]/finalize/route.ts](app/api/agilepulse/sessions/[sessionId]/finalize/route.ts)

## 5) Real-Time Voting Implementation

- Implemented session event stream endpoint via Server-Sent Events at [app/api/agilepulse/sessions/[sessionId]/events/route.ts](app/api/agilepulse/sessions/[sessionId]/events/route.ts).
- Event bus is backed by in-memory subscriber fan-out in [lib/agilepulse/session-store.ts](lib/agilepulse/session-store.ts).
- CDK stack provisions API Gateway WebSocket infrastructure for SaaS-scale production migration.

## 6) Frontend Component Architecture

- Screen composition in [app/agilepulse/page.tsx](app/agilepulse/page.tsx):
  - Join/Create Session
  - Lobby and participants
  - Story queue management
  - Planning poker voting board
  - Reveal and discussion timer
  - Session analytics summary
- Reusable modules:
  - [components/agilepulse/PlanningPokerBoard.tsx](components/agilepulse/PlanningPokerBoard.tsx)
  - [components/agilepulse/VoteRevealPanel.tsx](components/agilepulse/VoteRevealPanel.tsx)

## 7) Jira API Integration Example

- Estimate sync helper in [lib/agilepulse/jira-integration.ts](lib/agilepulse/jira-integration.ts).
- Finalization route optionally pushes story points + estimation comment to Jira.

## 8) Microsoft Teams Tab Integration

- Teams tab manifest scaffold at [integrations/teams/manifest.json](integrations/teams/manifest.json).
- Teams channel card payload generation endpoint at [app/api/agilepulse/integrations/teams/share/route.ts](app/api/agilepulse/integrations/teams/share/route.ts).

## 9) Deployment Pipeline

- GitHub Actions workflow at [.github/workflows/agilepulse-ci-cdk.yml](.github/workflows/agilepulse-ci-cdk.yml).
- Jobs:
  - Web app build
  - CDK synth
  - AWS deploy on main using OIDC role assumption

## 10) Example UI Wireframes

```text
[Join/Create]
+-----------------------------------------+
| AgilePulse                              |
| [Team Name________] [Display Name____]  |
| (Create Session)                        |
| [Session ID_______] [Display Name____]  |
| (Join Session)                          |
+-----------------------------------------+

[Session Lobby + Story Queue]
+-----------------------------------------+
| Team: Platform | Session: session-123   |
| Participants: Ava Liam Noah You         |
| Invite: /agilepulse?sessionId=...       |
| [Story title____] [description_______]  |
| (Add Story) (Import Jira)               |
| Queue: [Story A] [Story B] [Story C]    |
+-----------------------------------------+

[Voting + Reveal]
+-----------------------------------------+
| Active Story: Export sprint report      |
| Cards: 0 1 2 3 5 8 13 21 ? ☕           |
| (Submit Vote) (Reveal) (Re-vote)        |
| Reveal panel: dist, outliers, prompt    |
| Timer: 120s                             |
+-----------------------------------------+

[Session Summary]
+-----------------------------------------+
| Stories: 10 | Finalized: 8              |
| Consensus: 75% | Avg spread: 2.1        |
| Estimate distribution chart             |
+-----------------------------------------+
```

## Design Tradeoffs

- SSE currently powers local real-time behavior for rapid delivery; API Gateway WebSockets are provisioned in CDK for production-grade fan-out.
- In-memory store enables fast prototyping but should be replaced with DynamoDB repositories for durable multi-instance state.
- Next.js unified codebase optimizes developer productivity; heavy event workloads should progressively move to dedicated Lambda handlers.
