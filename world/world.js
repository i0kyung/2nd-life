/* ============================================================
   「제2의 인생」 세계관 확장 — world.js
   무대: 새봄시. 새봄초 · 옥순상회 · 강변공원 · 별빛도서관이 있는 바닷가 도시.

   1) 인연 연작   — 단짝 도담 · 은사 한결 선생님 · 이웃 옥순 할머니.
                    유년기에서 노년까지 이어지고, 앞의 선택(인연 점수)이 뒤의 이야기를 바꾼다.
   2) 시대 시나리오 — 그 시대에만 일어나는 사건. 일부는 운에 거는 승부 선택.
   3) 새봄일보     — 4라운드마다 시대 뉴스가 두 사람 모두를 흔든다.

   각 시대 HTML의 게임 스크립트 뒤, fx.js 앞에 로드한다.
   기존 함수(sceneCell / applyChoiceResult / startNextRound)를 감싸서 끼워 넣는다.
   ============================================================ */
(function(){
  "use strict";
  if(typeof STAGE_KEY==="undefined") return;
  const W = window.WORLD = {};
  const $ = (id)=>document.getElementById(id);
  const has = (name)=>typeof window[name]==="function";
  const r01 = ()=>Math.random();

  /* ── 인연 상태 ── */
  const BOND_INFO = {
    dodam:   { name:"도담",         role:"단짝 친구",  ico:{child:"🧒",elementary:"🧒",middle:"🧑",high:"🧑‍🎓",youth:"🧑‍💼",adult:"🧑",senior:"🧓"} },
    teacher: { name:"한결 선생님",  role:"은사",       ico:{child:"👨‍🏫",elementary:"👨‍🏫",middle:"👨‍🏫",high:"👨‍🏫",youth:"👨‍🏫",adult:"👴",senior:"👴"} },
    granny:  { name:"옥순 할머니",  role:"옥순상회 이웃", ico:{child:"👵",elementary:"👵",middle:"👵",high:"👵",youth:"👵",adult:"🕯️",senior:"🕯️"} }
  };
  function ensure(p){
    if(!p.bonds) p.bonds={dodam:0,teacher:0,granny:0};
    if(!p.worldSeen) p.worldSeen={};
    if(!p.worldLog) p.worldLog=[];
    if(!p.bondNotes) p.bondNotes={};
    return p;
  }
  const bond = (p,k)=>ensure(p).bonds[k]||0;
  function addBond(p,k,v){ ensure(p); p.bonds[k]=Math.max(-10,Math.min(20,(p.bonds[k]||0)+v)); }
  function npcIco(k){ return (BOND_INFO[k].ico[STAGE_KEY]||"🙂"); }

  /* ── 시나리오 데이터 ──
     choice 확장 필드:
       bond:{dodam:+3}          인연 점수
       flags:["a","b"]          여러 flag
       gamble:{chance:(p)=>0.5, win:{money,eff,res}, lose:{money,eff,res}}   운에 거는 선택
       child:{invest,cost}      자녀를 맞이한다 (성인기)
       note:"…"                 인연 수첩에 남길 한 줄
     scene 필드: id, npc(인연 키), cond(p), w(가중치) */
  const S = {};

  S.child = [
    {id:"dodam_meet", npc:"dodam", chip:"🧒 모래밭의 도담", say:"강변공원 모래밭에서 혼자 성을 쌓던 아이가 고개를 들어요. \"너도 같이 할래?\"", sub:"이 아이의 이름은 도담이에요.", mood:"happy",
      choices:[{text:"삽을 나눠준다",ai:"🪣",eff:{relationship:3,charm:1},bond:{dodam:3},note:"모래밭에서 삽을 나눠 쓰며 처음 만났다",res:"도담이 활짝 웃었어요. 둘의 첫 성이 완성됐어요."},
               {text:"누가 더 높이 쌓나 시합",ai:"🏰",eff:{health:2,charm:2},bond:{dodam:2},note:"모래성 높이 시합으로 친해졌다",res:"둘 다 이겼다고 우겼어요."},
               {text:"내 성만 쌓는다",ai:"🙈",eff:{intelligence:2},bond:{dodam:0},res:"도담은 조금 아쉬운 얼굴로 돌아갔어요."}]},
    {id:"granny_candy", npc:"granny", chip:"👵 옥순상회의 눈깔사탕", say:"골목 끝 옥순상회. 할머니가 손바닥에 알록달록 사탕을 올려줘요.", sub:"\"우리 강아지, 많이 컸네.\"", mood:"happy",
      choices:[{text:"배꼽 인사를 한다",ai:"🙇",eff:{relationship:3,charm:1},bond:{granny:3},note:"사탕을 받고 배꼽 인사를 했다",res:"할머니가 하나 더 쥐여줬어요."},
               {text:"두 개 달라고 조른다",ai:"🍬",eff:{charm:2,luck:1},bond:{granny:1},res:"할머니가 껄껄 웃으며 하나 더 줬어요."},
               {text:"부끄러워 숨는다",ai:"😳",eff:{intelligence:1},bond:{granny:1},res:"할머니가 사탕을 문 앞에 두고 가셨어요."}]},
    {id:"child_move", chip:"📦 이사 가는 날", say:"아빠 회사 때문에 새봄시 반대편 동네로 이사를 가요.", sub:"정든 골목을 떠나요. 어떻게 할까요?", mood:"worried",
      choices:[{text:"친구들에게 편지를 쓴다",ai:"✉️",eff:{relationship:3,intelligence:1},bond:{dodam:2},res:"\"꼭 놀러 와!\" 도담이 답장을 보냈어요."},
               {text:"새 동네를 탐험한다",ai:"🧭",eff:{health:2,luck:2},res:"새 놀이터를 세 개나 찾았어요."},
               {text:"가기 싫다고 운다",ai:"😭",eff:{relationship:1,charm:-1},res:"엄마가 꼭 안아줬어요."}]},
    {id:"child_library", chip:"📚 별빛도서관 동화 구연", say:"별빛도서관에서 동화 구연 대회가 열려요.", sub:"무대에 서 볼까요?", mood:"worried",
      choices:[{text:"씩씩하게 나간다",ai:"🎤",eff:{charm:4,health:-1},flags:["goodAtPresentation"],res:"박수 소리가 아직도 귀에 남아요."},
               {text:"맨 앞에서 듣는다",ai:"👂",eff:{intelligence:3},flags:["readingHabit"],res:"집에 와서 똑같이 따라 했어요."},
               {text:"그림 그리며 기다린다",ai:"🖍️",eff:{charm:2,intelligence:1},flags:["likesDrawing"],res:"주인공 얼굴을 그렸어요."}]}
  ];

  S.elementary = [
    {id:"dodam_fight", npc:"dodam", chip:"🧒 도담과의 첫 싸움", say:"딱지치기에서 도담이 반칙을 했다고 우겨요. 반 아이들이 다 쳐다봐요.", sub:"어떻게 할까요?", mood:"sad",
      choices:[{text:"먼저 손을 내민다",ai:"🤝",eff:{relationship:3,charm:-1},bond:{dodam:3},note:"첫 싸움에서 먼저 사과했다",res:"다음 날 도담이 제일 아끼는 딱지를 줬어요."},
               {text:"끝까지 버틴다",ai:"😤",eff:{charm:2},bond:{dodam:-2},res:"일주일 동안 말을 안 했어요."},
               {text:"선생님께 이른다",ai:"🙋",eff:{intelligence:2},bond:{dodam:-1,teacher:1},res:"한결 선생님이 둘을 화해시켰어요."}]},
    {id:"teacher_homework", npc:"teacher", chip:"👨‍🏫 한결 선생님의 일기 검사", say:"담임 한결 선생님은 일기에 꼭 한 줄씩 답장을 써 주세요.", sub:"오늘 일기는 어떻게 쓸까요?",
      choices:[{text:"솔직한 고민을 쓴다",ai:"📓",eff:{intelligence:2,relationship:2},bond:{teacher:3},flags:["diary"],note:"일기에 고민을 털어놓았고 선생님이 답장해 줬다",res:"\"너는 생각이 깊은 아이구나.\" 빨간 글씨가 반가웠어요."},
               {text:"하루 일과만 쓴다",ai:"🕘",eff:{intelligence:1},bond:{teacher:1},res:"참 잘했어요 도장을 받았어요."},
               {text:"전날 걸 베낀다",ai:"🙊",eff:{luck:1,intelligence:-1},bond:{teacher:-2},res:"\"어제랑 똑같네?\" 들켰어요."}]},
    {id:"granny_errand", npc:"granny", chip:"👵 옥순상회 심부름", say:"할머니 허리가 아프시대요. 무거운 박스를 가게 안으로 옮겨야 해요.", sub:"어떻게 할까요?",
      choices:[{text:"끝까지 도와드린다",ai:"📦",eff:{health:1,relationship:3},bond:{granny:3},note:"허리 아픈 할머니 대신 박스를 옮겼다",res:"할머니가 \"우리 가게 단골 1호\"라고 불러주셨어요."},
               {text:"친구들을 불러온다",ai:"📣",eff:{relationship:4,charm:1},bond:{granny:2,dodam:1},res:"도담까지 달려와 금방 끝났어요."},
               {text:"학원 늦었다며 지나간다",ai:"🏃",eff:{intelligence:1},bond:{granny:-1},res:"뒤돌아보니 할머니가 혼자 박스를 끌고 계셨어요."}]},
    {id:"elem_transfer", chip:"🧳 전학 온 아이", say:"서울에서 전학 온 아이가 아무와도 말을 안 해요.", sub:"어떻게 할까요?",
      choices:[{text:"점심을 같이 먹자고 한다",ai:"🍱",eff:{relationship:4,charm:1},flags:["goodFriend"],res:"알고 보니 게임을 엄청 잘하는 아이였어요."},
               {text:"멀리서 지켜본다",ai:"👀",eff:{intelligence:2},res:"며칠 뒤 다른 친구 무리에 끼었어요."},
               {text:"다른 애들처럼 놀린다",ai:"😏",eff:{charm:1,relationship:-3},res:"마음 한구석이 계속 불편했어요."}]},
    {id:"elem_olympiad", chip:"🧮 새봄시 수학 올림피아드", say:"교내 예선을 통과했어요. 시 대회는 이번 주 토요일이에요.", sub:"주말을 어떻게 쓸까요?", mood:"worried",
      choices:[{text:"문제집을 끝까지 판다",ai:"✏️",eff:{intelligence:5,health:-2},flags:["studyRoutine"],res:"동상을 받았어요!"},
               {text:"컨디션 관리에 집중",ai:"😴",eff:{intelligence:2,health:2},res:"편하게 풀고 왔어요."},
               {text:"포기하고 놀러 간다",ai:"🎡",eff:{health:2,charm:1,intelligence:-1},res:"놀이공원은 즐거웠어요."}]}
  ];

  S.middle = [
    {id:"dodam_class", npc:"dodam", chip:"🧑 도담과 같은 반", say:"중학교 첫날, 교실 문을 열자 도담이 손을 흔들어요. 3년 만이에요.", sub:"새 학기를 어떻게 보낼까요?", mood:"happy",
      cond:p=>bond(p,"dodam")>=1,
      choices:[{text:"같은 동아리에 든다",ai:"🎸",eff:{relationship:3,intelligence:-1},bond:{dodam:3},note:"중학교에서 다시 만나 같은 동아리에 들었다",res:"방과 후마다 연습실에서 살았어요."},
               {text:"새 친구들도 사귄다",ai:"👋",eff:{charm:3},bond:{dodam:1},res:"도담은 \"넌 인싸 다 됐네\"라며 웃었어요."},
               {text:"성적으로 경쟁한다",ai:"📈",eff:{intelligence:3,relationship:-1},bond:{dodam:1},res:"서로의 등수를 몰래 확인하는 사이가 됐어요."}]},
    {id:"dodam_new", npc:"dodam", chip:"🧑 옆자리 전학생, 도담", say:"짝꿍이 된 아이 이름이 도담이래요. 어릴 적 강변공원에서 본 것 같기도 해요.", sub:"말을 걸어볼까요?",
      cond:p=>bond(p,"dodam")<1,
      choices:[{text:"\"혹시 강변공원 모래밭?\"",ai:"🏖️",eff:{relationship:3,charm:1},bond:{dodam:4},note:"중학교 짝꿍으로 다시 만났다",res:"\"맞아! 그 삽!\" 둘 다 소리를 질렀어요."},
               {text:"그냥 인사만 한다",ai:"🙂",eff:{relationship:1},bond:{dodam:1},res:"무난한 짝꿍이 됐어요."},
               {text:"이어폰을 꽂는다",ai:"🎧",eff:{intelligence:1},bond:{dodam:0},res:"한 학기 동안 별말이 없었어요."}]},
    {id:"granny_crisis", npc:"granny", chip:"👵 옥순상회 폐업 위기", say:"골목에 대형 편의점이 들어섰어요. 옥순상회에 손님이 뚝 끊겼대요.", sub:"할머니 가게를 어떻게 도울까요?", mood:"worried",
      choices:[{text:"전단지를 만들어 돌린다",ai:"📄",eff:{relationship:2,health:-2,charm:1},bond:{granny:3},note:"폐업 위기의 가게를 위해 전단지를 돌렸다",res:"동네 사람들이 하나둘 다시 찾아왔어요."},
               {text:"SNS에 가게를 소개한다",ai:"📱",eff:{charm:3},bond:{granny:3},flags:["goodAtPresentation"],note:"SNS로 옥순상회를 알렸다",res:"\"레트로 감성 가게\"로 소문이 났어요!"},
               {text:"어쩔 수 없다고 생각한다",ai:"😔",eff:{intelligence:1},bond:{granny:-1},res:"가게 앞을 지날 때마다 마음이 무거웠어요."}]},
    {id:"mid_casting", chip:"🌟 길거리 캐스팅", say:"새봄역 앞에서 기획사 명함을 받았어요. \"오디션 한번 볼래요?\"", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"오디션을 보러 간다",ai:"🎤",eff:{charm:4,intelligence:-2},flags:["talentStage","confident"],res:"떨어졌지만 무대가 체질이라는 걸 알았어요."},
               {text:"부모님과 상의한다",ai:"👨‍👩‍👧",eff:{relationship:2,charm:1},res:"\"공부랑 같이 할 수 있으면 해 봐.\""},
               {text:"사기일까 봐 버린다",ai:"🗑️",eff:{intelligence:2},res:"다음 날 뉴스에 가짜 기획사가 나왔어요."}]},
    {id:"mid_runaway", chip:"🌧️ 집을 나가고 싶은 밤", say:"부모님과 크게 다퉜어요. 가방을 싸 들고 현관 앞에 섰어요.", sub:"어떻게 할까요?", mood:"sad",
      choices:[{text:"도담에게 전화한다",ai:"📞",eff:{relationship:2,health:1},bond:{dodam:2},res:"도담네 옥상에서 별을 보며 밤을 새웠어요."},
               {text:"방으로 돌아가 편지를 쓴다",ai:"✉️",eff:{relationship:3,intelligence:1},flags:["diary"],res:"다음 날 엄마가 답장을 식탁에 두셨어요."},
               {text:"그냥 나간다",ai:"🚪",eff:{health:-3,charm:1,relationship:-2},res:"편의점에서 컵라면을 먹고 새벽에 돌아왔어요."}]}
  ];

  S.high = [
    {id:"teacher_letter", npc:"teacher", chip:"👨‍🏫 한결 선생님의 편지", say:"고3 봄, 새봄초 한결 선생님이 편지를 보내셨어요. 초등학교 때 일기를 아직 갖고 계시대요.", sub:"\"너는 네가 생각하는 것보다 단단한 아이란다.\"",
      cond:p=>bond(p,"teacher")>=3,
      choices:[{text:"찾아뵙고 진로 상담",ai:"🚶",eff:{intelligence:3,relationship:2},bond:{teacher:3},flags:["mentor","examFocus"],note:"고3 때 선생님을 찾아가 진로를 상담했다",res:"\"좋아하는 걸 오래 하는 사람이 결국 이겨.\" 그 말이 오래 남았어요."},
               {text:"답장을 쓴다",ai:"✉️",eff:{relationship:2,charm:1},bond:{teacher:2},res:"선생님이 답장을 액자에 넣으셨대요."},
               {text:"바빠서 미룬다",ai:"⏳",eff:{intelligence:1},bond:{teacher:-1},res:"편지는 서랍 속에 남았어요."}]},
    {id:"dodam_dream", npc:"dodam", chip:"🧑‍🎓 도담의 고민", say:"야자를 째고 옥상에 올라온 도담이 말해요. \"나, 대학 안 가고 장사해 보고 싶어.\"", sub:"뭐라고 해 줄까요?", mood:"worried",
      choices:[{text:"\"너라면 할 수 있어\"",ai:"🔥",eff:{relationship:3,intelligence:-1},bond:{dodam:3},note:"장사하고 싶다는 도담의 꿈을 응원했다",res:"도담이 처음으로 울었어요. \"그 말 듣고 싶었어.\""},
               {text:"현실적으로 조언한다",ai:"📊",eff:{intelligence:2},bond:{dodam:1},res:"\"그래도 대학은 가 볼게.\" 도담이 고개를 끄덕였어요."},
               {text:"\"공부나 해\"",ai:"📚",eff:{intelligence:2,relationship:-1},bond:{dodam:-2},res:"도담은 그날 말없이 먼저 내려갔어요."}]},
    {id:"high_webnovel", chip:"📱 웹소설 연재", say:"재미로 올린 웹소설에 댓글이 달리기 시작했어요. \"다음 화 언제 나와요?\"", sub:"어떻게 할까요?", mood:"happy",
      choices:[{text:"매일 밤 연재한다",ai:"🌙",eff:{charm:3,intelligence:2,health:-3},flags:["diary","smallAward"],res:"조회수 10만! 공모전 장려상을 받았어요."},
               {text:"수능 끝나고 다시",ai:"📌",eff:{intelligence:2},res:"독자들이 \"기다릴게요\"라고 남겼어요."},
               {text:"친구에게 그림을 맡겨 웹툰으로",ai:"🎨",eff:{charm:2,relationship:2},flags:["artClub"],res:"둘이 만든 첫 작품이 생겼어요."}]},
    {id:"high_ghost", chip:"🌌 새봄고 괴담", say:"\"밤 10시에 음악실 피아노가 혼자 울린대.\" 야자 시간, 친구들이 확인하러 가재요.", sub:"갈까요?",
      choices:[{text:"앞장선다",ai:"🔦",eff:{charm:3,luck:2,health:-1},res:"범인은 몰래 연습하던 3학년 선배였어요."},
               {text:"뒤에서 따라간다",ai:"🫣",eff:{relationship:3},res:"비명은 내가 제일 크게 질렀어요."},
               {text:"자습실에 남는다",ai:"📖",eff:{intelligence:3,relationship:-1},res:"다음 날 소문을 다 들었어요."}]}
  ];

  S.youth = [
    {id:"dodam_startup", npc:"dodam", chip:"🧑‍💼 도담의 창업 제안", say:"도담이 새봄시장에 작은 가게를 내려고 해요. \"같이 하자. 너라면 믿을 수 있어.\"", sub:"도담과 쌓은 시간이 판단의 근거가 돼요.", mood:"worried",
      choices:[{text:"크게 투자한다 (-300)",ai:"🚀",money:-300,eff:{charm:1},bond:{dodam:2},
                gamble:{chance:p=>0.35+bond(p,"dodam")*0.035, win:{money:900,eff:{relationship:3},res:"가게가 대박 났어요! 새봄시장 명물이 됐어요. (+900)"}, lose:{money:0,eff:{health:-3},res:"1년 만에 문을 닫았어요. 그래도 도담과는 여전히 친구예요."}},
                note:"도담의 가게에 크게 투자했다", res:""},
               {text:"조금만 보탠다 (-100)",ai:"🤝",money:-100,bond:{dodam:2},
                gamble:{chance:p=>0.4+bond(p,"dodam")*0.03, win:{money:280,res:"작은 지분이 쏠쏠한 수입이 됐어요. (+280)"}, lose:{money:0,res:"보탠 돈은 돌아오지 않았지만 응원은 남았어요."}},
                note:"도담의 가게에 조금 보탰다", res:""},
               {text:"정중히 거절한다",ai:"🙏",eff:{intelligence:2},bond:{dodam:-2},res:"\"그래, 이해해.\" 도담의 웃음이 조금 어색했어요."}]},
    {id:"granny_shop", npc:"granny", chip:"👵 옥순상회를 맡아줄래?", say:"여든이 넘은 옥순 할머니가 부르셨어요. \"이 가게, 네가 맡아 주면 좋겠구나.\"", sub:"할머니는 어릴 적 단골을 잊지 않으셨어요.",
      cond:p=>bond(p,"granny")>=5,
      choices:[{text:"가게를 이어받는다",ai:"🏪",money:150,eff:{relationship:4,health:-2},bond:{granny:4},flags:["grannyShop","manyFriends"],note:"옥순상회를 물려받았다",res:"권리금 대신 할머니의 단골 장부를 받았어요. 동네가 축하해 줬어요. (+150)"},
               {text:"주말에만 돕는다",ai:"🗓️",eff:{relationship:3},bond:{granny:2},res:"할머니가 \"그것만으로도 고맙다\" 하셨어요."},
               {text:"내 길을 가겠다고 말씀드린다",ai:"🙇",eff:{intelligence:2},bond:{granny:0},res:"할머니는 웃으며 등을 두드려 주셨어요."}]},
    {id:"youth_coin", chip:"🪙 코인 열풍", say:"단톡방이 난리예요. \"이거 지금 안 사면 평생 후회한다.\"", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"영끌해서 산다 (-200)",ai:"🚀",money:-200,gamble:{chance:p=>0.3+(p.stats.luck-50)*0.006, win:{money:700,eff:{luck:2},res:"열 배가 올랐어요! 바로 팔았어요. (+700)"}, lose:{money:0,eff:{health:-3,charm:-1},res:"한 달 만에 휴지 조각이 됐어요."}},flags:["investor"],res:""},
               {text:"소액만 넣는다 (-40)",ai:"🪙",money:-40,gamble:{chance:p=>0.45, win:{money:110,res:"치킨값은 벌었어요. (+110)"}, lose:{money:0,res:"커피값 날렸다 생각했어요."}},res:""},
               {text:"관심 끈다",ai:"🔕",eff:{intelligence:2},flags:["saver"],res:"마음은 편했어요."}]},
    {id:"youth_jeonse", chip:"🏚️ 너무 싼 전세", say:"시세보다 30% 싼 전셋집이 나왔어요. 집주인은 오늘 안에 계약하재요.", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"등기부등본부터 뗀다",ai:"🔍",money:-10,eff:{intelligence:3},res:"근저당이 잔뜩 잡혀 있었어요. 피했어요!"},
               {text:"바로 계약한다",ai:"✍️",gamble:{chance:p=>0.35, win:{money:150,res:"운이 좋았어요. 진짜 급매였어요. (+150)"}, lose:{money:-400,eff:{health:-4},res:"전세 사기였어요… 보증금이 묶였어요. (-400)"}},res:""},
               {text:"본가에 조금 더 산다",ai:"🏠",money:40,eff:{relationship:2,charm:-2},res:"엄마 밥이 최고예요. 돈도 모였어요."}]},
    {id:"youth_holiday", chip:"✈️ 워킹홀리데이", say:"서른 전에 마지막 기회래요. 호주 워킹홀리데이 비자가 나왔어요.", sub:"떠날까요?", mood:"happy",
      choices:[{text:"1년 떠난다 (-150)",ai:"🦘",money:-150,eff:{charm:5,health:2,relationship:-2},flags:["traveler"],res:"세상이 넓다는 걸 온몸으로 배웠어요."},
               {text:"한 달 여행으로 줄인다 (-60)",ai:"🎒",money:-60,eff:{charm:2,health:1},res:"짧지만 진한 여행이었어요."},
               {text:"커리어를 지킨다",ai:"💼",money:30,eff:{intelligence:2},res:"사진만 저장해 뒀어요."}]},
    {id:"teacher_wedding", npc:"teacher", chip:"👨‍🏫 한결 선생님의 정년퇴임", say:"한결 선생님이 정년퇴임을 하신대요. 제자들이 작은 자리를 마련했어요.", sub:"어떻게 할까요?",
      cond:p=>bond(p,"teacher")>=2,
      choices:[{text:"축사를 맡는다",ai:"🎤",eff:{charm:3,relationship:3},bond:{teacher:3},note:"선생님 퇴임식에서 축사를 했다",res:"선생님이 내 초등학교 일기를 꺼내 읽으셨어요. 다들 울었어요."},
               {text:"꽃다발만 보낸다",ai:"💐",money:-20,eff:{relationship:1},bond:{teacher:1},res:"\"고맙다\"는 문자가 왔어요."},
               {text:"야근이라 못 간다",ai:"💼",money:20,bond:{teacher:-1},res:"단체 사진에 내 자리만 비었어요."}]}
  ];

  /* ── 연애가 깊어지는 이야기 · 청혼의 순간 (청년·성인 공통) ──
     시뮬레이션 8판에서 결혼율 6% · 자녀 0명 → 결혼 엔진이 열리도록 사랑 이야기를 늘린다. */
  const partner = p=>(has("npcOf") && p.currentPartnerId) ? npcOf(p.currentPartnerId) : null;
  const pAff = p=>has("affOf") && p.currentPartnerId ? affOf(p,p.currentPartnerId) : 0;
  const LOVE = [
    {id:"love_deepen", chip:"💗 깊어지는 마음", w:2,
      cond:p=>!p.isMarried && !!p.currentPartnerId,
      sayF:p=>`${partner(p).name}${has("jo")?jo(partner(p).name,"와과"):"와"} 강변공원을 걸어요. 손등이 자꾸 스쳐요.`, sub:"오늘은 어떻게 할까요?", mood:"happy",
      choices:[{text:"손을 잡는다",ai:"🤝",aff:14,eff:{charm:2},res:"놀란 눈이 금세 웃음으로 바뀌었어요."},
               {text:"좋아하는 노래를 들려준다",ai:"🎧",aff:9,eff:{charm:1,relationship:1},res:"이어폰 한쪽씩, 같은 노래를 들었어요."},
               {text:"일 얘기만 한다",ai:"💼",aff:1,eff:{intelligence:2},res:"대화가 조금 딱딱했어요."}]},
    {id:"love_family", chip:"🏡 부모님께 인사", w:2,
      cond:p=>!p.isMarried && pAff(p)>=35,
      sayF:p=>`${partner(p).name}${has("jo")?jo(partner(p).name,"이가"):"이"} 부모님을 뵈러 가자고 해요.`, sub:"긴장되는 첫 인사예요.", mood:"worried",
      choices:[{text:"정성껏 선물을 준비한다",ai:"🎁",money:-60,aff:12,eff:{relationship:3},res:"\"사람이 참 반듯하네.\" 합격이었어요."},
               {text:"있는 그대로 간다",ai:"🙂",aff:7,eff:{charm:1},res:"편안한 저녁이었어요."},
               {text:"아직 이르다며 미룬다",ai:"⏳",aff:-5,eff:{intelligence:1},res:"서운한 기색이 보였어요."}]},
    {id:"love_propose", chip:"💍 청혼의 순간", w:4,
      cond:p=>!p.isMarried && pAff(p)>=45 && has("doMarry"),
      sayF:p=>`새봄항 불꽃축제 날, ${partner(p).name}${has("jo")?jo(partner(p).name,"와과"):"와"} 둘만 남았어요. 지금이 그때 같아요.`, sub:"평생을 함께할까요?", mood:"happy",
      choices:[{text:"반지를 꺼낸다",ai:"💍",propose:true,res:""},
               {text:"조금 더 사랑만 하자",ai:"💞",aff:5,eff:{charm:1},res:"\"그래, 천천히 가자.\""},
               {text:"아직 확신이 없다",ai:"🤔",aff:-6,eff:{intelligence:2},res:"불꽃이 조금 쓸쓸해 보였어요."}]}
  ];
  const LATE_LOVE = {id:"late_love", chip:"🌷 늦게 찾아온 인연", w:2,
    cond:p=>!p.isMarried && (!p.currentPartnerId || pAff(p)<20),
    say:"새봄시 독서 모임에서 자꾸 눈이 마주치는 사람이 있어요.", sub:"다가가 볼까요?", mood:"happy",
    choices:[{text:"먼저 커피를 권한다",ai:"☕",meet:24,eff:{charm:2,relationship:2},res:"이야기가 끝없이 이어졌어요."},
             {text:"책 추천을 부탁한다",ai:"📚",meet:16,eff:{intelligence:2},res:"다음 모임이 기다려졌어요."},
             {text:"혼자가 편하다",ai:"🕊️",eff:{health:2},res:"조용한 저녁이 좋았어요."}]};
  /* 결혼은 유지 비용이 있는 자산 — 관리할 기회를 준다 (시뮬레이션: 청년기 결혼 2쌍 중 2쌍 모두 성인기에 이혼) */
  const ANNIV = {id:"anniversary", chip:"💞 결혼기념일", w:3, repeat:true,
    cond:p=>p.isMarried && !!p.spouseId,
    sayF:p=>`오늘은 ${p.spouseName||"배우자"}${has("jo")?jo(p.spouseName||"배우자","와과"):"와"}의 결혼기념일이에요.`, sub:"어떻게 보낼까요?", mood:"happy",
    choices:[{text:"새봄항 야경 레스토랑",ai:"🌃",money:-80,aff:16,eff:{charm:1,relationship:2},res:"처음 만난 날 이야기를 하며 웃었어요."},
             {text:"손편지와 집밥",ai:"✉️",money:-15,aff:11,eff:{relationship:2},res:"편지를 읽다 둘 다 눈시울이 붉어졌어요."},
             {text:"바빠서 깜빡한다",ai:"📅",money:20,aff:-10,eff:{intelligence:1},res:"저녁 식탁에 냉기가 돌았어요."}]};
  S.youth.push(...LOVE, ANNIV);

  S.adult = [
    ...LOVE, LATE_LOVE, ANNIV, Object.assign({}, ANNIV, {id:"anniversary2"}),
    {id:"adult_baby", chip:"👶 아기 소식", say:"배우자가 조심스럽게 테스트기를 내밀어요. 두 줄이에요.", sub:"새 가족을 맞이할 준비가 됐나요?", mood:"happy",
      cond:p=>p.isMarried && (p.children||[]).length<3, w:3,
      // 시뮬레이션: 결혼해도 👶칸에 정확히 서야만 아이 이야기가 나와 자녀를 둔 비율이 13%에 그쳤다.
      // 결혼한 부부라면 성인기 첫 장면에서 반드시 한 번은 묻는다.
      force:p=>p.isMarried && !(p.children||[]).length,
      choices:[{text:"정성껏 키우겠다",ai:"🍼",money:-60,child:{invest:4},eff:{relationship:3,health:-2},res:"작은 손이 내 손가락을 꼭 쥐었어요."},
               {text:"형편껏 키우겠다",ai:"👶",money:-20,child:{invest:1},eff:{relationship:2},res:"집이 갑자기 시끄러워졌어요. 행복하게."},
               {text:"지금은 아니라고 말한다",ai:"🗓️",eff:{intelligence:1},res:"조금 더 준비하고 싶었어요."}]},
    {id:"adult_baby2", chip:"🍼 둘째 이야기", sayF:p=>`첫째가 ${p.children&&p.children[0]&&p.children[0].age>=3?"동생을 갖고 싶다고 졸라요":"걸음마를 떼자 배우자가 둘째 이야기를 꺼내요"}.`, sub:"한 명 더 키울 수 있을까요?", mood:"happy",
      cond:p=>p.isMarried && (p.children||[]).length>=1 && (p.children||[]).length<3, w:3,
      choices:[{text:"둘째를 맞이한다",ai:"👶",money:-40,child:{invest:2},eff:{relationship:3,health:-2},res:"형제가 생겼어요. 집이 두 배로 시끄러워졌어요."},
               {text:"한 아이에게 집중한다",ai:"🎯",eff:{intelligence:1,relationship:1},res:"첫째에게 마음을 더 쏟기로 했어요."},
               {text:"조금 더 생각해 본다",ai:"🗓️",eff:{health:1},res:"서두르지 않기로 했어요."}]},
    {id:"adult_parents", chip:"🏥 부모님이 편찮으세요", say:"엄마가 쓰러지셨다는 전화를 받았어요. 회사에선 중요한 프로젝트 마감이에요.", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"휴직하고 간병한다",ai:"🤲",money:-150,eff:{relationship:5,health:-3},res:"엄마가 \"네 덕에 살았다\"며 손을 잡으셨어요."},
               {text:"간병인을 구한다",ai:"💳",money:-280,eff:{relationship:1},res:"주말마다 병원에 들렀어요."},
               {text:"형제에게 맡긴다",ai:"📞",eff:{intelligence:1,relationship:-5},res:"명절에 어색한 공기가 흘렀어요."}]},
    {id:"adult_layoff", chip:"📉 명예퇴직 권고", say:"인사팀이 면담을 요청했어요. \"지금 나가시면 위로금이 꽤 됩니다.\"", sub:"어떻게 할까요?", mood:"worried",
      cond:p=>!!p.job && (p.job.baseSalary||0)>0,
      choices:[{text:"버틴다",ai:"🪨",eff:{health:-4,intelligence:2},res:"자리를 지켰지만 눈치가 보였어요."},
               {text:"위로금 받고 창업한다",ai:"🚀",money:200,gamble:{chance:p=>0.35+(p.stats.intelligence-50)*0.005, win:{money:700,eff:{charm:2},res:"사장님 소리가 익숙해졌어요. (+위로금 200, 사업 +700)"}, lose:{money:-250,eff:{health:-3},res:"가게를 정리했어요. 위로금은 거의 남지 않았어요."}},res:""},
               {text:"위로금 받고 쉰다",ai:"🌿",money:250,eff:{health:5,charm:-2},res:"처음으로 아이 등원길을 함께했어요. (+250)"}]},
    {id:"adult_house", chip:"🏠 집값 폭등 뉴스", say:"새봄신도시 아파트값이 1년 만에 두 배가 됐대요. 영끌하라는 말이 들려요.", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"영끌해서 산다 (-500)",ai:"🏗️",money:-500,gamble:{chance:p=>0.5+(p.stats.luck-50)*0.004, win:{money:1200,eff:{luck:2},res:"더 올랐어요! 내 집이 생겼어요. (+1,200)"}, lose:{money:250,eff:{health:-4},res:"꼭지에서 샀어요. 반값에 팔았어요. (+250)"}},flags:["homeowner"],res:""},
               {text:"청약을 기다린다",ai:"📝",gamble:{chance:p=>0.25+(p.stats.luck-50)*0.004, win:{money:600,res:"청약 당첨! (+600)"}, lose:{money:0,res:"이번에도 떨어졌어요."}},res:""},
               {text:"전세로 버틴다",ai:"🧘",money:40,eff:{intelligence:1},res:"마음은 편했어요."}]},
    {id:"dodam_loan", npc:"dodam", chip:"🧑 도담의 전화", say:"오랜만에 도담에게 전화가 왔어요. \"미안한데… 300만 빌려줄 수 있어?\"", sub:"우리가 함께 보낸 시간이 떠올라요.", mood:"worried",
      choices:[{text:"빌려준다 (-200)",ai:"🤝",money:-200,bond:{dodam:3},gamble:{chance:p=>0.3+bond(p,"dodam")*0.05, win:{money:300,res:"1년 뒤 도담이 이자까지 얹어 갚았어요. \"너 아니었으면 끝났어.\" (+300)"}, lose:{money:0,res:"돈은 돌아오지 않았지만, 도담은 매년 내 생일을 챙겨요."}},note:"어려울 때 도담에게 돈을 빌려줬다",res:""},
               {text:"절반만 빌려준다 (-100)",ai:"✋",money:-100,bond:{dodam:1},gamble:{chance:p=>0.4+bond(p,"dodam")*0.04, win:{money:130,res:"도담이 꼭 갚았어요. (+130)"}, lose:{money:0,res:"잊은 척하기로 했어요."}},res:""},
               {text:"거절한다",ai:"🚫",eff:{intelligence:1},bond:{dodam:-3},res:"그 뒤로 도담의 연락이 뜸해졌어요."}]},
    {id:"granny_farewell", npc:"granny", chip:"🕯️ 옥순 할머니의 부고", say:"옥순 할머니가 돌아가셨다는 소식이에요. 유품 정리 중에 내 이름이 적힌 봉투가 나왔대요.", sub:"\"우리 단골 1호에게.\"", mood:"sad",
      cond:p=>bond(p,"granny")>=4,
      choices:[{text:"봉투를 연다",ai:"✉️",money:bondMoney("granny"),eff:{relationship:3},note:"할머니가 남긴 봉투를 받았다",res:"꼬깃꼬깃한 지폐와 편지 한 장. \"착하게 살아줘서 고맙다.\""},
               {text:"가게 앞에 꽃을 둔다",ai:"💐",eff:{relationship:2,charm:1},res:"골목 사람들이 하나둘 꽃을 놓고 갔어요."},
               {text:"조용히 추억한다",ai:"🌙",eff:{intelligence:1,health:-1},res:"눈깔사탕 맛이 떠올랐어요."}]},
    {id:"teacher_day", npc:"teacher", chip:"👴 스승의 날", say:"백발이 된 한결 선생님이 SNS를 시작하셨대요. 제자들 사진이 잔뜩 올라와요.", sub:"어떻게 할까요?",
      choices:[{text:"아이와 함께 찾아뵌다",ai:"👨‍👧",money:-30,eff:{relationship:4},bond:{teacher:2},res:"선생님이 내 아이에게도 일기 쓰는 법을 알려주셨어요."},
               {text:"댓글로 인사한다",ai:"💬",eff:{relationship:1},bond:{teacher:1},res:"\"우리 반 일기왕!\" 답글이 달렸어요."},
               {text:"바빠서 넘긴다",ai:"⏩",money:20,bond:{teacher:-1},res:"다음 해에 하기로 했어요."}]}
  ];

  S.senior = [
    {id:"senior_phishing", chip:"📞 낯선 전화", say:"\"아들(딸)이 사고를 쳐서 합의금이 급합니다.\" 떨리는 목소리가 들려요.", sub:"어떻게 할까요?", mood:"worried",
      choices:[{text:"끊고 자녀에게 전화한다",ai:"📵",eff:{intelligence:2,relationship:2},res:"보이스피싱이었어요. 자녀가 \"잘했어요\"라고 했어요."},
               {text:"경찰에 신고한다",ai:"🚓",eff:{intelligence:3,charm:1},res:"범인 일당이 잡혔어요. 감사장을 받았어요."},
               {text:"급히 송금한다",ai:"💸",gamble:{chance:p=>(p.stats.intelligence>=70?0.5:0.15), win:{money:0,res:"은행 직원이 이상하다며 막아줬어요. 다행이에요."}, lose:{money:-300,eff:{health:-4},res:"사기였어요… (-300)"}},res:""}]},
    {id:"senior_youtube", chip:"📹 시니어 유튜버", say:"손주가 \"할머니(할아버지) 이야기 유튜브에 올리면 대박\"이래요.", sub:"해 볼까요?", mood:"happy",
      choices:[{text:"매주 올린다",ai:"🎬",eff:{charm:4,health:-1},gamble:{chance:p=>0.3+(p.stats.charm-50)*0.006, win:{money:400,res:"구독자 10만! 광고 수익이 들어와요. (+400)"}, lose:{money:30,res:"구독자 300명. 그래도 댓글이 따뜻해요. (+30)"}},res:""},
               {text:"가족끼리만 본다",ai:"👨‍👩‍👧",eff:{relationship:4},res:"명절마다 다 같이 돌려봐요."},
               {text:"사양한다",ai:"🙅",eff:{health:1},res:"조용한 게 좋아요."}]},
    {id:"senior_grandkid", chip:"🎓 손주의 유학", say:"손주가 해외 대학에 합격했대요. 학비가 걱정이라는 이야기가 들려요.", sub:"어떻게 할까요?",
      cond:p=>(p.children||[]).length>0,
      choices:[{text:"학비를 보탠다 (-300)",ai:"💝",money:-300,eff:{relationship:6},res:"손주가 공항에서 한참을 안고 있었어요."},
               {text:"응원 편지와 용돈만",ai:"✉️",money:-50,eff:{relationship:3},res:"편지가 손주 기숙사 벽에 붙었대요."},
               {text:"각자 알아서 하라고 한다",ai:"🤷",money:20,eff:{relationship:-3},res:"명절 분위기가 조금 식었어요."}]},
    {id:"dodam_river", npc:"dodam", chip:"🧓 강변공원의 두 노인", say:"강변공원 벤치에 백발의 도담이 앉아 있어요. 그 모래밭은 이제 꽃밭이 됐어요.", sub:"\"우리 여기서 처음 만났잖아.\"", mood:"happy",
      cond:p=>bond(p,"dodam")>=6,
      choices:[{text:"매일 아침 함께 걷는다",ai:"🚶",eff:{health:5,relationship:4},bond:{dodam:3},flags:["lifelongFriend"],note:"여든까지 함께 걷는 평생 친구가 됐다",res:"\"그때 삽 나눠줘서 고마웠어.\" 칠십 년 묵은 인사였어요."},
               {text:"옛날 사진을 꺼낸다",ai:"📷",eff:{relationship:3,charm:1},bond:{dodam:2},res:"모래 묻은 두 아이가 웃고 있었어요."},
               {text:"가끔 안부만 묻는다",ai:"☎️",eff:{relationship:1},res:"그래도 마음은 늘 가까웠어요."}]},
    {id:"dodam_letter", npc:"dodam", chip:"🧓 소식이 끊긴 친구", say:"동창회 명단에서 도담의 이름을 봤어요. 연락이 끊긴 지 수십 년이에요.", sub:"연락해 볼까요?",
      cond:p=>bond(p,"dodam")<6,
      choices:[{text:"먼저 연락한다",ai:"📨",eff:{relationship:4},bond:{dodam:4},res:"\"나도 네 생각 많이 했어.\" 바로 답장이 왔어요."},
               {text:"동창회에 나간다",ai:"🍻",money:-30,eff:{relationship:3,charm:1},bond:{dodam:2},res:"멀리서 눈인사를 나눴어요."},
               {text:"추억으로 남긴다",ai:"🌅",eff:{intelligence:1},res:"그 시절도 나쁘지 않았어요."}]},
    {id:"teacher_farewell", npc:"teacher", chip:"🕯️ 한결 선생님의 마지막 편지", say:"한결 선생님이 별세하셨어요. 제자들에게 남긴 편지가 있대요.", sub:"\"일기를 오래 써 줘서 고마웠다.\"", mood:"sad",
      cond:p=>bond(p,"teacher")>=5,
      choices:[{text:"자서전을 쓰기 시작한다",ai:"📖",eff:{intelligence:3,charm:2},flags:["memoir"],note:"선생님의 마지막 편지를 받고 자서전을 쓰기 시작했다",res:"첫 장의 제목은 '빨간 글씨 답장'이에요."},
               {text:"제자들과 추모식을 연다",ai:"🕯️",money:-40,eff:{relationship:4},res:"새봄초 운동장에 백 명이 모였어요."},
               {text:"조용히 기도한다",ai:"🙏",eff:{health:1,relationship:1},res:"선생님 목소리가 들리는 것 같았어요."}]}
  ];

  function bondMoney(k){ return 120; }   // 할머니 봉투 (인연이 깊을수록 → 결과 문장에서 강조)

  /* ── 새봄일보: 시대 뉴스 ── fx(p) → {eff, txt} : 두 사람에게 각자 다르게 작용 */
  const NEWS = {
    child:[
      {h:"새봄시 어린이 대공원 개장!", s:"주말마다 아이들 웃음소리가 가득해요.", fx:p=>({eff:{health:2,charm:1},txt:"대공원에서 신나게 뛰었어요"})},
      {h:"독감 대유행, 유치원 휴원", s:"손 씻기가 최고의 백신이에요.", fx:p=>p.stats.health>=60?{eff:{health:-1},txt:"잘 버텼어요"}:{eff:{health:-4},txt:"독감에 걸려 일주일 앓았어요"}},
      {h:"별빛도서관 어린이 열람실 무료 개방", s:"그림책 3만 권이 기다려요.", fx:p=>({eff:{intelligence:2},txt:"그림책을 한 아름 빌렸어요"})}
    ],
    elementary:[
      {h:"새봄초, 시 대표 운동회 우승", s:"계주 마지막 주자의 역전극!", fx:p=>({eff:{relationship:2,health:1},txt:"목이 쉬도록 응원했어요"})},
      {h:"초등학생 스마트폰 열풍", s:"놀이터가 조용해졌다는 말이 나와요.", fx:p=>p.stats.intelligence>=60?{eff:{intelligence:1,relationship:1},txt:"정해진 시간만 썼어요"}:{eff:{intelligence:-2,relationship:2},txt:"게임 단톡방에 빠졌어요"}},
      {h:"황사 경보, 야외 수업 전면 중단", s:"마스크를 꼭 챙기세요.", fx:p=>({eff:{health:-2,intelligence:1},txt:"교실에서 보드게임을 했어요"})}
    ],
    middle:[
      {h:"월드컵 4강 신화!", s:"새봄시 광장에 10만 명이 모였어요.", fx:p=>({eff:{relationship:3,luck:2},txt:"모르는 사람과 얼싸안았어요"})},
      {h:"학원가 과열, 중학생 평균 수면 6시간", s:"\"잠이 보약\"이라는 캠페인이 시작됐어요.", fx:p=>p.stats.health>=55?{eff:{intelligence:2,health:-1},txt:"버틸 만했어요"}:{eff:{intelligence:1,health:-3},txt:"수업 시간에 꾸벅꾸벅 졸았어요"}},
      {h:"아이돌 오디션 프로그램 시청률 30%", s:"교실마다 '최애' 토론이 한창이에요.", fx:p=>({eff:{charm:2},txt:"안무를 다 외웠어요"})}
    ],
    high:[
      {h:"올해 수능, 역대급 불수능 예고", s:"수험생들 사이에 긴장감이 돌아요.", fx:p=>({eff:{intelligence:2,health:-2},txt:"문제집을 한 권 더 샀어요"})},
      {h:"새봄고 졸업생, 국제 과학상 수상", s:"\"새봄초 한결 선생님 덕분\"이라고 소감을 밝혔어요.", fx:p=>({eff:{intelligence:1,luck:1},txt:"나도 할 수 있겠다는 생각이 들었어요"})},
      {h:"기록적 폭염, 교실 에어컨 고장", s:"부채 하나로 버티는 여름이에요.", fx:p=>({eff:{health:-2,relationship:1},txt:"친구들과 아이스크림을 나눠 먹었어요"})}
    ],
    youth:[
      {h:"청년 지원금 지급 시작", s:"새봄시 거주 청년에게 1회 지급돼요.", fx:p=>({eff:{money:100},txt:"지원금이 들어왔어요 (+100)"})},
      {h:"역대급 취업 한파", s:"채용 공고가 반으로 줄었어요.", fx:p=>p.job&&!p.jobFallback?{eff:{intelligence:1},txt:"자리를 지킨 게 다행이에요"}:{eff:{charm:-2,health:-2},txt:"이력서를 쓰다 지쳤어요"}},
      {h:"코인 대폭락, 투자자 비명", s:"한 달 만에 시가총액 70%가 증발했어요.", fx:p=>(p.eventFlags&&p.eventFlags.investor)?{eff:{money:-150,health:-2},txt:"내 코인도 반토막 났어요 (-150)"}:{eff:{luck:1},txt:"안 사길 잘했어요"}}
    ],
    adult:[
      {h:"경제 호황, 성과급 잔치", s:"대기업 성과급이 연봉의 50%래요.", fx:p=>p.job&&(p.job.baseSalary||0)>=50?{eff:{money:250},txt:"성과급이 두둑해요 (+250)"}:{eff:{money:60},txt:"회사 분위기가 좋아요 (+60)"}},
      {h:"기준금리 인상, 대출자 비상", s:"이자 부담이 크게 늘었어요.", fx:p=>(p.eventFlags&&(p.eventFlags.homeowner||p.eventFlags.bigLoan))?{eff:{money:-200,health:-2},txt:"대출 이자가 확 늘었어요 (-200)"}:{eff:{money:30},txt:"예금 이자가 늘었어요 (+30)"}},
      {h:"신종 감염병 팬데믹 선언", s:"재택근무와 거리두기가 시작됐어요.", fx:p=>({eff:{health:-2,relationship:-1,money:-80},txt:"집에만 있는 날이 길어졌어요 (-80)"})}
    ],
    senior:[
      {h:"기초연금 인상 확정", s:"어르신 생활비 부담이 줄어요.", fx:p=>({eff:{money:150},txt:"연금이 올랐어요 (+150)"})},
      {h:"새봄시 실버 체육관 개장", s:"아쿠아로빅 강좌가 인기예요.", fx:p=>({eff:{health:3,relationship:1},txt:"친구가 생겼어요"})},
      {h:"독감 유행, 어르신 접종 권고", s:"보건소 앞에 줄이 길어요.", fx:p=>p.stats.health>=70?{eff:{health:-1},txt:"접종하고 무사히 넘겼어요"}:{eff:{health:-5,money:-60},txt:"한동안 병원 신세를 졌어요 (-60)"}}
    ]
  };

  /* ── 시나리오 고르기 ── */
  const CHANCE = 0.38;   // 일반 칸에서 시나리오가 끼어들 확률
  function eligible(p){
    ensure(p);
    return (S[STAGE_KEY]||[]).filter(sc=>!p.worldSeen[sc.id] && (!sc.cond || sc.cond(p)));
  }
  function pickScene(p){
    const list=eligible(p); if(!list.length) return null;
    // 인생의 갈림길은 확률에 맡기지 않는다 (예: 결혼한 부부의 첫 아이 이야기)
    const must=list.find(sc=>sc.force && sc.force(p)); if(must) return must;
    const boost=list.some(sc=>(sc.w||1)>1);
    if(r01()>(boost?0.6:CHANCE)) return null;
    let tot=list.reduce((s,sc)=>s+(sc.w||1),0), x=r01()*tot;
    for(const sc of list){ x-=(sc.w||1); if(x<=0) return sc; }
    return list[list.length-1];
  }
  function markSeen(p, sc){
    ensure(p); p.worldSeen[sc.id]=true; p.worldLog.push(sc.id);
  }

  /* ── 선택 결과 확장: 인연 · 여러 flag · 승부 · 자녀 ── */
  function resolve(p, c){
    const out=Object.assign({}, c, {eff:Object.assign({}, c.eff||{})});
    let extra="";
    if(c.bond){ for(const k in c.bond){ addBond(p,k,c.bond[k]); } }
    if(c.note && c.bond){ const k=Object.keys(c.bond)[0]; ensure(p).bondNotes[k]=c.note; }
    if(c.flags){ p.eventFlags=p.eventFlags||{}; c.flags.forEach(f=>p.eventFlags[f]=true); }
    if(c.gamble){
      const ch=Math.max(0.05,Math.min(0.92, c.gamble.chance(p)));
      const win=r01()<ch, o=win?c.gamble.win:c.gamble.lose;
      out.money=(c.money||0)+(o.money||0);
      for(const k in (o.eff||{})) out.eff[k]=(out.eff[k]||0)+o.eff[k];
      out.res=(win?"🎉 ":"💧 ")+o.res;
      out.mood=win?"happy":"sad";
      p.worldGambles=p.worldGambles||{win:0,lose:0}; p.worldGambles[win?"win":"lose"]++;
    }
    // 새 인연을 만난다 (성인기 미혼)
    if(c.meet){
      const want=p.gender==="female"?"male":"female";
      const pool=(typeof LOVE_NPCS!=="undefined"?LOVE_NPCS:[]).filter(n=>n.gender===want);
      if(pool.length){ const n=pool[Math.floor(r01()*pool.length)]; p.currentPartnerId=n.id; p.affinity=p.affinity||{}; p.affinity[n.id]=Math.max(p.affinity[n.id]||0, c.meet); out.res=`${n.name}${has("jo")?jo(n.name,"와과"):"와"} 알게 됐어요. `+c.res; }
    }
    // 청혼: 호감·매력·관계가 성공률. 실패하면 호감이 크게 깎인다
    if(c.propose){
      const npc=partner(p), aff=pAff(p);
      let pr=0.45+(aff-50)*0.012+(p.stats.charm-50)*0.004+(p.stats.relationship-50)*0.003;
      if(has("twoTimingCount") && twoTimingCount(p)>=2) pr-=0.2;
      const ok=npc && r01()<Math.max(0.1,Math.min(0.92,pr));
      if(ok){ doMarry(p, npc, STAGE_KEY); out.res=`💍 \"응!\" ${npc.name}${has("jo")?jo(npc.name,"이가"):"이"} 울면서 웃었어요. 결혼을 약속했어요.`; out.mood="happy"; out.eff=Object.assign(out.eff,{charm:3,relationship:3}); }
      else { if(npc && has("addAff")) addAff(p, npc.id, -15); out.res="💧 \"조금만 더 생각해 볼게…\" 반지가 주머니로 돌아갔어요."; out.mood="sad"; out.eff=Object.assign(out.eff,{health:-3}); }
      p.proposeTried=true; p.proposeTriedAt=STAGE_KEY; if(has("markPropose")) markPropose(p);
    }
    if(c.child && STAGE_KEY==="adult"){
      p.children=p.children||[]; p.children.push({age:0, invest:c.child.invest, adult:false});
      p.childrenCount=p.children.length; p.hadChildThisStage=true;
    }
    // 이른 시대는 돈을 다루지 않는다
    if(["child","elementary","middle"].includes(STAGE_KEY)) delete out.money;
    delete out.gamble; delete out.bond; delete out.flags; delete out.child; delete out.propose; delete out.meet;
    return out;
  }

  function wrap(name, make){ if(!has(name)) return false; const o=window[name]; window[name]=make(o); return true; }

  /* 일반 칸 → 가끔 세계관 시나리오. 시대마다 칸 데이터 이름이 달라 CELL_EVENTS의 해당 칸을 잠깐 바꿔 끼운다. */
  wrap("sceneCell", orig=>function(p){
    const sc=(typeof CELL_EVENTS!=="undefined") ? pickScene(p) : null;
    if(!sc) return orig.apply(this, arguments);
    markSeen(p, sc);
    const pos=p.childPos, saved=CELL_EVENTS[pos];
    const scene=Object.assign({}, sc, {world:sc.id, say:sc.sayF?sc.sayF(p):sc.say, choices:sc.choices.map(c=>Object.assign({}, c, {res:c.res||"…"}))});
    CELL_EVENTS[pos]=[scene];
    let r; try{ r=orig.apply(this, arguments); } finally { CELL_EVENTS[pos]=saved; }
    // 인연 장면이면 상대 얼굴을 무대에 함께 세운다
    if(sc.npc){
      try{
        const hb=$("heroBody");
        if(hb && has("avaImg")) hb.innerHTML=`<div class="romance-faces"><div class="rf-me">${avaImg(p)}</div><div class="rf-heart w-bond">${bondHearts(p,sc.npc)}</div><div class="rf-npc w-npc"><span>${npcIco(sc.npc)}</span><b>${BOND_INFO[sc.npc].name}</b></div></div>`;
        const tc=$("turnCount"); if(tc) tc.textContent="인연 · "+BOND_INFO[sc.npc].role;
      }catch(e){}
    } else {
      const tc=$("turnCount"); if(tc) tc.textContent="새봄시 이야기";
    }
    return r;
  });
  function bondHearts(p,k){ const v=bond(p,k); const n=Math.max(0,Math.min(5,Math.ceil(v/4))); return "💛".repeat(n)||"🤍"; }

  wrap("applyChoiceResult", orig=>function(p, sc, i, isAi){
    if(!sc || !sc.world) return orig.apply(this, arguments);
    const c=resolve(p, sc.choices[i]);
    const sc2=Object.assign({}, sc, {choices:sc.choices.map((x,j)=>j===i?c:x)});
    return orig.call(this, p, sc2, i, isAi);
  });

  // 상대는 성향대로: 승부사 성향은 운에 거는 선택을 즐긴다
  wrap("aiChoiceIndex", orig=>function(p, choices){
    // 가정형 성향은 아이를 원한다 (양육비만 보고 늘 거절하던 문제)
    const ci=choices.findIndex(c=>c.child);
    if(ci>=0){ const want={romantic:0.85,stable:0.7,grinder:0.4,challenger:0.4,tycoon:0.25}[p.aiTrait]||0.5; if(r01()<want) return r01()<0.5?ci:Math.min(ci+1,choices.length-1); }
    const pi=choices.findIndex(c=>c.propose);
    if(pi>=0){ const want={romantic:0.9,stable:0.7}[p.aiTrait]||0.45; if(r01()<want) return pi; }
    const gi=choices.findIndex(c=>c.gamble);
    if(gi>=0 && ["tycoon","challenger"].includes(p.aiTrait) && r01()<0.6) return gi;
    const bi=choices.findIndex(c=>c.bond && Object.values(c.bond).some(v=>v>=3));
    if(bi>=0 && ["romantic","stable"].includes(p.aiTrait) && r01()<0.5) return bi;
    return orig.apply(this, arguments);
  });

  /* 갓 결혼한 부부는 마음이 가장 가깝다 — 결혼 직후 배우자 호감 +20 */
  wrap("doMarry", orig=>function(p, npc){
    const r=orig.apply(this, arguments);
    try{ if(npc && has("addAff")) addAff(p, npc.id, 20); }catch(e){}
    return r;
  });

  /* ── 능력치 수확 체감 ──
     시뮬레이션 8판에서 노년 평균 능력치 95, 5개 중 3.4개가 100에 붙었다.
     높이 오를수록 같은 노력의 효과가 줄어든다. 떨어지는 쪽은 그대로 둔다(대가는 온전히). */
  function softGain(cur, v){
    if(v<=0) return v;
    const f = cur<55?1 : cur<70?0.75 : cur<85?0.5 : 0.3;
    const x=v*f, fl=Math.floor(x);
    return fl + (r01()<x-fl?1:0);   // 확률 반올림: +1도 가끔은 오른다
  }
  wrap("applyStat", orig=>function(p, eff){
    if(!p || !p.stats || !eff) return orig.apply(this, arguments);
    const e={};
    for(const k in eff){ e[k] = (k in p.stats) ? softGain(p.stats[k]||0, eff[k]) : eff[k]; }
    return orig.call(this, p, e);
  });

  /* ── 새봄일보 ── */
  const STAGE_AGE = {child:[5,7],elementary:[8,13],middle:[14,16],high:[17,19],youth:[20,29],adult:[30,59],senior:[60,80]};
  function gameYear(rnd){
    const g=(typeof GS!=="undefined"&&GS)||{}; if(!g.birthYear) g.birthYear=2000;
    const [a,b]=STAGE_AGE[STAGE_KEY]||[0,0]; const tot=(typeof TOTAL_ROUNDS!=="undefined")?TOTAL_ROUNDS:12;
    return g.birthYear + a + Math.floor((b-a)*(rnd-1)/Math.max(1,tot-1));
  }
  function showNews(rnd, done){
    const pool=NEWS[STAGE_KEY]; if(!pool||typeof players==="undefined"){ done(); return; }
    GS.newsSeen=GS.newsSeen||{};
    const used=Object.keys(GS.newsSeen).filter(k=>k.startsWith(STAGE_KEY)).map(k=>GS.newsSeen[k]);
    const left=pool.filter(n=>!used.includes(n.h)); const n=(left.length?left:pool)[Math.floor(r01()*(left.length?left.length:pool.length))];
    GS.newsSeen[STAGE_KEY+"_"+rnd]=n.h;
    const lines=players.map(p=>{
      ensure(p);
      const o=n.fx(p); const ap=has("applyStat")?applyStat(p, Object.assign({}, o.eff)):{};
      p.worldLog.push("news:"+n.h);
      if(has("flashMini")) try{ flashMini(p, ap); }catch(e){}
      const d=has("deltaStr")?deltaStr(Object.assign({},ap,{money:undefined}), ap.money):"";
      return `<div class="w-news-row">${p.type==="user"?"🙂":"🌸"} <b>${p.name}</b> — ${o.txt} <small>${d}</small></div>`;
    }).join("");
    if(has("renderRival")) try{ renderRival(); }catch(e){}
    if(has("log")) try{ log(`📰 새봄일보 — ${n.h}`, "good"); }catch(e){}
    const m=$("modal"), ov=$("modalOverlay");
    m.innerHTML=`<div class="w-paper">
        <div class="w-mast"><span>새봄일보</span><small>${gameYear(rnd)}년 · 새봄시</small></div>
        <h2 class="w-head">${n.h}</h2>
        <p class="w-sub">${n.s}</p>
        <div class="w-news-list">${lines}</div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="WORLD.closeNews()">신문을 접는다 →</button>`;
    m.classList.add("w-paper-modal");
    ov.classList.add("on");
    W._newsDone=done;
  }
  W.closeNews=function(){ const m=$("modal"); m.classList.remove("w-paper-modal"); $("modalOverlay").classList.remove("on"); const d=W._newsDone; W._newsDone=null; d&&d(); };

  wrap("startNextRound", orig=>function(){
    const self=this, args=arguments;
    const next=(typeof round!=="undefined"?round:0)+1;
    const tot=(typeof TOTAL_ROUNDS!=="undefined")?TOTAL_ROUNDS:99;
    const key=STAGE_KEY+"_"+next;
    if(next<=tot && next%4===0 && !(GS.newsSeen&&GS.newsSeen[key])){
      showNews(next, ()=>orig.apply(self,args));
      return;
    }
    return orig.apply(self,args);
  });

  /* ── 인연 수첩 ── */
  function ensureBook(){
    if($("bondBtn")) return;
    const b=document.createElement("button"); b.id="bondBtn"; b.className="bag-btn w-bond-btn"; b.title="인연 수첩"; b.textContent="📖";
    b.onclick=openBook; document.body.appendChild(b);
  }
  function openBook(){
    const u=ensure(players[0]);
    const rows=Object.keys(BOND_INFO).map(k=>{
      const v=u.bonds[k]||0, info=BOND_INFO[k];
      const met = v!==0 || u.bondNotes[k];
      const pct=met ? Math.max(4,Math.min(100,(v+10)/30*100)) : 0;
      return `<div class="w-book-row">
        <div class="w-book-ico">${met?npcIco(k):"❔"}</div>
        <div class="w-book-info"><b>${met?info.name:"아직 만나지 않은 인연"}</b> <small>${met?info.role:""}</small>
          <div class="w-book-bar"><i style="width:${pct}%"></i></div>
          <small class="w-book-note">${u.bondNotes[k]||(met?"함께한 기억이 쌓이고 있어요":"새봄시 어딘가에서 만나게 될 거예요")}</small></div>
      </div>`;
    }).join("");
    const seen=(u.worldLog||[]).filter(x=>!String(x).startsWith("news:")).length;
    const m=$("modal");
    m.innerHTML=`<span class="m-type" style="background:linear-gradient(90deg,#E0842A,#FF6FB1)">📖 인연 수첩</span>
      <h2>새봄시에서 만난 사람들</h2>
      <p class="m-desc">어릴 적 선택이 쌓여 인연이 돼요. 인연이 깊을수록 훗날 이야기가 달라져요.</p>
      <div class="w-book">${rows}</div>
      <p class="m-desc" style="margin-top:8px">지금까지 겪은 새봄시 이야기 <b>${seen}</b>개</p>
      <button class="btn btn-primary" style="margin-top:10px;background:var(--sunk);color:var(--ink-2)" onclick="document.getElementById('modalOverlay').classList.remove('on')">닫기</button>`;
    $("modalOverlay").classList.add("on");
  }

  function boot(){ ensureBook(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
