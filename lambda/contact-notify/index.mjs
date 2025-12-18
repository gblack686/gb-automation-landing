import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-east-1" });
const NOTIFY_EMAIL = "greg@gbautomation.xyz";

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // Parse the incoming webhook payload
    let body;
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else {
      body = event.body || event;
    }

    // Handle Supabase webhook format (record is in body.record)
    const record = body.record || body;

    const { name, email, company, phone, project_description, created_at } = record;

    // Format the email
    const companyLine = company ? company : 'Not provided';
    const phoneLine = phone ? phone : 'Not provided';
    const subjectCompany = company ? ` from ${company}` : '';

    const emailBody = [
      'New Contact Form Submission',
      '============================',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${companyLine}`,
      `Phone: ${phoneLine}`,
      '',
      'Project Description:',
      project_description,
      '',
      `Submitted: ${new Date(created_at || Date.now()).toLocaleString('en-US', { timeZone: 'America/New_York' })}`,
      '',
      '---',
      `Reply directly to: ${email}`
    ].join('\n');

    const params = {
      Source: NOTIFY_EMAIL,
      Destination: {
        ToAddresses: [NOTIFY_EMAIL]
      },
      ReplyToAddresses: [email],
      Message: {
        Subject: {
          Data: `[GB Automation] New Contact: ${name}${subjectCompany}`,
          Charset: "UTF-8"
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: "UTF-8"
          }
        }
      }
    };

    const command = new SendEmailCommand(params);
    await ses.send(command);

    console.log("Email sent successfully");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Notification sent" })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
