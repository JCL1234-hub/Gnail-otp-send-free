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
  } catch (err) {}
}

function updateStats(type) {
  const stats = readData(statsName, defaultStats);
  const now = Date.now();
  stats.total_requests += 1;
  
  if (type === 'verified') stats.verified_otps += 1;
  if (type === 'expired') stats.expired_otps += 1;

  stats._requests.push(now);
  stats._requests = stats._requests.filter(time => time > now - (48 * 60 * 60 * 1000));
  stats.last_2_days_requests = stats._requests.length;

  writeData(statsName, stats);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { email, otp } = req.query;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const db = readData(dbName, {});
    const record = db[email];

    if (!record || record.otp !== otp) {
      return res.status(200).json({ success: false, verified: false, message: "Invalid OTP" });
    }

    if (Date.now() > record.expiresAt) {
      delete db[email];
      writeData(dbName, db);
      updateStats('expired');
      return res.status(200).json({ success: false, message: "OTP expired" });
    }

    // Success
    delete db[email];
    writeData(dbName, db);
    updateStats('verified');

    return res.status(200).json({
      success: true,
      verified: true,
      message: "OTP verified successfully",
      developer: "https://t.me/username_506"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
