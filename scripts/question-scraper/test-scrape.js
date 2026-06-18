/**
 * test-scrape.js — Verify scraper on 1 test page before full run
 */
const puppeteer = require('puppeteer');

const TEST_URL = 'https://sciencelesson.in/NEET-Mock-Test/biology-chapter-wise-question/The-Living-World/test-1';

async function testScrape() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  console.log('Loading:', TEST_URL);
  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // 1. Check window-level quiz data variables
  const windowVars = await page.evaluate(() => {
    const possible = ['quizData', 'questions', 'testData', 'examData', 'questionsData', 'quizQuestions'];
    const found = {};
    for (const v of possible) {
      if (window[v]) found[v] = typeof window[v];
    }
    return found;
  });
  console.log('\n[1] Window vars found:', windowVars);

  // 2. Check all CSS classes on the page that might be question containers
  const classes = await page.evaluate(() => {
    const all = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => {
        if (c.includes('quest') || c.includes('opt') || c.includes('answer') || c.includes('quiz') || c.includes('choice')) {
          all.add(c);
        }
      });
    });
    return [...all];
  });
  console.log('\n[2] Relevant CSS classes:', classes);

  // 3. Try to find question containers by class/structure
  const domData = await page.evaluate(() => {
    // Dump top-level HTML structure
    const main = document.querySelector('main, #main, .main-content, .content, article');
    return main ? main.innerHTML.substring(0, 3000) : document.body.innerHTML.substring(0, 3000);
  });
  console.log('\n[3] Main content HTML (first 3000 chars):\n', domData);

  // 4. Check for inline JSON in script tags
  const scriptData = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts.map(s => s.textContent.trim().substring(0, 200)).filter(t => t.length > 30);
  });
  console.log('\n[4] Inline scripts (first 200 chars each):');
  scriptData.forEach((s, i) => console.log(`  Script ${i + 1}:`, s));

  await browser.close();
}

testScrape().catch(console.error);
