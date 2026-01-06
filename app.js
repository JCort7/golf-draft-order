// ===== CONFIG =====
const PASSWORD = "JBetterGetScottie7"; // as requested (visible typing)
const PLAYERS = [
  "JCort",
  "Kade",
  "Brady Charmin",
  "Swish",
  "Hoosier Craig",
  "Nicky Tru",
  "Dale",
  "Max",
  "Joe D",
  "PCurrency",
  "AK",
  "Jarred"
];

const HOLES = [
  { name:"Golden Bell (12)", course:"Augusta National", yards:155, vibe:"Amen Corner nerves. No survivors." },
  { name:"The Cliffs (7)", course:"Pebble Beach", yards:106, vibe:"Ocean wind. Tiny target. Massive humiliation potential." },
  { name:"Island Green (17)", course:"TPC Sawgrass", yards:137, vibe:"One splash and you’re drafting 11th." },
  { name:"Stadium (16)", course:"TPC Scottsdale", yards:163, vibe:"The crowd is loud and the pressure is loud-er." },
  { name:"Postage Stamp (8)", course:"Royal Troon", yards:123, vibe:"Blink and you miss the green." },
  { name:"Redan (15)", course:"North Berwick", yards:192, vibe:"Classic angle hole. Classic panic." },
  { name:"Devil’s Cauldron (16)", course:"Cypress Point", yards:231, vibe:"It’s gorgeous. It’s terrifying." },
  { name:"Short (6)", course:"Pine Valley", yards:160, vibe:"No frills. Just pain." },
  { name:"Corner (13)", course:"Merion East", yards:115, vibe:"Small green. Big consequences." },
  { name:"Short (17)", course:"St Andrews (Old Course)", yards:115, vibe:"It *looks* easy. That’s the trap." },
  { name:"FINAL HOLE", course:"The Scottie Bowl", yards:155, vibe:"This one is for Scottie." }
];

const COMMENTATORS = [
  "Jim Nantz",
  "Trevor Immelman",
  "Dan Hicks",
  "Johnny Miller (in spirit)"
];

// ===== DOM =====
const gateCard = document.getElementById("gateCard");
const resultsCard = document.getElementById("resultsCard");
const statePill = document.getElementById("statePill");

const pw = document.getElementById("pw");
const runBtn = document.getElementById("runBtn");
const pwMsg = document.getElementById("pwMsg");

const broadcast = document.getElementById("broadcast");
const resultsMeta = document.getElementById("resultsMeta");
const draftOrder = document.getElementById("draftOrder");

// ===== Helpers =====
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function nowISO(){ return new Date().toISOString(); }

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function fmt(ft){ return `${ft.toFixed(1)} ft`; }

function line(html){
  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = html;
  broadcast.appendChild(div);
  broadcast.scrollTop = broadcast.scrollHeight;
}

async function loadOfficial(){
  const res = await fetch(`results.json?v=${Date.now()}`, { cache: "no-store" });
  if(!res.ok) return null;
  const data = await res.json();
  if(!data || !data.finalOrder || !data.finalOrder.length) return null;
  return data;
}

function renderFinalOrder(order){
  draftOrder.innerHTML = "";
  order.sort((a,b)=>a.pick-b.pick).forEach(x=>{
    const li = document.createElement("li");
    li.innerHTML = `<strong>#${x.pick}</strong> — ${x.name}`;
    draftOrder.appendChild(li);
  });
}

function lockUI(msg){
  statePill.textContent = "Locked";
  runBtn.disabled = true;
  runBtn.textContent = "ALREADY RUN";
  pw.disabled = true;
  pw.value = "";
  pw.placeholder = "This tournament has already been run (locked).";
  if(msg){
    pwMsg.classList.remove("hidden");
    pwMsg.innerHTML = msg;
  }
}

function shotCommentary(name, dist, holeIndex, isFinal){
  const c = pick(COMMENTATORS);
  const distTxt = fmt(dist);

  const good = dist <= 10;
  const ok = dist > 10 && dist <= 25;
  const bad = dist > 25;

  const pre = [
    `${c}: <span class="who">${name}</span> is on the tee.`,
    `${c}: Here we go… <span class="who">${name}</span> steps in.`,
    `${c}: You can feel it. <span class="who">${name}</span> knows what’s on the line.`
  ];

  const postGood = [
    `${c}: Oh my… <span class="good big">${distTxt}</span>. That’s a dart.`,
    `${c}: That’s pure. <span class="good big">${distTxt}</span>. Someone check the grooves on that wedge.`,
    `${c}: That is *dangerous* close. <span class="good big">${distTxt}</span>.`
  ];
  const postOk = [
    `${c}: Not bad… <span class="big">${distTxt}</span>. That’ll play.`,
    `${c}: Solid. <span class="big">${distTxt}</span>. Now the pressure shifts.`,
    `${c}: He’ll take it. <span class="big">${distTxt}</span>.`
  ];
  const postBad = [
    `${c}: Ooooh… he’s not going to like this one. <span class="bad big">${distTxt}</span>.`,
    `${c}: That is… not ideal. <span class="bad big">${distTxt}</span>.`,
    `${c}: You can’t do that on this stage. <span class="bad big">${distTxt}</span>.`
  ];

  const finalSpice = isFinal ? [
    `Jim Nantz: This one is for Scottie.`,
    `Dan Hicks: One shot away from winning yourself Scottie, my friend.`,
    `Trevor Immelman: Your entire offseason… comes down to this.`
  ] : [];

  const preLine = pick(pre);
  const spice = (finalSpice.length && Math.random() < 0.55) ? ` <span class="tag">${pick(finalSpice)}</span>` : "";
  const postLine = good ? pick(postGood) : (ok ? pick(postOk) : pick(postBad));

  return { pre: preLine + spice, post: postLine };
}

