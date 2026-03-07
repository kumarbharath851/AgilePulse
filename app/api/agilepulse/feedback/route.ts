import { NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL ?? '';

export async function POST(request: Request) {
  if (!FEEDBACK_EMAIL) {
    return NextResponse.json({ error: 'Feedback email not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      rating: number;
      workedWell: string;
      toImprove: string;
    };

    const { rating, workedWell, toImprove } = body;
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating.' }, { status: 400 });
    }

    const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

    const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #18181b;">
  <div style="border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: white; letter-spacing: -0.3px;">
        AgilePulse Feedback
      </h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.7);">${timestamp} UTC</p>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; width: 130px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">Overall Rating</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; font-size: 20px;">${stars} <span style="font-size: 14px; font-weight: 700; color: #7c3aed;">${rating}/5</span></td>
        </tr>
        <tr>
          <td style="padding: 12px 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; vertical-align: top;">What Worked Well</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 0 0 16px;">
            <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; font-size: 14px; line-height: 1.6; color: #3f3f46; white-space: pre-wrap;">${workedWell || '(no response)'}</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; vertical-align: top;">What Could Be Improved</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="2">
            <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; font-size: 14px; line-height: 1.6; color: #3f3f46; white-space: pre-wrap;">${toImprove || '(no response)'}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;

    const textBody = `AgilePulse Feedback — ${timestamp} UTC\n\nRating: ${rating}/5\n\nWhat worked well:\n${workedWell || '(no response)'}\n\nWhat could be improved:\n${toImprove || '(no response)'}`;

    await ses.send(
      new SendEmailCommand({
        Source: FEEDBACK_EMAIL,
        Destination: { ToAddresses: [FEEDBACK_EMAIL] },
        Message: {
          Subject: { Data: `AgilePulse Feedback — ${stars} ${rating}/5` },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Feedback] SendEmail failed', err);
    return NextResponse.json({ error: 'Failed to send feedback.' }, { status: 500 });
  }
}
