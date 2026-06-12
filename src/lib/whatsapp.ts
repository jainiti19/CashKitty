import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Use sandbox number for testing, your own number for production
const FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

export async function sendWhatsApp(to: string, message: string) {
  // Ensure 'to' has whatsapp: prefix
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  return client.messages.create({
    body: message,
    from: FROM,
    to: toNumber,
  });
}

export async function downloadMedia(mediaUrl: string): Promise<{ base64: string; contentType: string }> {
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
    },
  });

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    base64: buffer.toString("base64"),
    contentType,
  };
}
