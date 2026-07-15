const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'apps', 'web', 'src', 'app', '[domain]');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const folders = ['login','dashboard','student','teacher','institute','test','tests','dpps','pyqs','assignments','doubts','history','leaderboard','profile','settings','invite','analytics','help','signup','mistakes','results'];

for (const folder of folders) {
  const src = path.join(__dirname, 'apps', 'web', 'src', 'app', folder);
  const dest = path.join(targetDir, folder);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${folder} to [domain]`);
  }
}
