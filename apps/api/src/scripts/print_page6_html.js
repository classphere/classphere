const fs = require('fs');
const path = require('path');

const rawPath = "D:/classphere/apps/api/apps/api/temp/extract_1784205291593_uiufkn/extracted_data/marker_raw.json";
const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
const page6 = rawData.json.children[5]; // page 6 is index 5
console.log("=== Page 6 HTML ===");
console.log(page6.html);
