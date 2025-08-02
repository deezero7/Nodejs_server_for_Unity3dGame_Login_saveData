//for password reset email its different link and subject so, different file
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g., yourgmail@gmail.com
    pass: process.env.EMAIL_PASS, // App Password (NOT your Gmail password)
  },
});

module.exports = async function sendVerificationEmail(to, token) {
  const link = `https://nodejs-server-for-unity3dgame-login-5vxc.onrender.com/u3d/resetPasswordd?token=${token}&email=${encodeURIComponent(
    to
  )}`;
  try {
    await transporter.sendMail({
      from: `"deeS Unity Game" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Password Reset Request",
      html: `
        <p>Hello,</p>
        <p>Now you can reset your password by clicking the link below:</p>
        <p><a href="${link}" target="_blank">${link}</a></p>
        <p>This link will expire in 1 hours.</p>
      `,
    });
    console.log("Verification email sent to:", to);
  } catch (err) {
    console.error("Error sending verification email:", err);
    throw err; // rethrow so calling function can handle
  }
};
