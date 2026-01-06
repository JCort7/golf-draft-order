const fs = require("fs");
const crypto = require("crypto");

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
  { name:"Golden Bell (12)", course:"Augusta National", yards:155 },
  { name:"The Cliffs (7)", course:"Pebble Beach", yards:106 },
  { name:"Island Green (17)", course:"TPC Sawgrass", yards:137 },
  { name:"Stadium (16)", course:"TPC Scottsdale", yards:163 },
  { name:"Postage Stamp (8)", course:"Royal Troon", yards:123 },
  { name:"Redan (15)", course:"North Berwick", yards:192 },
  { name:"Devil’s Cauldron (16)", course:"Cypress Point", yards:231 },
  { name:"Short (6)", course:"Pine Valley", yards:160 },
  { name:"Corner (13)", course:"Merion East", yards:115 },
  { name:"Short (17)", course:"St Andrews (Old Course)", yards:115 },
  { name:"FINAL HOLE", course:"The Scottie Bowl", yards:155 }
];

function rng(){
  const b = crypto.randomBytes(4);
  return b.readUInt32BE(0) / 0xffffffff;
}

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rng()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function shotDistance(roundIndex){
  // Gets slightly tighter as the field shrinks
  const base = 30 - roundIndex * 1.6;
  const spread = Math.max(7.5, 14 - roundIndex * 0.7);

  // pseudo-normal by averaging uniforms
  const u = (rng()+rng()+rng()+rng())/4;
  let dist = base + (u - 0.5)*2*spread;

  // nerves spike sometimes
  if(rng() < 0.10) dist += 16 + rng()*26;

  // clamp
  dist = Math.max(0.7, Math.min(85, dist));

  // 0.1 precision
  return Math.round(dist * 10) / 10;
}

function simulate(){
  // Enforce one-time run by refusing to overwrite existing results with finalOrder
  const path = "results.json";
  if(fs.existsSync(path)){
    try{
      const existing = JSON.parse(fs.readFileSync(path,"utf8"));
      if(existing && existing.finalOrder && existing.finalOrder.length){
        console.log("Already run (results.json contains finalOrder). Exiting.");
        process.exit(0);
      }
    }catch{}
  }

  let remaining = shuffle(PLAYERS); // round 1 random tee order
  const rounds = [];
  const picks = {}; // name -> pick

  for(let r=0; r<HOLES.length && remaining.length>1; r++){
    const hole = HOLES[r];

    // Tee order rule:
    // - closest last next round
    // - second closest 2nd to last, etc.
    // We can implement by teeing off in reverse of previous ranking.
    // Round 1 already randomized.

    const shots = remaining.map(name=>{
      return { name, dist: shotDistance(r) };
    });

    // Determine ranking by distance (low is best)
    const ranked = [...shots].sort((a,b)=>a.dist - b.dist);

    // Furthest eliminated
    const eliminated = ranked[ranked.length-1].name;
    const pickAwarded = remaining.length; // 12 -> pick 12, 11 -> pick 11, etc.
    picks[eliminated] = pickAwarded;

    // Build next tee order:
    // We want worst-to-best tee order next round (best goes last)
    const nextOrder = ranked.map(x=>x.name); // best..worst
    // Remove eliminated from remaining
    remaining = nextOrder.filter(n=>n !== eliminated).reverse(); // worst..best tee order

    rounds.push({
      round: r+1,
      hole,
      teeOrder: shots.map(s=>s.name),
      shots: ranked, // store ranked so reveal is dramatic
      eliminated,
      pickAwarded
    });

    if(remaining.length === 1){
      picks[remaining[0]] = 1;
    }
  }

  const finalOrder = Object.entries(picks)
    .map(([name, pick])=>({ name, pick }))
    .sort((a,b)=>a.pick-b.pick);

  const payload = {
    mode: "OFFICIAL",
    generated_at: new Date().toISOString(),
    rounds,
    finalOrder
  };

  fs.writeFileSync("results.json", JSON.stringify(payload, null, 2));
  console.log("Wrote official results.json");
}

simulate();
