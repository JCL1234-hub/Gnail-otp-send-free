const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const fs = require('fs');
const path = require('path');

const dbName = 'database.json';
const statsName = 'stats.json';
const defaultStats = { api_name: "Gmail OTP API", version: "1.0.0", developer: "https://t.me/username_506", status: "Online", total_requests: 0, total_users: 0, total_otps_sent: 0, verified_otps: 0, expired_otps: 0, last_2_days_requests: 0, _users: [], _requests: [] };

function readData(fileName, defaultData) {
  try {
    const tmpPath = path.join('/tmp', fileName);
    if (fs.existsSync(tmpPath)) return JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    const localPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(localPath)) return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  } catch (err) {}
  return defaultData;
}

function writeData(fileName, data) {
  try {
    const tmpPath = path.join('/tmp', fileName);
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Write error:", err);
  }
}

function updateStats(type, email = null) {
  const stats = readData(statsName, defaultStats);
  const now = Date.now();
  stats.total_requests += 1;
  
  if (email && !stats._users.includes(email)) {
    stats._users.push(email);
    stats.total_users = stats._users.length;
  }
  if (type === 'sent') stats.total_otps_sent += 1;

  stats._requests.push(now);
  stats._requests = stats._requests.filter(time => time > now - (48 * 60 * 60 * 1000));
  stats.last_2_days_requests = stats._requests.length;

  writeData(statsName, stats);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { email } = req.query;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    const createdAt = Date.now();
    const expiresAt = createdAt + 3600000; // 1 hour

    // Store in Database
    const db = readData(dbName, {});
    db[email] = { otp, createdAt, expiresAt };
    writeData(dbName, db);

    // Fix Password (Remove Spaces)
    const rawPassword = process.env.GMAIL_APP_PASSWORD || '';
    const cleanPassword = rawPassword.replace(/\s+/g, ''); // Fixes "domo svaf ceaq gwxa"

    // Fix SMTP Server for Vercel
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: cleanPassword
      }
    });

    const mailOptions = {
      from: `"Gmail OTP API" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "Your Verification OTP",
      text: `Hello,\n\nYour OTP is\n\n${otp}\n\nThis OTP is valid for 1 hour.\n\nApi by\nhttps://t.me/username_506\n\nOtp by\nhttps://t.me/username_506\n\nTag by\nhttps://t.me/username_506\n\nDo not share this OTP with anyone.`
    };

    // Send Mail
    await transporter.sendMail(mailOptions);
    updateStats('sent', email);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      expires_in: "1 hour",
      developer: "https://t.me/username_506"
    });

  } catch (error) {
    console.error("OTP Send Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to send email. Check SMTP credentials.",
      error: error.message 
    });
  }
};
