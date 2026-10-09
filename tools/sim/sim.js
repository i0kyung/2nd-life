// 병렬 시뮬레이션: play.js를 N판 돌리고 지표를 집계한다
// usage: node sim.js <gameDir> <runs> <parallel> <speed> <tag>
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const [ROOT_ARG, RUNS = 8, PAR = 4, SPEED = 12, TAG = 'sim', PERSONAS = 'random'] = process.argv.slice(2);
const ROOT = ROOT_ARG && ROOT_ARG !== '.' ? ROOT_ARG : path.resolve(__dirname, '../..');
const PLIST = PERSONAS.split(',');
const BASE = path.join(__dirname, 'runs', TAG); fs.rmSync(BASE, { recursive: true, force: true }); fs.mkdirSync(BASE, { recursive: true });

function runOne(i) {
  return new Promise(res => {
    const out = path.join(BASE, 'run' + i);
    const t0 = Date.now();
    const ch = spawn(process.execPath, [path.join(__dirname, 'play.js'), ROOT, 'index.html', String(SPEED)], { env: { ...process.env, SIM_OUT: out, BOT_PERSONA: PLIST[i % PLIST.length] } });
    ch.stdout.on('data', () => {}); ch.stderr.on('data', () => {});
    ch.on('close', () => res({ i, persona: PLIST[i % PLIST.length], out, secs: Math.round((Date.now() - t0) / 1000) }));
  });
}
(async () => {
  const queue = [...Array(Number(RUNS)).keys()], done = [];
  await Promise.all([...Array(Number(PAR))].map(async () => { while (queue.length) done.push(await runOne(queue.shift())); }));
  const rows = [], errs = {}, world = {}, finishes = { ok: 0, fail: 0 };
  for (const d of done) {
    const log = fs.existsSync(path.join(d.out, 'log.txt')) ? fs.readFileSync(path.join(d.out, 'log.txt'), 'utf8') : '';
    for (const l of log.split('\n')) if (/PAGEERROR|STUCK|CONSOLE\.error/.test(l) && !/Failed to load resource/.test(l)) errs[l.slice(0, 220)] = (errs[l.slice(0, 220)] || 0) + 1;
    if (/\[NAV\] result/.test(log)) finishes.ok++; else finishes.fail++;
    let ps = null; try { ps = JSON.parse(fs.readFileSync(path.join(d.out, 'final_players.json'), 'utf8')); } catch (e) {}
    if (!ps) continue;
    for (const p of ps) {
      const st = p.stats || {};
      rows.push({ persona: p.type==='user' ? d.persona : '(rival)', type: p.type, trait: p.aiTrait || '-', money: p.money || 0, married: !!p.isMarried, at: p.marriedAt || '-', kids: (p.children || []).length,
        allow: p.allowanceReceived || 0, talent: p.talentIncomeTotal || 0, job: p.jobName || '-', edu: p.education || '-',
        avgStat: Math.round(((st.intelligence || 0) + (st.charm || 0) + (st.health || 0) + (st.relationship || 0) + (st.luck || 0)) / 5), s100: Object.values(st).filter(v => v >= 100).length });
      for (const w of (p.worldLog || [])) world[w] = (world[w] || 0) + 1;
    }
  }
  const avg = (a, k) => a.length ? Math.round(a.reduce((s, r) => s + (typeof k === 'function' ? k(r) : r[k]), 0) / a.length) : 0;
  const pct = (a, f) => a.length ? Math.round(a.filter(f).length / a.length * 100) + '%' : '-';
  const sum = {
    runs: done.length, finishes, secsAvg: avg(done, 'secs'),
    money: { avg: avg(rows, 'money'), min: Math.min(...rows.map(r => r.money)), max: Math.max(...rows.map(r => r.money)) },
    marriedPct: pct(rows, r => r.married), kidsAvg: (rows.reduce((s, r) => s + r.kids, 0) / Math.max(1, rows.length)).toFixed(2), hasKidsPct: pct(rows, r => r.kids > 0),
    allowAvg: avg(rows, 'allow'), talentAvg: avg(rows, 'talent'), avgStat: avg(rows, 'avgStat'), stat100Avg: (rows.reduce((s, r) => s + r.s100, 0) / Math.max(1, rows.length)).toFixed(1),
    jobs: rows.reduce((m, r) => (m[r.job] = (m[r.job] || 0) + 1, m), {}),
    errors: errs, worldEventsSeen: Object.keys(world).length, world
  };
  sum.byPersona = {};
  for (const k of [...new Set(rows.map(r => r.persona))]) { const g = rows.filter(r => r.persona === k);
    sum.byPersona[k] = { n: g.length, married: pct(g, r => r.married), hasKids: pct(g, r => r.kids > 0), kidsAvg: (g.reduce((s, r) => s + r.kids, 0) / g.length).toFixed(2), money: avg(g, "money"), avgStat: avg(g, "avgStat") }; }
  fs.writeFileSync(path.join(BASE, 'summary.json'), JSON.stringify({ sum, rows }, null, 1));
  console.log(JSON.stringify(sum, null, 1));
  console.table(rows);
})();
