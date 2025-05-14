const ailments = [
  { name: "Border Wall Bone", x: 270, y: 180, w: 60, h: 28, tip: "Build it up, don't let it fall down!" },
  { name: "Tax Cut Tickle", x: 285, y: 260, w: 55, h: 28, tip: "Trickle down if you can handle it!" },
  { name: "Twitter Thumb", x: 170, y: 370, w: 38, h: 38, tip: "The most difficult extraction, it keeps twitching!" },
  { name: "Tariff Tummy", x: 265, y: 410, w: 70, h: 38, tip: "Trade wars are easy to win, surgery isn't!" },
  { name: "Budget Butterfly", x: 350, y: 340, w: 50, h: 28, tip: "Deficits don't matter until Democrats are in charge!" },
  { name: "Infrastructure Week Funny Bone", x: 120, y: 600, w: 45, h: 28, tip: "Always coming next week!" },
  { name: "Federal Reserve Heartburn", x: 400, y: 600, w: 45, h: 28, tip: "Lower those rates or hear the buzzer!" },
  { name: "Coal Comeback Calf", x: 250, y: 800, w: 60, h: 28, tip: "Clean coal, the cleanest extraction!" }
];

const overlay = document.getElementById('ailments-overlay');
const status = document.getElementById('status');
const cart = document.getElementById('cart');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
let removedCount = 0;
let score = 0;
let time = 0;
let timerInterval = null;
let gameActive = true;
let dragging = false;
let dragAilment = null;
let dragOffset = {x:0, y:0};
let buzzerSounds = [
  new Audio('assets/fake-news.mp3'),
  new Audio('assets/wrong.mp3')
];
let backgroundMusic = new Audio('assets/background-music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5;
let cartContainer = document.getElementById('cart-container');

// Draw ailments
overlay.innerHTML = '';
ailments.forEach((a, i) => {
  let el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", a.x);
  el.setAttribute("y", a.y);
  el.setAttribute("width", a.w);
  el.setAttribute("height", a.h);
  el.setAttribute("class", "ailment");
  el.setAttribute("data-index", i);
  el.title = a.tip;
  overlay.appendChild(el);
});

// Tweezers cursor
const tweezers = document.getElementById('tweezers');
document.getElementById('game-container').addEventListener('mousemove', e => {
  tweezers.style.display = 'block';
  let rect = e.currentTarget.getBoundingClientRect();
  tweezers.style.left = (e.clientX - rect.left - 20) + 'px';
  tweezers.style.top = (e.clientY - rect.top - 20) + 'px';
});

document.getElementById('game-container').addEventListener('mouseleave', () => {
  tweezers.style.display = 'none';
});

// Improved drag logic
let dragMoveHandler = null;
let dragUpHandler = null;

overlay.addEventListener('mousedown', function(e) {
  if (!gameActive) return;
  if (e.target.classList.contains('ailment') && !e.target.classList.contains('removed')) {
    dragging = true;
    dragAilment = e.target;
    dragAilment.classList.add('dragging');
    let idx = dragAilment.dataset.index;
    let a = ailments[idx];
    let x = parseFloat(dragAilment.getAttribute('x'));
    let y = parseFloat(dragAilment.getAttribute('y'));
    let svgRect = overlay.getBoundingClientRect();
    let mouseX = e.clientX - svgRect.left;
    let mouseY = e.clientY - svgRect.top;
    dragOffset.x = mouseX - x;
    dragOffset.y = mouseY - y;
    dragAilment.setAttribute('opacity', 0.8);
    dragAilment.setAttribute('pointer-events', 'none');
    dragAilment.parentNode.appendChild(dragAilment);
    document.body.style.cursor = 'grabbing';

    dragMoveHandler = function(ev) {
      if (!dragging || !dragAilment) return;
      let svgRect = overlay.getBoundingClientRect();
      let mouseX = ev.clientX - svgRect.left;
      let mouseY = ev.clientY - svgRect.top;
      dragAilment.setAttribute('x', mouseX - dragOffset.x);
      dragAilment.setAttribute('y', mouseY - dragOffset.y);
      // Cart highlight
      let cartRect = cartContainer.getBoundingClientRect();
      if (
        ev.clientX > cartRect.left && ev.clientX < cartRect.right &&
        ev.clientY > cartRect.top && ev.clientY < cartRect.bottom
      ) {
        cartContainer.classList.add('drag-over');
      } else {
        cartContainer.classList.remove('drag-over');
      }
    };
    dragUpHandler = function(ev) {
      if (!dragging || !dragAilment) return;
      let cartRect = cartContainer.getBoundingClientRect();
      let mouseX = ev.clientX;
      let mouseY = ev.clientY;
      let idx = dragAilment.dataset.index;
      let a = ailments[idx];
      // Check for edge collision (if too far from original slot)
      let x = parseFloat(dragAilment.getAttribute('x'));
      let y = parseFloat(dragAilment.getAttribute('y'));
      cartContainer.classList.remove('drag-over');
      if (
        mouseX > cartRect.left && mouseX < cartRect.right &&
        mouseY > cartRect.top && mouseY < cartRect.bottom
      ) {
        extractAilment(dragAilment);
      } else if (
        x < a.x - 10 ||
        x > a.x + 10 ||
        y < a.y - 10 ||
        y > a.y + 10
      ) {
        buzz(dragAilment);
      } else {
        resetAilment(dragAilment);
      }
      dragging = false;
      dragAilment.classList.remove('dragging');
      dragAilment.setAttribute('pointer-events', 'all');
      dragAilment = null;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', dragMoveHandler);
      document.removeEventListener('mouseup', dragUpHandler);
    };
    document.addEventListener('mousemove', dragMoveHandler);
    document.addEventListener('mouseup', dragUpHandler);
  }
});

// Timer
function startTimer() {
  timerInterval = setInterval(() => {
    time++;
    timerEl.textContent = `Time: ${time}`;
    if (time >= 120) {
      endGame(false);
    }
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}

// Score
function updateScore(val) {
  score += val;
  scoreEl.textContent = `Score: ${score}`;
}

function extractAilment(el) {
  el.classList.add('removed', 'animate-extract');
  let idx = el.dataset.index;
  let a = ailments[idx];
  removedCount++;
  updateScore(100 - time); // Faster = more points
  setTimeout(() => {
    addToCart(a.name);
    el.classList.remove('animate-extract');
  }, 700);
  status.textContent = `Extracted: ${a.name}!`;
  if (removedCount === ailments.length) {
    endGame(true);
  }
}

function addToCart(name) {
  let li = document.createElement('li');
  li.textContent = name;
  cart.appendChild(li);
}

function resetAilment(el) {
  let idx = el.dataset.index;
  let a = ailments[idx];
  el.setAttribute('x', a.x);
  el.setAttribute('y', a.y);
  el.setAttribute('opacity', 1);
}

function buzz(el) {
  tweezers.classList.add('animate-buzz');
  setTimeout(() => tweezers.classList.remove('animate-buzz'), 600);
  buzzerSounds[Math.floor(Math.random()*buzzerSounds.length)].play();
  status.textContent = "FAKE NEWS! TRY AGAIN!";
  updateScore(-25);
  resetAilment(el);
  dragging = false;
  dragAilment = null;
}

function endGame(win) {
  gameActive = false;
  stopTimer();
  if (win) {
    status.textContent = "YOU WIN! MAKE AMERICAN HEALTH GREAT AGAIN!";
  } else {
    status.textContent = "TIME'S UP! OPERATION FAILED!";
  }
}

// Start game
function resetGame() {
  removedCount = 0;
  score = 0;
  time = 0;
  gameActive = true;
  status.textContent = '';
  timerEl.textContent = 'Time: 0';
  scoreEl.textContent = 'Score: 0';
  cart.innerHTML = '';
  document.querySelectorAll('.ailment').forEach((el, i) => {
    el.classList.remove('removed', 'animate-extract');
    el.setAttribute('x', ailments[i].x);
    el.setAttribute('y', ailments[i].y);
    el.setAttribute('opacity', 1);
  });
  startTimer();
}

resetGame();

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    backgroundMusic.play().catch(()=>{});
  }, 500);
}); 