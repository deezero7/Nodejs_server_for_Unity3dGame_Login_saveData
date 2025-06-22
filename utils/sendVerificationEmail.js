const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g., yourgmail@gmail.com
    pass: process.env.EMAIL_PASS, // App Password (NOT your Gmail password)
  },
});

module.exports = async function sendVerificationEmail(to, token) {
  const link = `https://your-domain.com/u3d/verify-email?token=${token}&email=${encodeURIComponent(
    to
  )}`;
  try {
    await transporter.sendMail({
      from: `"Unity Game" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify Your Email",
      html: `
        <p>Hello,</p>
        <p>Thank you for signing up. Please verify your email by clicking the link below:</p>
        <p><a href="${link}" target="_blank">${link}</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
    console.log("Verification email sent to:", to);
  } catch (err) {
    console.error("Error sending verification email:", err);
    throw err; // rethrow so calling function can handle
  }
};
