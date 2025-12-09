// --------------------
//  GLOBALNE PROMENLJIVE
// --------------------

let popisName = "";
let items = {};

// Kamera
let cameraOn = false;
let html5QrCode = null;

// Uzimamo elemente iz DOM-a
const barcodeInput   = document.getElementById("barcodeInput");
const listContainer  = document.getElementById("list");
const totalCountEl   = document.getElementById("totalCount");
const popisInputEl   = document.getElementById("popisName");
const startBtnEl     = document.getElementById("startBtn");
const resetBtnEl     = document.getElementById("resetBtn");
const activePopisEl  = document.getElementById("activePopis");
const cameraBtnEl    = document.getElementById("cameraBtn");
const readerEl       = document.getElementById("reader");

// --------------------
//  ČUVANJE STANJA (localStorage)
// --------------------

function saveState() {
  const state = {
    popisName,
    items
  };
  try {
    localStorage.setItem("popisAppState", JSON.stringify(state));
  } catch (e) {
    console.log("Ne mogu da sačuvam stanje:", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem("popisAppState");
    if (!raw) return;

    const state = JSON.parse(raw);
    if (!state || typeof state !== "object") return;

    if (state.popisName) {
      popisName = state.popisName;
      items = state.items || {};

      // Namesti UI kao da je popis već aktivan
      popisInputEl.value = popisName;
      popisInputEl.disabled = true;

      startBtnEl.innerText = "Popis aktivan";
      startBtnEl.style.background = "#d32f2f";
      startBtnEl.disabled = true;

      activePopisEl.innerText = "Aktivni popis: " + popisName;
      resetBtnEl.style.display = "block";

      renderList();
    } else {
      popisName = "";
      items = {};
      renderList();
    }
  } catch (e) {
    console.log("Ne mogu da učitam stanje:", e);
  }
}

function clearState() {
  try {
    localStorage.removeItem("popisAppState");
  } catch (e) {
    console.log("Ne mogu da obrišem stanje:", e);
  }
}

// --------------------
//  LOGIKA APLIKACIJE
// --------------------

// Start popisa
function startPopis() {
  const nameInput = popisInputEl.value.trim();

  if (nameInput === "") {
    alert("Unesi naziv popisa pre početka!");
    return;
  }

  popisName = nameInput;

  popisInputEl.disabled = true;

  startBtnEl.innerText = "Popis aktivan";
  startBtnEl.style.background = "#d32f2f";
  startBtnEl.disabled = true;

  activePopisEl.innerText = "Aktivni popis: " + popisName;

  resetBtnEl.style.display = "block";

  barcodeInput.focus();

  saveState();

  alert("Popis '" + popisName + "' je započet!");
}

// Reset popisa
function resetPopis() {
  items = {};
  renderList();

  popisName = "";

  popisInputEl.value = "";
  popisInputEl.disabled = false;

  startBtnEl.innerText = "Start Popis";
  startBtnEl.style.background = "#2196F3";
  startBtnEl.disabled = false;

  activePopisEl.innerText = "";

  resetBtnEl.style.display = "none";

  barcodeInput.value = "";
  barcodeInput.focus();

  // Ugasi kameru ako radi
  if (cameraOn) {
    toggleCamera();
  }

  clearState();
}

// Dodavanje artikla
function addItem(code) {
  if (!popisName) {
    alert("Prvo pokreni popis (Start Popis)!");
    return;
  }

  if (!items[code]) {
    items[code] = { quantity: 1 };
  } else {
    items[code].quantity++;
  }

  renderList();
  saveState();
}

// Ukupan broj komada
function getTotal() {
  return Object.values(items).reduce((sum, item) => sum + item.quantity, 0);
}

// + / – promena količine
function changeQty(code, delta) {
  if (!items[code]) return;

  items[code].quantity += delta;

  if (items[code].quantity <= 0) {
    delete items[code];
  }

  renderList();
  saveState();
}

// Prikaz liste
function renderList() {
  listContainer.innerHTML = "";

  Object.keys(items).forEach(code => {
    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
      <div class="code">${code}</div>
      <div class="qty-controls">
        <button class="minus" onclick="changeQty('${code}', -1)">-</button>
        <span class="qty">${items[code].quantity}</span>
        <button onclick="changeQty('${code}', 1)">+</button>
      </div>
    `;

    listContainer.appendChild(row);
  });

  if (totalCountEl) {
    totalCountEl.innerText = getTotal();
  }
}

// Enter u polju za barkod = dodaj artikal
barcodeInput.addEventListener("keyup", function(e) {
  if (e.key === "Enter" && barcodeInput.value.trim() !== "") {
    addItem(barcodeInput.value.trim());
    barcodeInput.value = "";
  }
});

// --------------------
//  LEPŠI EXPORT ZA EXCEL
// --------------------

function exportCSV() {
  if (!popisName) {
    alert("Prvo klikni Start Popis i unesi naziv!");
    return;
  }

  if (Object.keys(items).length === 0) {
    alert("Nema skeniranih artikala za izvoz.");
    return;
  }

  const fileName = popisName + ".csv";
  const today = new Date().toLocaleDateString("sr-RS"); // npr. 12.02.2025

  // CSV sa datumom i ; separatorom za LibreOffice
  let csv = "";
  csv += `Datum;${today}\n`;         // <- DATUM DODAT OVDE
  csv += "Artikal;Kolicina\n";

  Object.keys(items).forEach(code => {
    csv += `${code};${items[code].quantity}\n`;
  });

  csv += `Ukupno;${getTotal()}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  alert(`Popis je eksportovan kao fajl "${fileName}".\nNaći ćeš ga u folderu Downloads.`);

  resetPopis();
}



// --------------------
//  KAMERA
// --------------------

async function toggleCamera() {
  if (!readerEl || !cameraBtnEl) return;

  if (!cameraOn) {
    if (!popisName) {
      alert("Prvo pokreni popis (Start Popis)!");
      return;
    }

    readerEl.style.display = "block";

    if (!html5QrCode) {
      html5QrCode = new Html5QrCode("reader");
    }

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
          addItem(decodedText);
        },
        (errorMessage) => {
          // ignorisemo promasaje
        }
      );

      cameraOn = true;
      cameraBtnEl.innerText = "Zaustavi kameru";

    } catch (err) {
      alert("Ne mogu da pokrenem kameru: " + err);
      readerEl.style.display = "none";
    }

  } else {
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (err) {
      console.log("Greška pri gašenju kamere:", err);
    }

    readerEl.style.display = "none";
    cameraOn = false;
    cameraBtnEl.innerText = "Skeniraj kamerom";
  }
}

// --------------------
//  UČITAJ STANJE NA STARTU
// --------------------
loadState();
