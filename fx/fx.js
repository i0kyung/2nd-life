/* ============================================================
   「제2의 인생」 공통 연출 레이어 — fx.js
   각 시대 HTML의 게임 스크립트 "뒤에" 로드한다.
   게임 로직은 건드리지 않고, 이미 있는 함수(movePiece, showSceneMsg,
   flashMini, showRoundSummary, goNextStage …)를 감싸서 연출만 덧입힌다.
   함수가 없는 화면(시작·결과)에서는 해당 연출만 조용히 건너뛴다.
   ============================================================ */
(function(){
  "use strict";
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FX = window.FX = { lastVerdict:null };
  const $ = (id)=>document.getElementById(id);
  const wait = (ms)=>new Promise(r=>setTimeout(r, REDUCED ? Math.min(ms,120) : ms));

  /* 전역 함수 감싸기. 인라인 onclick도 전역 이름을 호출 시점에 찾으므로 함께 바뀐다. */
  function wrap(name, make){
    const orig = window[name];
    if(typeof orig !== "function") return false;
    window[name] = make(orig);
    return true;
  }
  const players_ = ()=> (typeof players!=="undefined" && players) ? players : null;
  const userOf = ()=> { const ps=players_(); return ps ? ps[0] : null; };
  function charOf(p){ try{ return (typeof getChar==="function") ? getChar(p) : null; }catch(e){ return null; } }

  /* ── 시대별 테마: 배경 사진 · 색 · 날리는 것 · 소품 ──
     넘어갈 때(growTransition)와 새 화면에 들어올 때(enter)가 같은 테마를 쓴다. */
  const THEME = {
    child:      {bg:"child",      c1:"#FFE3A3", c2:"#FFB8C6", dark:false, motion:"rise",    parts:["🎈","🫧","🧸","🎈"],          prop:"balloon", chip:"🧸 유년기",   place:"새봄시 바닷가 마을"},
    elementary: {bg:"elementary", c1:"#FFD6E7", c2:"#FFF1B8", dark:false, motion:"fall",    parts:["🌸","🌸","💮","🌸"],          prop:"bell",    chip:"🎒 초등학생", place:"새봄초등학교 입학식"},
    middle:     {bg:"middle",     c1:"#B9F0E4", c2:"#BFD8FF", dark:false, motion:"fly",     parts:["✈️","📄","✈️","📝"],          prop:"books",   chip:"📚 중학생",   place:"새봄중학교 첫 교복"},
    high:       {bg:"high",       c1:"#1D2A5C", c2:"#4B3C8F", dark:true,  motion:"twinkle", parts:["⭐","✨","⭐","·"],           prop:"moon",    chip:"✏️ 고등학생", place:"새봄고 야간자율학습"},
    youth:      {bg:"youth",      c1:"#9FD3FF", c2:"#FFE08A", dark:false, motion:"toss",    parts:["🎓","🎉","🎊","🎓"],          prop:"caps",    chip:"🎓 청년기",   place:"스무 살, 새봄시 한복판"},
    adult:      {bg:"adult",      c1:"#FF9F7A", c2:"#6A5ACD", dark:true,  motion:"twinkle", parts:["✨","·","✨","·"],           prop:"skyline", chip:"🏙️ 성인기",   place:"새봄신도시의 불빛"},
    senior:     {bg:"senior",     c1:"#FFB067", c2:"#C8553D", dark:true,  motion:"fall",    parts:["🍂","🍁","🍂","🍃"],          prop:"sunset",  chip:"🍂 노년기",   place:"강변공원의 노을"},
    result:     {bg:"result",     c1:"#20123F", c2:"#3E2A7A", dark:true,  motion:"twinkle", parts:["⭐","✨","🌟","·"],          prop:"comet",   chip:"🌌 인생 정산", place:"여든 해의 별자리"}
  };
  function themeParts(t, n){
    let h="";
    for(let i=0;i<n;i++){
      const x=Math.random()*100, d=(t.motion==="twinkle"?1.6:2.4)+Math.random()*1.8, dl=-Math.random()*d, s=14+Math.random()*(t.motion==="twinkle"?14:22);
      const y=t.motion==="twinkle"?Math.random()*85:0, dx=(Math.random()*2-1)*120;
      h+=`<span class="pt m-${t.motion}" style="left:${x}%;top:${t.motion==="twinkle"?y+"%":""};font-size:${s.toFixed(0)}px;--d:${d.toFixed(2)}s;--dl:${dl.toFixed(2)}s;--dx:${dx.toFixed(0)}px">${t.parts[i%t.parts.length]}</span>`;
    }
    return h;
  }
  function themeProp(t){
    switch(t.prop){
      case "balloon": return `<div class="prop p-balloon"><span>🎈</span><span>🎈</span><span>🎈</span></div>`;
      case "bell":    return `<div class="prop p-bell">🔔</div><div class="prop p-school">🏫</div>`;
      case "books":   return `<div class="prop p-books"><span>📕</span><span>📗</span><span>📘</span></div>`;
      case "moon":    return `<div class="prop p-moon">🌙</div><div class="prop p-dday">수능 D-1000</div>`;
      case "caps":    return `<div class="prop p-caps"><span>🎓</span><span>🎓</span><span>🎓</span></div>`;
      case "skyline": { let b=""; [38,62,46,80,54,70,42,88,58,48].forEach((h,i)=>{ b+=`<i style="height:${h}%;animation-delay:${(i*0.06).toFixed(2)}s"><u style="animation-delay:${(0.7+i*0.08).toFixed(2)}s"></u></i>`; }); return `<div class="prop p-sky">${b}</div>`; }
      case "sunset":  return `<div class="prop p-sun"></div>`;
      case "comet":   return `<div class="prop p-comet">🌠</div>`;
    }
    return "";
  }
  function themeLayers(t, n){
    return `<div class="gbg" style="background-image:url('./image/bg/${t.bg}.png')"></div>
      <div class="gtint" style="--c1:${t.c1};--c2:${t.c2}"></div>
      <div class="gpart">${themeParts(t, n)}</div>${themeProp(t)}`;
  }

  /* ── 화면 진입: 이 시대의 하늘이 걷히며 무대가 드러난다 ── */
  function enter(){
    if(document.querySelector(".fx-enter")) return;
    const key=(typeof STAGE_KEY!=="undefined")?STAGE_KEY:null, t=THEME[key];
    const el=document.createElement("div"); el.className="fx-enter"+(t&&!REDUCED?" themed"+(t.dark?" dark":""):"");
    if(t && !REDUCED) el.innerHTML=themeLayers(t, 14)+`<div class="ecard"><span>${t.chip}</span><b>${t.place}</b></div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), t&&!REDUCED ? 2000 : 900);
  }

  /* ── 주사위 ── */
  const PIPS = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  function setPips(d, n){ d.querySelectorAll("i").forEach((el,i)=>el.classList.toggle("on", PIPS[n].includes(i))); }
  function rollDice(steps, isAi){
    const host=$("stageBox");
    if(!host || REDUCED) return Promise.resolve();
    const wrapEl=document.createElement("div"); wrapEl.className="fx-dice-wrap";
    const d=document.createElement("div"); d.className="fx-dice"+(isAi?" ai":"");
    d.innerHTML="<i></i>".repeat(9); wrapEl.appendChild(d); host.appendChild(wrapEl);
    let n=1; setPips(d,1);
    const spin=setInterval(()=>{ n=(n%6)+1; setPips(d,n); }, 70);
    return wait(isAi?480:680).then(()=>{
      clearInterval(spin); setPips(d, Math.max(1,Math.min(6,steps)));
      d.classList.add("landed");
      if(!isAi && FX.lastVerdict==="perfect") d.classList.add("gold");
      const num=document.createElement("div"); num.className="fx-dice-num"; num.textContent="+"+steps+"칸";
      wrapEl.appendChild(num);
      return wait(isAi?420:620);
    }).then(()=>{
      wrapEl.classList.add("out");
      setTimeout(()=>wrapEl.remove(), 240);
    });
  }
  wrap("doUserDice", orig=>function(v){ FX.lastVerdict = v && v.key || null; return orig.apply(this, arguments); });
  // movePiece는 시대마다 시그니처가 두 가지다: (p, kind, steps, done) / (p, steps, cb)
  wrap("movePiece", orig=>function(p){
    const args=arguments, self=this;
    const steps = (typeof args[1]==="string") ? args[2] : args[1];
    const isAi = p && p.type!=="user";
    rollDice(steps, isAi).then(()=>orig.apply(self, args));
  });

  /* ── 차례 대기: 빈 무대 대신 차례인 사람이 무대에 서서 기다린다 ── */
  function standOnStage(p, isUser){
    try{
      if(typeof showSceneMsg!=="function" || typeof avaImg!=="function" || !p) return;
      const left=(typeof TOTAL_ROUNDS!=="undefined"&&typeof round!=="undefined")? Math.max(0,TOTAL_ROUNDS-round+1) : 0;
      showSceneMsg(`<div class="hero-ava">${avaImg(p)}</div>`,
        isUser ? "🎲 내 차례" : `🌸 ${p.name}의 차례`,
        isUser ? "오늘은 어떤 하루가 될까요?" : `${p.name}${typeof jo==="function"?jo(p.name,"이가"):"이"} 주사위를 만지작거려요`,
        isUser ? (left?`이 시대 주사위 ${left}번 남았어요`:"오늘은 어떤 칸에 멈출까요?") : "어디에 멈출지 지켜봐요");
      const tc=$("turnCount"); if(tc) tc.textContent="";
    }catch(e){}
  }
  wrap("showUserRoll", orig=>function(p){ const r=orig.apply(this, arguments); standOnStage(p||userOf(), true); return r; });
  wrap("showAiRoll", orig=>function(p){ const r=orig.apply(this, arguments); const ps=players_(); standOnStage(p||(ps&&ps[1]), false); return r; });

  /* ── 말: 캐릭터 얼굴 + 발자국 ── */
  const lastCell = {};
  function tokenImage(p){
    const c=charOf(p);
    if(c && c.tokenImage) return c.tokenImage;
    if(typeof stageFace==="function") return stageFace(p.gender,"happy");
    return null;
  }
  wrap("placeToken", orig=>function(p){
    const r=orig.apply(this, arguments);
    try{
      const tok=$("tok_"+p.id);
      if(tok){
        const src=tokenImage(p);
        if(src && !tok.querySelector("img")){
          const fb=tok.textContent;
          tok.classList.add("fx-face");
          tok.innerHTML="";
          const img=new Image(); img.alt=""; img.src=src;
          img.onerror=()=>{ tok.classList.remove("fx-face"); tok.textContent=fb; };
          tok.appendChild(img);
        }
        // 칸이 바뀌었으면 지난 칸에 발자국을 남긴다
        const prev=lastCell[p.id];
        if(typeof prev==="number" && prev!==p.childPos && !REDUCED){
          const pc=$("cell"+prev);
          if(pc){
            const rc=pc.getBoundingClientRect();
            const f=document.createElement("div"); f.className="fx-foot"; f.textContent="👣";
            f.style.left=(rc.left+rc.width/2)+"px"; f.style.top=(rc.top+rc.height/2)+"px";
            document.body.appendChild(f); setTimeout(()=>f.remove(), 950);
          }
        }
        lastCell[p.id]=p.childPos;
      }
    }catch(e){}
    return r;
  });

  /* ── 칸 → 무대 와이프 ── */
  let lastChip=null;
  wrap("showSceneMsg", orig=>function(body, chip){
    const r=orig.apply(this, arguments);
    try{
      const sc=$("scene");
      if(sc && chip!==lastChip && !REDUCED){
        sc.classList.remove("fx-wipe"); void sc.offsetWidth; sc.classList.add("fx-wipe");
        const ico=$("sceneIco"); if(ico){ ico.classList.remove("fx-ico"); void ico.offsetWidth; ico.classList.add("fx-ico"); }
        setTimeout(()=>sc.classList.remove("fx-wipe"), 560);
      }
      lastChip=chip;
    }catch(e){}
    return r;
  });
  // 턴이 넘어가면 다음 장면은 항상 새로 열리게
  wrap("nextTurn", orig=>function(){ lastChip=null; return orig.apply(this, arguments); });

  /* ── 선택 결과: 스탯 조각이 게이지로 날아간다 + 등급 변화 배지 ── */
  const STAT_SHORT={intelligence:"지능",charm:"매력",health:"건강",relationship:"관계",luck:"운"};
  function gradeOf(v){ return (typeof statGrade==="function") ? statGrade(v) : ""; }
  wrap("flashMini", orig=>function(p, applied){
    const self=this, args=arguments;
    const keys=Object.keys(applied||{}).filter(k=>applied[k] && STAT_SHORT[k]);
    // 이전 등급은 아직 화면에 그려져 있는 값에서 읽는다 (곧 renderRival이 새로 그린다)
    const before={};
    keys.forEach(k=>{ const b=document.querySelector("#sm_"+p.id+"_"+k+" b"); if(b) before[k]=b.textContent; });
    if(REDUCED || !keys.length) return orig.apply(self,args);
    const src=$("scene"); const sr=(src && src.style.display!=="none" ? src : ($("stageBox")||document.body)).getBoundingClientRect();
    keys.forEach((k,i)=>{
      const target=document.getElementById("sm_"+p.id+"_"+k);
      if(!target) return;
      const tr=target.getBoundingClientRect();
      const chip=document.createElement("div");
      const up=applied[k]>0;
      chip.className="fx-fly "+(up?"up":"down");
      chip.innerHTML=((typeof STAT_ICO!=="undefined" && STAT_ICO[k])||"")+STAT_SHORT[k]+" "+(up?"+":"")+applied[k];
      document.body.appendChild(chip);
      const sx=sr.left+sr.width/2-40+(i-(keys.length-1)/2)*70, sy=sr.top+sr.height*0.42;
      const ex=tr.left+tr.width/2-30, ey=tr.top+tr.height/2-12;
      chip.style.left="0px"; chip.style.top="0px";
      const midX=(sx+ex)/2, midY=Math.min(sy,ey)-70;
      const anim=chip.animate([
        {transform:`translate(${sx}px,${sy}px) scale(.6)`, opacity:0},
        {transform:`translate(${sx}px,${sy-14}px) scale(1.05)`, opacity:1, offset:.18},
        {transform:`translate(${midX}px,${midY}px) scale(1)`, opacity:1, offset:.6},
        {transform:`translate(${ex}px,${ey}px) scale(.55)`, opacity:.2}
      ], {duration:820, delay:i*110, easing:"cubic-bezier(.5,0,.3,1)", fill:"both"});
      anim.onfinish=()=>chip.remove();
    });
    // 날아가 닿는 순간 게이지가 반짝이고, 등급이 바뀌었으면 배지를 띄운다
    setTimeout(()=>{
      orig.apply(self,args);
      keys.forEach(k=>{
        const el=document.getElementById("sm_"+p.id+"_"+k); if(!el) return;
        const now=gradeOf(p.stats[k]);
        if(before[k] && now && before[k]!==now){
          const order="FEDCBAS"; const up=order.indexOf(now)>order.indexOf(before[k]);
          const b=document.createElement("span"); b.className="fx-grade-pop"+(up?"":" down");
          b.textContent=before[k]+" → "+now+(up?"!":"");
          el.appendChild(b); setTimeout(()=>b.remove(), 1650);
        }
      });
    }, 760 + (keys.length-1)*110);
  });

  /* ── 상대 차례: 커서가 선택지 위를 오가다 하나를 콕 ── */
  let cursor=null, cursorTimer=null;
  function cursorEl(){ if(!cursor){ cursor=document.createElement("div"); cursor.className="fx-cursor"; cursor.textContent="👆"; cursor.style.display="none"; document.body.appendChild(cursor); } return cursor; }
  function moveCursorTo(btn){
    const c=cursorEl(); const r=btn.getBoundingClientRect();
    c.style.display="block"; c.style.left=(r.left+r.width*0.62)+"px"; c.style.top=(r.top+r.height*0.55)+"px";
    document.querySelectorAll(".act-btn.fx-hover").forEach(b=>b.classList.remove("fx-hover")); btn.classList.add("fx-hover");
  }
  function hideCursor(){ if(cursor) cursor.style.display="none"; clearInterval(cursorTimer); cursorTimer=null; }
  function watchPanel(){
    const ap=$("actionPanel"); if(!ap || REDUCED) return;
    new MutationObserver(()=>{
      const thinking=[...ap.querySelectorAll(".act-btn.ai-thinking")];
      const picked=ap.querySelector(".act-btn.ai-picked");
      if(!thinking.length){ hideCursor(); return; }
      if(picked){
        clearInterval(cursorTimer); cursorTimer=null;
        moveCursorTo(picked);
        const c=cursorEl(); c.classList.remove("tap"); void c.offsetWidth; c.classList.add("tap");
        setTimeout(hideCursor, 650);
        return;
      }
      if(cursorTimer) return;
      let i=0; moveCursorTo(thinking[0]);
      cursorTimer=setInterval(()=>{ const t=[...ap.querySelectorAll(".act-btn.ai-thinking:not(.ai-picked)")]; if(!t.length){ hideCursor(); return; } i=(i+1+Math.floor(Math.random()*2))%t.length; moveCursorTo(t[i]); }, 330);
    }).observe(ap,{childList:true,subtree:true});
  }

  /* ── 라운드 전환: 해가 지고 달이 뜬다 ── */
  function skySweep(text){
    if(REDUCED) return Promise.resolve();
    const s=document.createElement("div"); s.className="fx-sky";
    let stars=""; for(let i=0;i<14;i++) stars+=`<span class="star" style="left:${Math.random()*100}%;top:${Math.random()*45}%;animation-delay:${(Math.random()*0.15).toFixed(2)}s">✦</span>`;
    s.innerHTML=`${stars}<span class="sun">☀️</span><span class="moon">🌙</span><span class="txt">${text}</span>`;
    document.body.appendChild(s);
    return wait(1150).then(()=>{ setTimeout(()=>s.remove(), 200); });
  }
  const LATE = ["youth","adult","senior"];
  wrap("showRoundSummary", orig=>function(){
    const self=this, args=arguments;
    const key=(typeof STAGE_KEY!=="undefined")?STAGE_KEY:"";
    skySweep(LATE.includes(key) ? "한 해가 지나가요" : "하루가 저물어요").then(()=>orig.apply(self,args));
  });
  // 라운드 숫자가 굴러 올라간다
  function watchRound(){
    const rl=$("roundLabel"); if(!rl) return;
    let last=rl.textContent;
    new MutationObserver(()=>{ if(rl.textContent!==last){ last=rl.textContent; rl.classList.remove("fx-roll"); void rl.offsetWidth; rl.classList.add("fx-roll"); } }).observe(rl,{childList:true,characterData:true,subtree:true});
  }

  /* ── 시대 전환: 성장 연출 ── */
  const NEXT_OF = {
    "stage_elementary.html":{key:"elementary", age:[7,8],   label:"초등학생이 되었어요"},
    "stage_middle.html":    {key:"middle",     age:[13,14], label:"중학생이 되었어요"},
    "stage_high.html":      {key:"high",       age:[16,17], label:"고등학생이 되었어요"},
    "stage_youth.html":     {key:"youth",      age:[19,20], label:"스무 살, 어른이 되었어요"},
    "stage_adult.html":     {key:"adult",      age:[29,30], label:"서른 살이 되었어요"},
    "stage_senior.html":    {key:"senior",     age:[59,60], label:"예순, 인생 2막이에요"},
    "result.html":          {key:"result",     age:[80,80], label:"여든 해의 여정이 끝났어요"}
  };
  function avatarFor(p, key){
    const g=p.gender==="female"?"female":"male";
    const c=charOf(p);
    switch(key){
      case "child":      return "./image/user/base/child_"+g+".png";
      case "elementary": return "./image/user/base/elementary_"+g+".png";
      case "middle":     return c&&c.middleBaseImage || "./image/user/base/elementary_"+g+".png";
      case "high":       return c&&c.highBaseImage || "./image/user/"+g+"/1/high.png";
      case "youth":      return (c&&c.adultBaseImage||"./image/user/"+g+"/1/adult.png").replace("/adult.png","/youth.png");
      case "adult":      return c&&c.adultBaseImage || "./image/user/"+g+"/1/adult.png";
      default:           return (c&&c.adultBaseImage||"./image/user/"+g+"/1/adult.png").replace("/adult.png","/senior.png");
    }
  }
  function growTransition(file){
    const info=NEXT_OF[file]; const u=userOf();
    if(!info || !u || REDUCED) return Promise.resolve();
    const curKey=(typeof STAGE_KEY!=="undefined")?STAGE_KEY:"child";
    const oldSrc=avatarFor(u, curKey), newSrc=avatarFor(u, info.key==="result"?"senior":info.key);
    const t=THEME[info.key];
    const el=document.createElement("div"); el.className="fx-grow themed"+(t&&t.dark?" dark":"");
    let sparks=""; for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; sparks+=`<span class="spark" style="left:50%;top:45%;--dx:${Math.cos(a)*170}px;--dy:${Math.sin(a)*170}px;animation-delay:${(0.75+Math.random()*0.2).toFixed(2)}s">${["✨","⭐","💫"][i%3]}</span>`; }
    el.innerHTML=(t?themeLayers(t, 26):"")+`<div class="gmain"><div class="stagebox"><div class="halo"></div>${sparks}
        <img class="old" src="${oldSrc}" alt="">
        <img class="new" src="${newSrc}" alt="">
      </div>
      <div class="age">${t?`<em>${t.chip}</em>`:""}<b id="fxAge">${info.age[0]}살</b><span>${info.label}</span>${t?`<small>${t.place}</small>`:""}</div></div>
      <div class="flash"></div>`;
    el.querySelectorAll("img").forEach(img=>img.onerror=()=>img.remove());
    document.body.appendChild(el);
    // 나이 숫자가 한 살 굴러 올라간다
    setTimeout(()=>{ const a=$("fxAge"); if(a){ a.textContent=info.age[1]+"살"; a.animate([{transform:"translateY(-30%)",opacity:0},{transform:"none",opacity:1}],{duration:420,easing:"cubic-bezier(.2,1.4,.4,1)"}); } }, 1050);
    return wait(2900);
  }
  wrap("goNextStage", orig=>{
    let going=false;
    return function(file){
      if(going) return; going=true;
      const self=this, args=arguments;
      const ov=$("modalOverlay"); if(ov) ov.classList.remove("on");
      growTransition(file).then(()=>orig.apply(self,args));
    };
  });

  /* ── 시작 ── */
  function boot(){ enter(); watchPanel(); watchRound(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
