const fs = require('fs');
const path = require('path');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const stats = readData(statsName, defaultStats);
    
    stats.total_requests += 1;
    const now = Date.now();
    stats._requests.push(now);
    stats._requests = stats._requests.filter(time => time > now - (48 * 60 * 60 * 1000));
    stats.last_2_days_requests = stats._requests.length;

    writeData(statsName, stats);

    // Remove private variables from response
    const { _users, _requests, ...cleanStats } = stats;

    return res.status(200).json(cleanStats);

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
