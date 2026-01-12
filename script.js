let popisName = "";
let items = {};

let cameraOn = false;
let html5QrCode = null;

const barcodeInput = document.getElementById("barcodeInput");
const listContainer = document.getElementById("list");
const totalCountEl = document.getElementById("totalCount");
const popisInputEl = document.getElementById("popisName");
const startBtnEl = document.getElementById("startBtn");
const resetBtnEl = document.getElementById("resetBtn");
const activePopisEl = document.getElementById("activePopis");
const cameraBtnEl = document.getElementById("cameraBtn");
const readerEl = document.getElementById("reader");

let audioUnlocked = false;

// ✅ AUDIO UNLOCK (mobile browsers require a real user gesture)
function unlockAudio() {
  const beep = document.getElementById("beepSound");
  if (!beep) return;

  // već otključano
  if (audioUnlocked) return;

  try {
    beep.volume = 0.0;       // tiho otključavanje
    beep.currentTime = 0;

    const p = beep.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        beep.pause();
        beep.currentTime = 0;
        beep.volume = 1.0;
        audioUnlocked = true;
        // console.log("AUDIO UNLOCKED");
      }).catch((err) => {
        // iOS/Android blokira dok ne bude pravi gesture - probamo opet na sledeći klik
        // console.warn("Audio unlock blocked:", err);
      });
    }
  } catch (e) {
    // console.warn("Audio unlock error:", e);
  }
}

// ✅ Play beep (safe)
function playBeep() {
  const beep = document.getElementById("beepSound");
  if (!beep) return;

  // fallback feedback na telefonu
  if (navigator.vibrate) navigator.vibrate(40);

  beep.volume = 1.0;
  beep.currentTime = 0;

  const p = beep.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // Ako je blokirano, pokušaj otključavanje pa sledeći put će raditi
      unlockAudio();
    });
  }
}

function saveState() {
  localStorage.setItem("popisAppState", JSON.stringify({ popisName, items }));
}

function loadState() {
  const raw = localStorage.getItem("popisAppState");
  if (!raw) return;

  const state = JSON.parse(raw);
  popisName = state.popisName || "";
  items = state.items || {};

  if (popisName) {
    popisInputEl.value = popisName;
    popisInputEl.disabled = true;
    startBtnEl.innerText = "Popis aktivan";
    startBtnEl.style.background = "#d32f2f";
    startBtnEl.disabled = true;
    activePopisEl.innerText = "Aktivni popis: " + popisName;
    resetBtnEl.style.display = "block";
  }

  renderList();
}

function clearState() {
  localStorage.removeItem("popisAppState");
}

function startPopis() {
  // ✅ user gesture -> unlock audio
  unlockAudio();

  const nameInput = popisInputEl.value.trim();
  if (!nameInput) return alert("Unesi naziv popisa!");

  popisName = nameInput;
  popisInputEl.disabled = true;
  startBtnEl.innerText = "Popis aktivan";
  startBtnEl.style.background = "#d32f2f";
  startBtnEl.disabled = true;
  activePopisEl.innerText = "Aktivni popis: " + popisName;
  resetBtnEl.style.display = "block";

  saveState();
}

function resetPopis() {
  items = {};
  popisName = "";
  clearState();

  popisInputEl.disabled = false;
  popisInputEl.value = "";
  startBtnEl.innerText = "Start Popis";
  startBtnEl.style.background = "#2196F3";
  startBtnEl.disabled = false;

  activePopisEl.innerText = "";
  resetBtnEl.style.display = "none";

  barcodeInput.value = "";
  renderList();

  if (cameraOn) toggleCamera();
}

function addItem(code) {
  if (!popisName) return alert("Pokreni popis!");

  if (!items[code]) items[code] = { quantity: 1 };
  else items[code].quantity++;

  playBeep();

  renderList();
  saveState();
}

function getTotal() {
  return Object.values(items).reduce((s, it) => s + it.quantity, 0);
}

function changeQty(code, delta) {
  if (!items[code]) return;

  items[code].quantity += delta;
  if (items[code].quantity <= 0) delete items[code];

  renderList();
  saveState();
}

function renderList() {
  listContainer.innerHTML = "";

  Object.keys(items).forEach(code => {
    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
      <div>${code}</div>
      <div class="qty-controls">
        <button class="minus" onclick="changeQty('${code}', -1)">-</button>
        <span>${items[code].quantity}</span>
        <button onclick="changeQty('${code}', 1)">+</button>
      </div>
    `;
    listContainer.appendChild(row);
  });

  totalCountEl.innerText = getTotal();
}

// ✅ dodatno: unlock na fokus u input (telefon)
barcodeInput.addEventListener("focus", unlockAudio);
popisInputEl.addEventListener("focus", unlockAudio);

// Enter manual input
barcodeInput.addEventListener("keyup", e => {
  if (e.key === "Enter" && barcodeInput.value.trim() !== "") {
    unlockAudio(); // ✅ user action -> unlock
    addItem(barcodeInput.value.trim());
    barcodeInput.value = "";
  }
});

// Export CSV
function exportCSV() {
  unlockAudio();

  if (!popisName) return alert("Pokreni popis!");
  if (Object.keys(items).length === 0) return alert("Nema stavki!");

  const today = new Date().toLocaleDateString("sr-RS");
  let csv = `Datum;${today}\nArtikal;Kolicina\n`;

  Object.keys(items).forEach(code => {
    csv += `${code};${items[code].quantity}\n`;
  });

  csv += `Ukupno;${getTotal()}\n`;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = popisName + ".csv";
  a.click();

  URL.revokeObjectURL(url);
}

// Simple mail starter
function sendEmail() {
  unlockAudio();

  const email = "velinastr@gmail.com";
  const subject = encodeURIComponent("Popis - " + popisName);
  const body = encodeURIComponent("Popis završen. CSV fajl možeš poslati preko Export CSV opcije.");
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

// ✅ kamera: unlock pre start-a (najbitnije za mobile)
async function toggleCamera() {
  if (!cameraOn) {
    if (!popisName) return alert("Pokreni popis!");

    unlockAudio(); // ✅ TAP na dugme kamera -> user gesture

    readerEl.style.display = "block";
    html5QrCode = new Html5Qrcode("reader");

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");

      if (videoDevices.length === 0) {
        alert("Nema kamera na uređaju.");
        return;
      }

      let backCamera = videoDevices.find(d => d.label.toLowerCase().includes("back"));
      if (!backCamera) backCamera = videoDevices[videoDevices.length - 1];

      await html5QrCode.start(
        backCamera.deviceId,
        {
          fps: 20,
          qrbox: { width: 360, height: 360 },
          aspectRatio: 1.0,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          videoConstraints: {
            deviceId: backCamera.deviceId,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "environment",
            focusMode: "continuous"
          }
        },
        decodedText => {
          // ✅ decodedText okida addItem -> beep
          addItem(decodedText);
        }
      );

      cameraOn = true;
      cameraBtnEl.innerText = "Zaustavi kameru";

    } catch (err) {
      alert("Greška sa kamerom: " + err);
      readerEl.style.display = "none";
    }

  } else {
    await html5QrCode.stop();
    await html5QrCode.clear();
    readerEl.style.display = "none";
    cameraOn = false;
    cameraBtnEl.innerText = "Skeniraj kamerom";
  }
}

loadState();
