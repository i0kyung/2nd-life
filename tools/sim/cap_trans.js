// 시대 전환 캡처: 각 시대 화면 진입 카드 + 다음 시대로 넘어가는 성장 연출
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = process.argv[2] || path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'runs', 'captrans'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const PORT = server.address().port; const sleep = ms => new Promise(r => setTimeout(r, ms));
const ST = ['child', 'elementary', 'middle', 'high', 'youth', 'adult', 'senior'];
const NEXT = ['stage_elementary.html', 'stage_middle.html', 'stage_high.html', 'stage_youth.html', 'stage_adult.html', 'stage_senior.html', 'result.html'];
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.type('#nameInput', '테스트'); await page.click('#gFemale'); await page.click('.btn-start');
  await page.waitForNavigation(); await sleep(300);
  const save = await page.evaluate(() => localStorage.getItem('secondLife_players'));
  for (let i = 0; i < ST.length; i++) {
    const ps = JSON.parse(save); ps.forEach(p => { p.stageDone = {}; ST.slice(0, i).forEach(k => p.stageDone[k] = true); p.job = p.job || null; }); await page.evaluate(s => localStorage.setItem('secondLife_players', s), JSON.stringify(ps));
    await page.goto(`http://localhost:${PORT}/stage_${ST[i]}.html`);
    await sleep(650); console.log(ST[i], await page.evaluate(() => location.pathname + " " + STAGE_KEY + " " + (document.querySelector(".fx-enter b")||{}).textContent)); await page.screenshot({ path: path.join(OUT, `${i}_${ST[i]}_enter.png`) });
    await sleep(1800);
    await page.evaluate(n => { const g = window.goNextStage; window.location.assign = () => {}; try { g(n); } catch (e) { console.log(e.message); } }, NEXT[i]);
    await sleep(1300); await page.screenshot({ path: path.join(OUT, `${i}_${ST[i]}_grow.png`) });
    await sleep(2500);
  }
  await browser.close(); server.close();
})();
