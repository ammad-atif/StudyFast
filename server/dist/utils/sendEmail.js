"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
// import { Resend } from "resend";
const nodemailer = require("nodemailer");
// Initialize Resend with your API Key
// const resend = new Resend(process.env.RESEND_API_KEY);
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.G_EMAIL,
        pass: process.env.G_PASSWORD,
    },
});
// Inside your controller
const sendEmail = async (options) => {
    const isResetEmail = Boolean(options.resetPasswordUrl);
    const actionUrl = options.resetPasswordUrl || options.verificationUrl;
    const title = isResetEmail
        ? "Reset your StudyFAST password"
        : "Verify your StudyFAST account";
    const bodyText = isResetEmail
        ? "We received a request to reset your StudyFAST password. Click the button below to set a new password."
        : "Welcome to StudyFAST! Please click the button below to verify your email address and complete your registration.";
    const buttonText = isResetEmail ? "Reset Password" : "Verify Email Address";
    const footerText = isResetEmail
        ? "This link will expire in 15 minutes. If you did not request a password reset, you can ignore this email."
        : "This link will expire in 24 hours. If you did not create an account, no further action is required.";
    const emailHtml = `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #0f172a;">${title}</h2>
    <p>Hi ${options.fullName},</p>
    <p>${bodyText}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" 
         style="background-color: #0f172a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
         ${buttonText}
      </a>
    </div>
    <p style="font-size: 0.8rem; color: #64748b;">
      ${footerText}
    </p>
  </div>
`;
    //   try {
    //     const { data, error } = await resend.emails.send({
    //       from: "StudyFAST <onboarding@resend.dev>", // Use your verified domain in production
    //       to: [options.email],
    //       subject: options.subject,
    //       html: emailHtml,
    //     });
    //     if (error) {
    //       throw new Error(error.message);
    //     }
    //     return data;
    //   } catch (err: any) {
    //     console.error("Resend Error:", err.message);
    //     throw new Error("Failed to send email via Resend");
    //   }
    try {
        const info = await transporter.sendMail({
            from: process.env.G_EMAIL,
            to: options.email,
            subject: options.subject,
            html: emailHtml,
        });
    }
    catch (error) {
        throw new Error("Failed to send email");
    }
};
exports.sendEmail = sendEmail;
