// Create and inject the clock UI
function createClockUI() {
  const container = document.createElement('div');
  container.id = 'my-extension-clock-container';
  
  container.innerHTML = `
    <div id="my-extension-clock-time">--:--:--</div>
    <div class="my-extension-controls">
      <div class="my-extension-input-group">
        <input type="time" id="my-extension-alarm-time" step="1">
      </div>
      <button id="my-extension-set-alarm-btn" class="my-extension-btn">Set Alarm</button>
      <div id="my-extension-alarm-status">No alarm set</div>
    </div>
  `;

  document.body.appendChild(container);
  
  // Make it draggable
  makeDraggable(container);
  
  // Start the clock
  updateTime();
  setInterval(updateTime, 1000);

  // Event listeners
  document.getElementById('my-extension-set-alarm-btn').addEventListener('click', setAlarm);
}

let alarmTime = null;
let alarmTriggered = false;
let audio = null; // Re-use audio object

function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour12: false });
  const display = document.getElementById('my-extension-clock-time');
  if (display) {
    display.textContent = timeString;
  }

  // Check alarm
  if (alarmTime && !alarmTriggered) {
    // Format now to HH:MM or HH:MM:SS to match input
    // Input type="time" gives HH:MM or HH:MM:SS depending on step. 
    // We used step="1" so we might get seconds.
    // Let's compare strictly.
    
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentSeconds = String(now.getSeconds()).padStart(2, '0');
    
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const currentTimeStrWithSeconds = `${currentHours}:${currentMinutes}:${currentSeconds}`;

    // Alarm input value is usually HH:MM or HH:MM:SS
    if (alarmTime === currentTimeStr || alarmTime === currentTimeStrWithSeconds) {
      triggerAlarm();
    }
  }
}

function setAlarm() {
  const input = document.getElementById('my-extension-alarm-time');
  const status = document.getElementById('my-extension-alarm-status');
  
  if (input.value) {
    alarmTime = input.value;
    alarmTriggered = false;
    status.textContent = `Alarm set for ${alarmTime}`;
    status.style.color = '#4caf50';
    
    // Stop any previous alarm
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    document.getElementById('my-extension-clock-container').classList.remove('alarm-ringing');
  } else {
    status.textContent = 'Please select a time';
    status.style.color = '#ff9800';
  }
}

function triggerAlarm() {
  alarmTriggered = true;
  const container = document.getElementById('my-extension-clock-container');
  container.classList.add('alarm-ringing');
  
  const status = document.getElementById('my-extension-alarm-status');
  status.textContent = "ALARM! Click to dismiss";
  status.style.color = '#ff5252';
  
  // Play sound
  // Using a simple beep or online sound. 
  // Since we can't bundle a large mp3 easily without adding it to web_accessible_resources, 
  // we'll try a data URI or a standard online beep if allowed by CSP.
  // For safety/reliability in this demo, I'll use a generated oscillator beep if possible, 
  // but content scripts can't always access AudioContext easily due to autoplay policies.
  // Let's try a simple Audio object with a remote URL or a base64 short beep.
  
  // Short beep base64 (approx 1 sec)
  const beepUrl = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // truncated for brevity, will use a real one or just visual if audio fails.
  
  // Better approach: Create an AudioContext beep
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 440;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
      osc.stop(ctx.currentTime + 1);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }

  // Add click listener to dismiss
  container.addEventListener('click', dismissAlarm, { once: true });
}

function dismissAlarm() {
  const container = document.getElementById('my-extension-clock-container');
  container.classList.remove('alarm-ringing');
  const status = document.getElementById('my-extension-alarm-status');
  status.textContent = "Alarm dismissed";
  status.style.color = '#aaa';
  alarmTime = null;
}

// Draggable Logic
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // Don't drag if clicking inputs or buttons
    if (['INPUT', 'BUTTON'].includes(e.target.tagName)) return;
    
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    // Remove right positioning once dragged, so left takes over
    element.style.right = 'auto';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createClockUI);
} else {
  createClockUI();
}
