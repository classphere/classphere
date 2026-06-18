/**
 * scraper.js
 * NEET Question Scraper — sciencelesson.in
 * Output: one JSON file per chapter, each question matching the analysis engine schema.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'https://sciencelesson.in/NEET-Mock-Test';
const OUTPUT_DIR = path.join(__dirname, 'output');

// ─── CHAPTER MANIFEST ─────────────────────────────────────────────────────────
const CHAPTERS = {
  Physics: {
    prefix: 'physics-chapter-wise-question',
    chapters: [
      { slug: 'Units-and-Measurements', name: 'Units and Measurements' },
      { slug: 'Kinematics', name: 'Motion in a Straight Line' },
      { slug: 'Motion-in-a-Plane', name: 'Motion in a Plane' },
      { slug: 'Laws-of-Motion', name: 'Laws of Motion' },
      { slug: 'Work-Energy-and-Power', name: 'Work, Energy and Power' },
      { slug: 'System-of-Particles-and-Rotational-Motion', name: 'System of Particles and Rotational Motion' },
      { slug: 'Gravitation', name: 'Gravitation' },
      { slug: 'Mechanical-Properties-of-Solids', name: 'Mechanical Properties of Solids' },
      { slug: 'Mechanical-Properties-of-Fluids', name: 'Mechanical Properties of Fluids' },
      { slug: 'Thermal-Properties-of-Matter', name: 'Thermal Properties of Matter' },
      { slug: 'Thermodynamics', name: 'Thermodynamics' },
      { slug: 'Behaviour-of-Perfect-Gas-and-Kinetic-Theory', name: 'Kinetic Theory' },
      { slug: 'Oscillations', name: 'Oscillations' },
      { slug: 'Waves', name: 'Waves' },
      { slug: 'Electric-Charges-and-Fields', name: 'Electric Charges and Fields' },
      { slug: 'Electrostatic-Potential-and-Capacitance', name: 'Electrostatic Potential and Capacitance' },
      { slug: 'Current-Electricity', name: 'Current Electricity' },
      { slug: 'Magnetic-Effects-of-Current-and-Magnetism', name: 'Moving Charges and Magnetism' },
      { slug: 'Magnetism-and-Matter', name: 'Magnetism and Matter' },
      { slug: 'Electromagnetic-Induction', name: 'Electromagnetic Induction' },
      { slug: 'Alternating-Currents', name: 'Alternating Current' },
      { slug: 'Electromagnetic-Waves', name: 'Electromagnetic Waves' },
      { slug: 'Ray-Optics', name: 'Ray Optics and Optical Instruments' },
      { slug: 'Wave-Optics', name: 'Wave Optics' },
      { slug: 'Dual-Nature-of-Matter', name: 'Dual Nature of Radiation and Matter' },
      { slug: 'Atoms-and-Nuclei', name: 'Atoms and Nuclei' },
      { slug: 'Electronic-Devices', name: 'Semiconductor Electronics' },
    ],
  },
  Chemistry: {
    prefix: 'chemistry-chapter-wise-question',
    chapters: [
      { slug: 'Some-Basic-Concepts-Of-Chemistry', name: 'Some Basic Concepts of Chemistry' },
      { slug: 'Structure-of-Atom', name: 'Structure of Atom' },
      { slug: 'Classification-of-Elements-and-Periodicity-in-Properties', name: 'Classification of Elements and Periodicity in Properties' },
      { slug: 'Chemical-Bonding-and-Molecular-Structure', name: 'Chemical Bonding and Molecular Structure' },
      { slug: 'Thermodynamics', name: 'Thermodynamics' },
      { slug: 'Equilibrium', name: 'Equilibrium' },
      { slug: 'Redox-Reactions', name: 'Redox Reactions' },
      { slug: 'Organic-Chemistry-Some-Basic-Principles-and-Techniques', name: 'Some Basic Principles of Organic Chemistry' },
      { slug: 'Hydrocarbons', name: 'Hydrocarbons' },
      { slug: 'Solutions', name: 'Solutions' },
      { slug: 'Electrochemistry', name: 'Electrochemistry' },
      { slug: 'Chemical-Kinetics', name: 'Chemical Kinetics' },
      { slug: 'The-d-and-f-Block-Elements', name: 'd and f Block Elements' },
      { slug: 'Coordination-Compounds', name: 'Coordination Compounds' },
      { slug: 'Haloalkanes-and-Haloarenes', name: 'Haloalkanes and Haloarenes' },
      { slug: 'Alcohols-Phenols-and-Ethers', name: 'Alcohols, Phenols and Ethers' },
      { slug: 'Aldehydes-Ketones-and-Carboxylic-Acids', name: 'Aldehydes, Ketones and Carboxylic Acids' },
      { slug: 'Amines', name: 'Amines' },
      { slug: 'Biomolecules', name: 'Biomolecules' },
    ],
  },
  Biology: {
    prefix: 'biology-chapter-wise-question',
    chapters: [
      { slug: 'The-Living-World', name: 'The Living World' },
      { slug: 'Biological-Classification', name: 'Biological Classification' },
      { slug: 'Plant-Kingdom', name: 'Plant Kingdom' },
      { slug: 'Morphology-of-Flowering-Plants', name: 'Morphology of Flowering Plants' },
      { slug: 'Anatomy-of-Flowering-Plants', name: 'Anatomy of Flowering Plants' },
      { slug: 'Cell-The-Unit-of-Life', name: 'Cell: The Unit of Life' },
      { slug: 'Cell-Cycle-and-Cell-Division', name: 'Cell Cycle and Cell Division' },
      { slug: 'Photosynthesis', name: 'Photosynthesis in Higher Plants' },
      { slug: 'Respiration-in-Plants', name: 'Respiration in Plants' },
      { slug: 'Plant-Growth-and-Development', name: 'Plant Growth and Development' },
      { slug: 'Sexual-Reproduction-in-Flowering-Plants', name: 'Sexual Reproduction in Flowering Plants' },
      { slug: 'Principles-of-Inheritance-and-Variation', name: 'Principles of Inheritance and Variation' },
      { slug: 'Molecular-Basis-of-Inheritance', name: 'Molecular Basis of Inheritance' },
      { slug: 'Microbes-in-Human-Welfare', name: 'Microbes in Human Welfare' },
      { slug: 'Organisms-and-Population', name: 'Organisms and Populations' },
      { slug: 'Ecosystem', name: 'Ecosystem' },
      { slug: 'Biodiversity-and-Its-Conservation', name: 'Biodiversity and Conservation' },
      { slug: 'Animal-Kingdom', name: 'Animal Kingdom' },
      { slug: 'Structural-Organisation-in-Animals', name: 'Structural Organisation in Animals' },
      { slug: 'Biomolecules', name: 'Biomolecules' },
      { slug: 'Breathing-and-Exchange-of-Gases', name: 'Breathing and Exchange of Gases' },
      { slug: 'Body-Fluids-and-Circulation', name: 'Body Fluids and Circulation' },
      { slug: 'Excretory-Products-and-Their-Elimination', name: 'Excretory Products and their Elimination' },
      { slug: 'Locomotion-and-Movement', name: 'Locomotion and Movement' },
      { slug: 'Neural-Control-and-Coordination', name: 'Neural Control and Coordination' },
      { slug: 'Chemical-Coordination-and-Integration', name: 'Chemical Coordination and Integration' },
      { slug: 'Human-Reproduction', name: 'Human Reproduction' },
      { slug: 'Reproductive-Health', name: 'Reproductive Health' },
      { slug: 'Evolution', name: 'Evolution' },
      { slug: 'Human-Health-and-Diseases', name: 'Human Health and Disease' },
      { slug: 'Biotechnology-Principles-and-Processes', name: 'Biotechnology: Principles and Processes' },
      { slug: 'Biotechnology-and-its-Applications', name: 'Biotechnology and its Applications' },
    ],
  },
};

const OPTION_IDS = ['A', 'B', 'C', 'D'];

// ─── DETECT HOW MANY TESTS A CHAPTER HAS ─────────────────────────────────────
async function detectTestCount(page, baseChapterUrl) {
  try {
    await page.goto(baseChapterUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    const count = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/test-"]'));
      let max = 0;
      links.forEach(a => {
        const m = a.href.match(/test-(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1]));
      });
      return max;
    });
    return count > 0 ? count : 10; // fallback to 10
  } catch {
    return 10;
  }
}

// ─── SCRAPE ONE TEST PAGE ─────────────────────────────────────────────────────
async function scrapeTestPage(page, url, subject, chapterName, testNum) {
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    // 404 or redirect means no more tests
    if (!response || response.status() === 404) return null;

    const questions = await page.evaluate((subject, chapterName, testNum, OPTION_IDS) => {
      const questionEls = document.querySelectorAll('.question');
      if (!questionEls.length) return [];

      return Array.from(questionEls).map((qEl, idx) => {
        // Question text
        const questionText = qEl.querySelector('.writeQuestion p')?.innerText?.trim() || '';

        // Question image (if any)
        const qImg = qEl.querySelector('.writeQuestion img');
        const imageUrl = qImg ? qImg.src : null;

        // Options
        const optionEls = qEl.querySelectorAll('.option');
        const options = Array.from(optionEls).map((el, i) => {
          const img = el.querySelector('img');
          return {
            id: OPTION_IDS[i] || String.fromCharCode(65 + i),
            text: el.innerText?.trim() || '',
            image_url: img ? img.src : null,
          };
        });

        // Correct answer — stored as 1-indexed number in .ans div
        const ansText = qEl.querySelector('.ans')?.innerText?.trim() || '';
        const ansNum = parseInt(ansText);
        const correctAnswer = (!isNaN(ansNum) && ansNum >= 1 && ansNum <= 4)
          ? [OPTION_IDS[ansNum - 1]]
          : [];

        // Explanation
        const explanation = qEl.querySelector('.explanation p')?.innerText?.trim() || '';

        return {
          question_text: questionText,
          image_url: imageUrl,
          options,
          correct_answer: correctAnswer,
          explanation,
        };
      }).filter(q => q.question_text.length > 0);
    }, subject, chapterName, testNum, OPTION_IDS);

    return questions;
  } catch (err) {
    console.error(`    ✗ Error at ${url}: ${err.message}`);
    return [];
  }
}

// ─── BUILD FINAL SCHEMA OBJECT ────────────────────────────────────────────────
function buildQuestion(raw, subject, chapter, testNum) {
  const correctId = raw.correct_answer[0] || null;
  const distractor_map = {};

  // Build distractor_map for wrong options
  raw.options.forEach(opt => {
    if (opt.id !== correctId) {
      distractor_map[opt.id] = {
        error_type: 'conceptual',
        trap_description: '',
        common_mistake: '',
      };
    }
  });

  return {
    id: uuidv4(),
    question_text: raw.question_text,
    image_url: raw.image_url,
    options: raw.options,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation,
    question_type: 'mcq_single',
    subject,
    chapter,
    topic: chapter,
    difficulty: 'medium',
    source: `ScienceLesson.in — ${subject} / ${chapter} / Test ${testNum}`,
    year: null,
    tags: [subject.toLowerCase(), chapter.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
    distractor_map,
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 900 });

  let grandTotal = 0;
  const summary = [];

  for (const [subject, { prefix, chapters }] of Object.entries(CHAPTERS)) {
    const subjectDir = path.join(OUTPUT_DIR, subject);
    if (!fs.existsSync(subjectDir)) fs.mkdirSync(subjectDir, { recursive: true });

    for (const ch of chapters) {
      const chapterBaseUrl = `${BASE_URL}/${prefix}/${ch.slug}/`;
      console.log(`\n📚 [${subject}] ${ch.name}`);

      // Auto-detect test count
      const testCount = await detectTestCount(page, chapterBaseUrl);
      console.log(`   Detected ${testCount} tests`);

      const allQuestions = [];

      for (let t = 1; t <= testCount; t++) {
        const testUrl = `${BASE_URL}/${prefix}/${ch.slug}/test-${t}`;
        process.stdout.write(`   Test ${String(t).padStart(2)}: `);

        const raw = await scrapeTestPage(page, testUrl, subject, ch.name, t);

        if (raw === null) {
          console.log('(no page — stopping)');
          break;
        }

        const built = raw.map(q => buildQuestion(q, subject, ch.name, t));
        allQuestions.push(...built);
        console.log(`${built.length} questions`);

        // Polite delay (1.5s between requests)
        await new Promise(r => setTimeout(r, 1500));
      }

      // Output filename: Subject_Chapter_Name.json
      const safeName = ch.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      const fileName = `${subject}_${safeName}.json`;
      const filePath = path.join(subjectDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(allQuestions, null, 2), 'utf8');

      const entry = { subject, chapter: ch.name, file: fileName, count: allQuestions.length };
      summary.push(entry);
      grandTotal += allQuestions.length;

      console.log(`   ✅ Saved ${allQuestions.length} questions → ${fileName}`);
    }
  }

  await browser.close();

  // Write master summary
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_summary.json'),
    JSON.stringify({ total: grandTotal, files: summary }, null, 2),
    'utf8'
  );

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🎉 Scraping complete!`);
  console.log(`   Total questions : ${grandTotal}`);
  console.log(`   Output dir      : ${OUTPUT_DIR}`);
  console.log(`${'─'.repeat(60)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
