const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // or Brevo, Outlook, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async function sendVerificationEmail(to, token) {
  const link = `https://your-domain.com/u3d/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Unity Game" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your Email",
    html: `<p>Click the link below to verify your email:</p>
           <a href="${link}">${link}</a>`
  });
};
