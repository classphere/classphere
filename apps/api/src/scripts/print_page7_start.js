const fs = require('fs');
const path = require('path');

const rawPath = "D:/classphere/apps/api/apps/api/temp/extract_1784205291593_uiufkn/extracted_data/marker_raw.json";
const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
const page7 = rawData.json.children[6]; // page 7 is index 6
console.log("=== Page 7 HTML ===");
console.log(page7.html.substring(0, 300));
