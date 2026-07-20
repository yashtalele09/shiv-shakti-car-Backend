import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email: string, otp: string) => {
  console.log("this is email", email);
  console.log("this is otp", otp);
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: "Email Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Email Verification</h2>

          <p>Your OTP for email verification is:</p>

          <h1
            style="
              background:#f4f4f4;
              padding:10px;
              display:inline-block;
              letter-spacing:5px;
            "
          >
            ${otp}
          </h1>

          <p>This OTP is valid for 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`OTP sent to ${email}`);
    console.log("this is response", response);
  } catch (error) {
    console.error("Failed to send OTP:", error);
    throw new Error("Failed to send OTP email");
  }
};
