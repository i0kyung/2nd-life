// 시뮬레이션 결과에 결과 화면의 scoreCard를 그대로 돌려 부문별 점수 분포를 본다
const fs = require('fs'), path = require('path'), vm = require('vm');
const [RESULT, DIR] = process.argv.slice(2);
const html = fs.readFileSync(RESULT, 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx = { window: { matchMedia: () => ({ matches: false }) }, document: {}, localStorage: { getItem: () => null }, performance: { now: () => 0 }, console };
vm.createContext(ctx); vm.runInContext(code + ';this.scoreCard=scoreCard;', ctx);
const cats = {}, totals = { user: [], ai: [] }; let uw = 0, n = 0;
for (const run of fs.readdirSync(DIR)) {
  const f = path.join(DIR, run, 'final_players.json'); if (!fs.existsSync(f)) continue;
  const ps = JSON.parse(fs.readFileSync(f, 'utf8')); if (!ps) continue;
  const t = ps.map(p => { const sc = ctx.scoreCard(p); sc.forEach(c => (cats[c.name] = cats[c.name] || []).push(c.pts)); return sc.reduce((s, c) => s + c.pts, 0); });
  totals.user.push(t[0]); totals.ai.push(t[1]); n++; if (t[0] >= t[1]) uw++;
}
const st = a => ({ avg: Math.round(a.reduce((s, x) => s + x, 0) / a.length), min: Math.min(...a), max: Math.max(...a) });
console.log('부문별 점수:'); for (const k in cats) console.log(' ', k.padEnd(6), JSON.stringify(st(cats[k])));
console.log('총점 user', JSON.stringify(st(totals.user)), 'ai', JSON.stringify(st(totals.ai)), `· 사용자(무작위 봇) 승 ${uw}/${n}`);
