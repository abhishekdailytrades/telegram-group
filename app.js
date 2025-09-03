const express = require("express");
require('dotenv').config()
const app = express();
const port = process.env?.PORT || 8000;
const supportGroupRouter = require("./src/routes/support-group.route");

app.use(express.json())



app.get("/", (req, res) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Welcome</title>
<style>
  :root{
    --bg1: #fff8fb;
    --bg2: #f6fff7;
    --accent: #ff6b9a;
    --accent-2: #ffc17a;
    --soft: rgba(0,0,0,0.06);
  }

  html,body{
    height:100%;
    margin:0;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    background: linear-gradient(180deg,var(--bg1),var(--bg2));
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }

  .stage{
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    position:relative;
    overflow:hidden;
    padding:48px 20px;
    box-sizing:border-box;
  }

  .card{
    width:min(960px, 94%);
    background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.82));
    border-radius:20px;
    box-shadow: 0 10px 30px var(--soft), inset 0 1px 0 rgba(255,255,255,0.6);
    padding:48px;
    text-align:center;
    position:relative;
    z-index:2;
    overflow:visible;
  }

  h1{
    margin:0 0 12px 0;
    font-size: clamp(28px, 4.5vw, 44px);
    letter-spacing: -0.02em;
    color:#222;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:14px;
  }

  .emoji{
    font-size:1.05em;
    transform:translateY(-2px);
  }

  p.lead{
    margin:0 0 22px 0;
    color:#555;
    font-size: clamp(14px, 1.6vw, 18px);
  }

  .btn{
    display:inline-block;
    margin-top:8px;
    padding:10px 20px;
    border-radius:999px;
    font-weight:600;
    background: linear-gradient(90deg,var(--accent),var(--accent-2));
    color:white;
    text-decoration:none;
    box-shadow: 0 6px 18px rgba(255,107,154,0.18);
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .btn:hover{ transform: translateY(-4px); box-shadow: 0 12px 30px rgba(255,107,154,0.16); }

  /* decorative frame */
  .frame{
    position:absolute;
    inset:8px;
    border-radius:28px;
    pointer-events:none;
    box-shadow: 0 30px 60px rgba(24,24,50,0.06);
    z-index:1;
  }

  /* flower/petal layer */
  .petal-layer{
    position:absolute;
    inset:0;
    pointer-events:none;
    z-index:0;
    overflow:hidden;
  }

  .petal{
    position:absolute;
    top:-10%;
    width:18px;
    height:22px;
    transform-origin:center;
    opacity:0.95;
    will-change: transform, top, opacity;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08));
    animation-name: fall, sway, spinfade;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }

  /* Create a petal shape using pseudo-element inside SVG-shaped div */
  .petal svg{ display:block; width:100%; height:100%; }

  /* keyframes */
  @keyframes fall {
    0% { top:-10%; }
    100% { top:110%; }
  }
  @keyframes sway {
    0% { transform: translateX(0) rotate(-10deg); }
    50% { transform: translateX(40px) rotate(10deg); }
    100% { transform: translateX(-20px) rotate(-10deg); }
  }
  @keyframes spinfade {
    0% { opacity:1; transform: translateY(0) rotate(0); }
    80% { opacity:1; }
    100% { opacity:0.06; transform: translateY(8px) rotate(120deg); }
  }

  /* small responsive helper for mobile */
  @media (max-width:600px){
    .card{ padding:28px; border-radius:16px; }
    h1{ gap:10px; }
  }

  /* little flourish at bottom */
  .ground{
    margin-top:28px;
    height:14px;
    border-radius:999px;
    width:140px;
    background: linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02));
    margin-left:auto; margin-right:auto;
    opacity:0.7;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="frame" aria-hidden="true"></div>

    <div class="card" role="main" aria-label="Welcome card">
      <h1>
        <span class="emoji">🌸</span>
        Welcome to our Telegram bot project
        <span class="emoji">🌿</span>
      </h1>
      <p class="lead">
        We're so glad you're here. Take a breath — enjoy the gentle fall of petals and a calm moment to start your day.
      </p>

      <a class="btn" href="#" onclick="alert('Hello — welcome!'); return false;">Say Hi</a>

      <div class="ground" aria-hidden="true"></div>
    </div>

    <div class="petal-layer" id="petal-layer" aria-hidden="true"></div>
  </div>

<script>
  // Generate many petals with randomized properties
  (function createPetals(){
    const layer = document.getElementById('petal-layer');
    const petalCount = 36; // change for more/less petals
    const colors = [
      '#ff5d8f', '#ff9fb8', '#ffd0b0', '#ffb7d0', '#ffd9ec', '#ffc9a8'
    ];

    for(let i=0;i<petalCount;i++){
      const el = document.createElement('div');
      el.className = 'petal';

      // random horizontal start (0-100%)
      const left = Math.random()*110 - 5; // allow a bit off-edge
      el.style.left = left + '%';

      // random size
      const size = 12 + Math.random()*28; // 12..40px
      el.style.width = size + 'px';
      el.style.height = Math.round(size * 1.1) + 'px';

      // choose color
      const fill = colors[Math.floor(Math.random()*colors.length)];

      // random animation duration and delay
      const duration = 6 + Math.random()*10; // 6..16s
      const delay = Math.random()*-12; // negative to stagger initial positions

      el.style.animationDuration = duration + 's, ' + (3 + Math.random()*4) + 's, ' + duration + 's';
      el.style.animationDelay = delay + 's, 0s, ' + delay + 's';

      // slightly different opacity
      el.style.opacity = (0.7 + Math.random()*0.35).toFixed(2);

      // create an inline SVG petal shape
      el.innerHTML = \`
        <svg viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 0 C6 0 1 5 2 11 C3.2 18 10 24 10 24 C10 24 16 18 18 11 C19 5 14 0 10 0 Z" fill="\${fill}" />
        </svg>\`;
      layer.appendChild(el);
    }
  })();
</script>
</body>
</html>`);
});

app.use("/api/support-group", supportGroupRouter);

app.listen(port, () => {
  console.log(`server run on port http://localhost:${port}`);
});
