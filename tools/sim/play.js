// 자동 플레이 봇: index.html → result.html 까지 진행하며 오류 수집
// usage: node play.js <gameDir> [startPage] [speed]
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = process.argv[2] || path.resolve(__dirname, '../..');
const START = process.argv[3] || 'index.html';
const SPEED = Number(process.argv[4] || 8);
// 페르소나: random(무작위) · family(가정형) · career(커리어형) · balanced(균형형)
const PERSONA = process.env.BOT_PERSONA || "random";
const PERSONA_RULES = {
  family:  { plus: ["결혼","청혼","프러포즈","반지","아이","낳","둘째","정성껏","가족","데이트","고백","만나","함께","받아들","부모님","손편지","집밥","곁으로","찾아뵌","인사"], minus: ["거절","혼자","아니라고","미룬","헤어","깜빡","넘긴다","갖지 않"] },
  career:  { plus: ["공부","시험","준비","지원","야근","승진","도전","투자","창업","파고","자격증","실력","연습","프로젝트","버틴다","스터디"], minus: ["쉰다","놀","포기","미룬","대충"] },
  balanced:{ plus: ["운동","산책","정성껏","공부","함께","저축","건강","친구","준비","결혼","아이","청혼"], minus: ["밤샘","급히","영끌","올인","거절"] }
};
const OUT = process.env.SIM_OUT || path.join(__dirname, 'runs', 'out'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const PORT = server.address().port;
const log = [];
function note(kind, msg) { const s = `[${kind}] ${msg}`; log.push(s); console.log(s); }

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument((speed, rules) => {
    const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, Math.max(0, (ms || 0) / speed), ...a);
    window.alert = (m) => console.error('ALERT: ' + m);
    window.__persona = rules;
  }, SPEED, PERSONA_RULES[PERSONA] || null);
  page.on('pageerror', e => note('PAGEERROR', page.url().split('/').pop() + ' :: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') note('CONSOLE.' + m.type(), page.url().split('/').pop() + ' :: ' + m.text()); });
  page.on('requestfailed', r => note('REQFAIL', r.url()));
  page.on('response', r => { if (r.status() >= 400) note('HTTP' + r.status(), decodeURIComponent(r.url().replace(`http://localhost:${PORT}/`, ''))); });

  await page.goto(`http://localhost:${PORT}/${START}`);
  if (START === 'index.html') {
    await page.type('#nameInput', '테스트');
    await page.click('#gFemale');
    await page.click('.btn-start');
  }
  let lastUrl = '', lastSig = '', stuckSince = Date.now(), shots = {}, rolls = {};
  const t0 = Date.now();
  while (Date.now() - t0 < 30 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 120));
    let url; try { url = page.url().split('/').pop(); } catch (e) { continue; }
    if (url !== lastUrl) { note('NAV', url); lastUrl = url; stuckSince = Date.now(); }
    if (url.startsWith('result')) {
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, 'result.png') });
      const txt = await page.evaluate(() => document.body.innerText.slice(0, 1500));
      note('RESULT', txt.replace(/\n+/g, ' | '));
      break;
    }
    let r;
    try {
      r = await page.evaluate(() => {
        const vis = el => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
        const sig = (document.getElementById('actionPanel')?.innerHTML || '') + (document.getElementById('modal')?.innerHTML || '').length + (document.querySelector('.overlay.on')?.id || '');
        const tov = document.getElementById('timingOverlay');
        if (tov && tov.classList.contains('on')) { const hb = document.getElementById('holdBtn'); if (vis(hb)) return { act: 'hold', sel: '#holdBtn', sig }; return { act: 'wait', sig }; }
        const bag = document.getElementById('bagOverlay'); if (bag && bag.classList.contains('on')) { bag.classList.remove('on'); return { act: 'closebag', sig }; }
        const ovs = [...document.querySelectorAll('.overlay.on')];
        const scope = ovs.length ? ovs[ovs.length - 1] : document.getElementById('actionPanel');
        if (!scope) return { act: 'none', sig };
        const roll = scope.querySelector('#rollBtn');
        if (roll && vis(roll) && !roll.disabled) return { act: 'hold', sel: '#rollBtn', sig };
        let cands = [...scope.querySelectorAll('button,[onclick]')].filter(el => vis(el) && !el.disabled && !el.classList.contains('ai-thinking') && !el.closest('.ai-thinking') && !el.classList.contains('dim'));
        // 카드: 아직 안 뒤집혔으면 카드부터
        const cards = cands.filter(el => el.classList.contains('card'));
        if (cards.length && !scope.querySelector('.card.flip')) cands = cards;
        else cands = cands.filter(el => !el.classList.contains('card'));
        if (!cands.length) return { act: 'wait', sig };
        let el = cands[Math.floor(Math.random() * cands.length)];
        const R = window.__persona;
        if (R && Math.random() > 0.2) {   // 20%는 사람처럼 변덕을 부린다
          const score = e => { const t = e.innerText || ""; let v = Math.random() * 0.5; R.plus.forEach(k => { if (t.includes(k)) v += 1; }); R.minus.forEach(k => { if (t.includes(k)) v -= 1.2; }); return v; };
          el = cands.reduce((b, e) => score(e) > score(b) ? e : b, cands[0]);
        }
        el.setAttribute('data-bot', '1');
        return { act: 'click', label: (el.innerText || el.className).slice(0, 40).replace(/\n/g, ' '), sig };
      });
    } catch (e) { continue; }
    if (r.sig !== lastSig) { lastSig = r.sig; stuckSince = Date.now(); }
    if (!process.env.SIM_OUT && !shots[url] && Date.now() - stuckSince > 300) {
      shots[url] = 1; await page.screenshot({ path: path.join(OUT, url.replace('.html', '') + '.png') });
    }
    if (Date.now() - stuckSince > 15000) {
      const dump = await page.evaluate(() => ({ ap: document.getElementById('actionPanel')?.innerHTML.slice(0, 600), ov: [...document.querySelectorAll('.overlay.on')].map(o => o.id + ':' + o.innerHTML.slice(0, 600)) }));
      note('STUCK', url + ' ' + JSON.stringify(dump));
      await page.screenshot({ path: path.join(OUT, 'stuck_' + url.replace('.html', '') + '.png') });
      break;
    }
    try {
      if (!process.env.SIM_OUT && r.act === 'hold' && r.sel === '#rollBtn') {
        rolls[url] = (rolls[url] || 0) + 1;
        if (rolls[url] === 3) await page.screenshot({ path: path.join(OUT, 'roll_' + url.replace('.html', '') + '.png') });
      }
      if (r.act === 'hold') {
        const el = await page.$(r.sel); const box = el && await el.boundingBox();
        if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await new Promise(z => setTimeout(z, 200 + Math.random() * 500)); await page.mouse.up(); }
      } else if (r.act === 'click') {
        await page.evaluate(() => { const el = document.querySelector('[data-bot="1"]'); if (el) { el.removeAttribute('data-bot'); el.click(); } });
      }
    } catch (e) { note('BOTERR', e.message); }
  }
  const state = await page.evaluate(() => localStorage.getItem('secondLife_players')).catch(() => null);
  fs.writeFileSync(path.join(OUT, 'final_players.json'), state || 'null');
  fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
  await browser.close(); server.close();
})();
