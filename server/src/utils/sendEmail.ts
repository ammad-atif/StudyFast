import { Resend } from "resend";

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  email: string;
  subject: string;
  fullName: string;
  verificationUrl: string;
}

// Inside your controller


export const sendEmail = async (options: EmailOptions) => {
    const emailHtml = `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #0f172a;">Verify your StudyFAST account</h2>
    <p>Hi ${options.fullName},</p>
    <p>Welcome to StudyFAST! Please click the button below to verify your email address and complete your registration.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${options.verificationUrl}" 
         style="background-color: #0f172a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
         Verify Email Address
      </a>
    </div>
    <p style="font-size: 0.8rem; color: #64748b;">
      This link will expire in 24 hours. If you did not create an account, no further action is required.
    </p>
  </div>
`;
  try {
    const { data, error } = await resend.emails.send({
      from: "StudyFAST <onboarding@resend.dev>", // Use your verified domain in production
      to: [options.email],
      subject: options.subject,
      html: emailHtml,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error("Resend Error:", err.message);
    throw new Error("Failed to send email via Resend");
  }
};
