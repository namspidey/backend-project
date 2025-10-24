// utils/email.js
require("dotenv").config();
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html, text }) => {
  const msg = {
    to,
    from: process.env.SENDGRID_SENDER, // địa chỉ email bạn đã verify trong SendGrid
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ SendGrid error:", error.response?.body || error.message);
    throw new Error("Gửi email thất bại");
  }
};

module.exports = { sendEmail };
