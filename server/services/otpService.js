const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const OTP = require('../models/OTP');

class OTPService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    // If credentials are provided in .env, use them
    if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: parseInt(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      // In development, if no email settings, we will log to console, but we can also attempt Ethereal
      try {
        nodemailer.createTestAccount((err, account) => {
          if (err) {
            console.log('Ethereal Email account creation failed. OTP will only be logged to console.');
            return;
          }
          this.transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
              user: account.user,
              pass: account.pass
            }
          });
          console.log(`Ethereal SMTP configured. Dev Mailbox user: ${account.user}`);
        });
      } catch (e) {
        console.log('Nodemailer test account failed. OTP will be printed to console.');
      }
    }
  }

  async generateOTP(email) {
    // 6 digit numeric code
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Delete existing OTP for this email
    await OTP.deleteMany({ email });

    // Save OTP hash in database
    await OTP.create({
      email,
      otpHash,
      expiresAt
    });

    // Output to server logs for convenience during local development/testing
    console.log(`==========================================`);
    console.log(`[DEV OTP] OTP for ${email} is: ${otp}`);
    console.log(`==========================================`);

    // Send via email if transporter is active
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: '"XO Arena" <no-reply@xo-arena.com>',
          to: email,
          subject: 'XO Arena OTP Verification',
          text: `Your OTP for XO Arena verification is: ${otp}. It is valid for 5 minutes.`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0F1117; color: #ffffff; border-radius: 8px;">
                  <h2 style="color: #5B5FFF;">XO Arena Verification</h2>
                  <p>Thank you for choosing XO Arena! Use the code below to complete verification:</p>
                  <div style="font-size: 32px; font-weight: bold; background-color: #1A1D26; color: #5B5FFF; padding: 15px; text-align: center; border-radius: 4px; border: 1px solid #5B5FFF; margin: 20px 0; letter-spacing: 4px;">
                    ${otp}
                  </div>
                  <p style="font-size: 12px; color: #888888;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
                 </div>`
        });

        // Log ethereal URL if applicable
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`[SMTP DEV MAIL] Preview URL: ${previewUrl}`);
        }
      } catch (err) {
        console.error('Mail delivery failed:', err.message);
      }
    }

    return otp; // Return for convenience in dev controllers
  }

  async verifyOTP(email, otp) {
    const record = await OTP.findOne({ email });
    if (!record) {
      return { success: false, reason: 'OTP not found or expired' };
    }

    if (record.verified) {
      return { success: false, reason: 'OTP already verified' };
    }

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ email });
      return { success: false, reason: 'OTP expired' };
    }

    if (record.attemptCount >= 5) {
      await OTP.deleteOne({ email });
      return { success: false, reason: 'Too many failed attempts. Please generate a new OTP' };
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch) {
      record.attemptCount += 1;
      await record.save();
      return { success: false, reason: 'Invalid OTP code', remainingAttempts: 5 - record.attemptCount };
    }

    record.verified = true;
    await record.save();
    return { success: true };
  }

  async deleteOTP(email) {
    await OTP.deleteOne({ email });
  }
}

module.exports = new OTPService();
