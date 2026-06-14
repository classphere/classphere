const fs = require('fs');
const crypto = require('crypto');

// --- CONFIG ---
const OPTION_KEY_MAP = { a: 'A', g: 'B', h: 'C', k: 'D' };
const INDEX_TO_ID = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

const TYPE_MAP = {
  'Single Correct': 'mcq_single',
  'Numerical': 'integer'
};

/**
 * Transforms raw JEE Main question JSONs into the enriched schema 
 * required by the analysis engine.
 */
function transformData(inputFile, outputFile) {
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    const transformed = rawData.map((q, index) => {
        // Extract question text properly
        let questionText = q.image_url && q.image_url.g ? q.image_url.g : (q.question_text || "");
        
        // Map question type
        let qType = TYPE_MAP[q.type || q.question_type] || 'mcq_single';
        if (q.question_type === 'Numerical' || q.type === 'Numerical') {
            qType = 'integer';
        }

        // Map options from raw {a, g, h, k} format to standard array format
        let options = [];
        if (q.options) {
            options = Object.keys(OPTION_KEY_MAP).map(key => {
                if (q.options[key] !== undefined) {
                    return {
                        id: OPTION_KEY_MAP[key],
                        text: q.options[key],
                        image_url: null
                    };
                }
                return null;
            }).filter(Boolean);
        } else if (Array.isArray(q.options)) {
            // Already standard format or simple array
            options = q.options;
        }

        // Handle answer key formatting
        let correctAnswer = [];
        if (q.answer_key !== undefined) {
             if (qType === 'mcq_single') {
                 // Try mapping index to A/B/C/D if applicable
                 let ansIndex = parseInt(q.answer_key);
                 if (!isNaN(ansIndex) && INDEX_TO_ID[ansIndex] !== undefined) {
                     correctAnswer = [INDEX_TO_ID[ansIndex]];
                 } else {
                     correctAnswer = [String(q.answer_key)];
                 }
             } else {
                 // For numerical, keep the answer as is (usually string or number)
                 correctAnswer = [q.answer_key];
             }
        } else if (q.correct_answer) {
             correctAnswer = q.correct_answer;
        }
        
        // Auto-tag subjects based on standard 90-question paper format
        let qNum = q.question_number || (index + 1);
        let subject = "Physics";
        if (qNum > 30) subject = "Chemistry";
        if (qNum > 60) subject = "Mathematics";

        return {
            id: q.id || crypto.randomUUID(),
            question_number: qNum,
            question_text: questionText,
            question_images: [],
            options: options,
            correct_answer: correctAnswer,
            explanation: q.solution_image && q.solution_image.g ? q.solution_image.g : (q.explanation || ""),
            explanation_images: [],
            question_type: qType,
            subject: q.subject || subject,
            chapter: q.chapter || "",
            topic: q.topic || "",
            difficulty: q.difficulty || "medium",
            source: q.source || inputFile.replace('.json', ''),
            year: q.year || 2024,
            tags: q.tags || [],
            distractor_map: q.distractor_map || null,
            marking_scheme: q.marking_scheme || {
                correct: 4,
                incorrect: -1,
                unattempted: 0,
                partial: false
            }
        };
    });

    fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2), 'utf8');
    console.log(`Transformed ${transformed.length} questions from ${inputFile} -> ${outputFile}`);
}

// Example usage when running as a script:
// transformData('raw_file.json', 'enriched_file.json');

module.exports = { transformData };
