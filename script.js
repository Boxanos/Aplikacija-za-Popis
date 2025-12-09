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

function playBeep() {
  const beep = document.getElementById("beepSound");
  beep.currentTime = 0;
  beep.play().catch(() => {});
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
  const nameInput = popisInputEl.value.trim();
  if (nameInput === "") return alert("Unesi naziv popisa!");

  popisName = nameInput;
  popisInputEl.disabled = true;

  startBtnEl.innerText = "Popis aktivan";
  startBtnEl.style.background = "#d32f2f";
  startBtnEl.disabled = true;

  activePopisEl.innerText = "Aktivni popis: " + popisName;
  resetBtnEl.style.display = "block";

  saveState();
  alert("Popis '" + popisName + "' je započet!");
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

barcodeInput.addEventListener("keyup", e => {
  if (e.key === "Enter" && barcodeInput.value.trim() !== "") {
    addItem(barcodeInput.value.trim());
    barcodeInput.value = "";
  }
});

function exportCSV() {
  if (!popisName) return alert("Pokreni popis!");
  if (Object.keys(items).length === 0) return alert("Nema stavki!");

  const today = new Date().toLocaleDateString("sr-RS");
  let csv = `Datum;${today}\nArtikal;Kolicina\n`;

  Object.keys(items).forEach(code => {
    csv += `${code};${items[code].quantity}\n`;
  });

  csv += `Ukupno;${getTotal()}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = popisName + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  alert("CSV je sačuvan!");
}

function sendEmail() {
  if (!popisName) return alert("Pokreni popis!");
  if (Object.keys(items).length === 0) return alert("Nema stavki!");

  const email = "velinastr@gmail.com";
  const today = new Date().toLocaleDateString("sr-RS");

  let csv = `Datum: ${today}\nArtikal ; Kolicina\n`;
  Object.keys(items).forEach(code => {
    csv += `${code} ; ${items[code].quantity}\n`;
  });
  csv += `Ukupno ; ${getTotal()}\n`;

  const subject = encodeURIComponent("Popis - " + popisName);
  const body = encodeURIComponent(csv);

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

async function toggleCamera() {
  if (!cameraOn) {
    if (!popisName) return alert("Pokreni popis!");

    readerEl.style.display = "block";
    html5QrCode = new Html5Qrcode("reader");

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        decodedText => addItem(decodedText)
      );

      cameraOn = true;
      cameraBtnEl.innerText = "Zaustavi kameru";

    } catch (err) {
      alert("Greška sa kamerom!");
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
