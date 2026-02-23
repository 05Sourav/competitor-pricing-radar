import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPricingAlert({
  to,
  competitorName,
  url,
  summary,
}: {
  to: string;
  competitorName: string;
  url: string;
  summary: string;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'alerts@pricingradar.xyz',
    to,
    subject: `🚨 Pricing change detected: ${competitorName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #ef4444; margin-bottom: 8px;">Pricing Change Detected</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Competitor Pricing Radar spotted a change on <strong>${competitorName}</strong></p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 16px; color: #92400e;">${summary}</p>
        </div>

        <p style="margin-bottom: 4px; color: #374151;"><strong>Source URL:</strong></p>
        <a href="${url}" style="color: #3b82f6; word-break: break-all;">${url}</a>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">
          You're receiving this because you set up monitoring via Competitor Pricing Radar.<br/>
          Alerts are sent only when meaningful pricing changes are detected.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Email send error:', error);
    throw error;
  }

  return data;
}