function buildPlayByPlay(results){
  // Converts results.json rounds into cinematic broadcast lines
  const all = [];
  results.rounds.forEach((r, idx)=>{
    const isFinal = (idx === results.rounds.length-1);
    all.push({ type:"header", text:`ROUND ${r.round}: ${r.hole.name} — ${r.hole.course} (${r.hole.yards}y)` });
    if(isFinal){
      all.push({ type:"header", text:`FINAL ROUND. Winner gets #1… and Scottie.` });
    }

    r.shots.forEach(s=>{
      all.push({ type:"pre", who:s.name, holeIndex:idx, isFinal });
      all.push({ type:"reveal", who:s.name, dist:s.dist, holeIndex:idx, isFinal });
    });

    all.push({ type:"elim", text:`ELIMINATED: ${r.eliminated} — Pick #${r.pickAwarded}` });

    if(isFinal){
      all.push({ type:"winner", text:`WINNER: ${results.finalOrder.find(x=>x.pick===1).name} — Pick #1 (Scottie secured)` });
    }
  });
  return all;
}

async function playBroadcast(results){
  broadcast.innerHTML = "";
  resultsMeta.textContent = `OFFICIAL • Generated ${new Date(results.generated_at).toLocaleString()}`;

  const script = buildPlayByPlay(results);

  for(const item of script){
    if(item.type === "header"){
      line(`<div class="big">${item.text}</div>`);
      await sleep(900);
    } else if(item.type === "pre"){
      const s = shotCommentary(item.who, 18.0, item.holeIndex, item.isFinal); // dist placeholder for pre
      line(`${s.pre}`);
      await sleep(800);
    } else if(item.type === "reveal"){
      const s = shotCommentary(item.who, item.dist, item.holeIndex, item.isFinal);
      // reveal distance dramatically
      line(`${s.post}`);
      await sleep(900);
    } else if(item.type === "elim"){
      line(`<div class="bad"><strong>${item.text}</strong></div>`);
      await sleep(1200);
    } else if(item.type === "winner"){
      line(`<div class="good big"><strong>${item.text}</strong></div>`);
      await sleep(1600);
    }
  }

  renderFinalOrder(results.finalOrder);
}

// ===== Initial: if already run, lock and show results =====
(async function init(){
  const official = await loadOfficial();
  if(official){
    statePill.textContent = "Already Run";
    gateCard.classList.add("hidden");
    resultsCard.classList.remove("hidden");
    await playBroadcast(official);
    return;
  }
})();

// ===== Run button flow =====
runBtn.addEventListener("click", async ()=>{
  const typed = pw.value;

  pwMsg.classList.remove("hidden");
  pwMsg.innerHTML = "";

  // If already run while page open
  const existing = await loadOfficial();
  if(existing){
    lockUI(`Official results already exist. This run is locked.`);
    gateCard.classList.add("hidden");
    resultsCard.classList.remove("hidden");
    await playBroadcast(existing);
    return;
  }

  if(typed !== PASSWORD){
    pwMsg.innerHTML = `<strong>Incorrect password.</strong> Try again.`;
    return;
  }

  // Show success + bold password exactly as requested
  pwMsg.innerHTML = `<strong>Password successful.</strong> <br><br><strong style="font-size:18px">${PASSWORD}</strong><br><br>Launching broadcast…`;
  statePill.textContent = "Arming Broadcast";

  await sleep(1200);

  // Switch to broadcast mode and start polling for official results
  gateCard.classList.add("hidden");
  resultsCard.classList.remove("hidden");
  resultsMeta.textContent = "Waiting for the official one-time run to be generated…";

  line(`<div class="big">Commissioner has armed the broadcast.</div>`);
  await sleep(700);
  line(`<div class="muted">If you are JCommish: go to GitHub → Actions → “Generate Official Draft Order” → Run workflow.</div>`);
  await sleep(900);
  line(`<div class="muted">Everyone else: keep this page open. The second results drop, we go live.</div>`);

  // Poll for official results
  for(let i=0;i<120;i++){
    const official = await loadOfficial();
    if(official){
      await playBroadcast(official);
      return;
    }
    resultsMeta.textContent = "Still waiting for official results… (refreshing automatically)";
    await sleep(3000);
  }

  resultsMeta.textContent = "Still not seeing official results. If you’re JCommish, run the GitHub Action once, then refresh.";
});
