const fs = require('fs');

// Simple TF-IDF / Keyword matcher
function extractSyllabus(text) {
  const lines = text.split('\n');
  const syllabus = [];
  let currentUnit = null;
  let currentSubject = 'Mathematics'; // default starting from the top usually

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect subject
    if (line.includes('MATHEMATICS')) currentSubject = 'Mathematics';
    if (line.includes('PHYSICS')) currentSubject = 'Physics';
    if (line.includes('CHEMISTRY')) currentSubject = 'Chemistry';

    const unitMatch = line.match(/^UNIT\s*\d+\s*:\s*(.*)/i);
    if (unitMatch) {
      if (currentUnit) {
        syllabus.push(currentUnit);
      }
      currentUnit = {
        subject: currentSubject,
        chapter: unitMatch[1].trim(),
        text: '',
        keywords: {}
      };
    } else if (currentUnit) {
      currentUnit.text += ' ' + line;
    }
  }
  if (currentUnit) syllabus.push(currentUnit);

  // Process keywords for each unit
  syllabus.forEach(unit => {
    const words = unit.text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    words.forEach(w => {
      if (w.length > 3) {
        unit.keywords[w] = (unit.keywords[w] || 0) + 1;
      }
    });
  });

  return syllabus;
}

function getBestMatch(questionText, questionSubject, syllabus) {
  const subjectUnits = syllabus.filter(u => u.subject.toLowerCase() === questionSubject.toLowerCase());
  if (subjectUnits.length === 0) return { chapter: '', topic: '' };

  const words = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  
  let bestUnit = null;
  let maxScore = -1;

  for (const unit of subjectUnits) {
    let score = 0;
    for (const w of words) {
      if (unit.keywords[w]) {
        score += unit.keywords[w];
      }
    }
    // Normalize score by unit keyword count to prevent bias towards long units
    const totalKeywords = Object.values(unit.keywords).reduce((a, b) => a + b, 0) || 1;
    const normalizedScore = score / Math.sqrt(totalKeywords);

    if (normalizedScore > maxScore) {
      maxScore = normalizedScore;
      bestUnit = unit;
    }
  }

  // Find a topic by extracting a phrase from the unit text that matches the question
  let bestTopic = '';
  if (bestUnit) {
    const unitSentences = bestUnit.text.split(/[,;.]/).map(s => s.trim()).filter(s => s.length > 5);
    let maxSentenceScore = -1;
    for (const sentence of unitSentences) {
      const sWords = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      let sScore = 0;
      for (const w of words) {
        if (sWords.includes(w)) sScore++;
      }
      if (sScore > maxSentenceScore) {
        maxSentenceScore = sScore;
        bestTopic = sentence;
      }
    }
  }

  return {
    chapter: bestUnit ? bestUnit.chapter : '',
    topic: bestTopic ? bestTopic.substring(0, 50) : '' // Limit topic length
  };
}

const syllabusText = fs.readFileSync('syllabus.txt', 'utf8');
const syllabus = extractSyllabus(syllabusText);

['JEE Main 2024 (27 Jan Shift 1).json', 'JEE Main 2024 (27 Jan Shift 2).json'].forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Processing ${file}...`);
  let count = 0;
  for (const q of data) {
    const textToMatch = q.question_text + ' ' + (q.explanation || '') + ' ' + (q.options ? q.options.map(o => o.text).join(' ') : '');
    const match = getBestMatch(textToMatch, q.subject, syllabus);
    q.chapter = match.chapter;
    q.topic = match.topic;
    if (match.chapter) count++;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Matched ${count}/${data.length} questions.`);
});
