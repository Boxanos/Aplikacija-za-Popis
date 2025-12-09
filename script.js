// Lista skeniranih artikala

let popisName = "";
let items = {};

// Kamera
let cameraOn = false;
let html5QrCode = null;

// Funkcija za početak popisa
function startPopis() {
  const nameInput = document.getElementById("popisName").value.trim();

  if (nameInput === "") {
    alert("Unesi naziv popisa pre početka!");
    return;
  }

  popisName = nameInput;

  // Zaključaj polje za naziv popisa
  const popisInput = document.getElementById("popisName");
  popisInput.disabled = true;

  // Promeni dugme Start
  const startBtn = document.getElementById("startBtn");
  startBtn.innerText = "Popis aktivan";
  startBtn.style.background = "#d32f2f";
  startBtn.disabled = true;

  // Prikaži aktivan naziv popisa
  document.getElementById("activePopis").innerText = "Aktivni popis: " + popisName;

  // Prikaži dugme za reset
  document.getElementById("resetBtn").style.display = "block";

  // Fokus na barcode input
  document.getElementById("barcodeInput").focus();

  alert("Popis '" + popisName + "' je započet!");
}

// Resetovanje popisa
function resetPopis() {
  // Reset svih podataka
  items = {};
  renderList();

  popisName = "";

  // Reset HTML elemenata
  const popisInput = document.getElementById("popisName");
  popisInput.value = "";
  popisInput.disabled = false;

  const startBtn = document.getElementById("startBtn");
  startBtn.innerText = "Start Popis";
  startBtn.style.background = "#2196F3";
  startBtn.disabled = false;

  document.getElementById("activePopis").innerText = "";

  document.getElementById("resetBtn").style.display = "none";

  // Očisti i fokusiraj barcode input
  const barcodeInput = document.getElementById("barcodeInput");
  barcodeInput.value = "";
  barcodeInput.focus();

  // Ugasi kameru ako radi
  if (cameraOn) {
    toggleCamera();
  }
}

// Uzimamo elemente iz DOM-a
const barcodeInput = document.getElementById("barcodeInput");
const listContainer = document.getElementById("list");
const totalCountEl = document.getElementById("totalCount");

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
}

// Računanje ukupnog broja komada
function getTotal() {
  return Object.values(items).reduce((sum, item) => sum + item.quantity, 0);
}

// Funkcija za menjanje količine preko + / –
function changeQty(code, delta) {
  if (!items[code]) return;

  items[code].quantity += delta;

  // Ako količina padne na 0 ili ispod – izbaci artikal
  if (items[code].quantity <= 0) {
    delete items[code];
  }

  renderList();
}

// Renderovanje liste na ekranu
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

  // Osveži ukupan broj komada
  if (totalCountEl) {
    totalCountEl.innerText = getTotal();
  }
}

// Skeniranje – Enter potvrđuje sken
barcodeInput.addEventListener("keyup", function(e) {
  if (e.key === "Enter" && barcodeInput.value.trim() !== "") {
    addItem(barcodeInput.value.trim());
    barcodeInput.value = "";
  }
});

// Izvoz u CSV fajl
function exportCSV() {
  if (!popisName) {
    alert("Prvo klikni Start Popis i unesi naziv!");
    return;
  }

  if (Object.keys(items).length === 0) {
    alert("Nema skeniranih artikala za izvoz.");
    return;
  }

  let csv = "Barcode,Quantity\n";

  Object.keys(items).forEach(code => {
    csv += `${code},${items[code].quantity}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = popisName + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  // Automatski resetuj app posle eksportovanja
  resetPopis();
}

// Paljenje / gašenje kamere za skeniranje
async function toggleCamera() {
  const reader = document.getElementById("reader");
  const cameraBtn = document.getElementById("cameraBtn");

  // Ako kamera NIJE uključena -> pokreni skeniranje
  if (!cameraOn) {
    if (!popisName) {
      alert("Prvo pokreni popis (Start Popis)!");
      return;
    }

    reader.style.display = "block";

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, // zadnja kamera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
          // Svaki skenirani kod ide u tvoj postojeći addItem
          addItem(decodedText);
        },
        (errorMessage) => {
          // greške skeniranja ignorišemo
        }
      );

      cameraOn = true;
      cameraBtn.innerText = "Zaustavi kameru";

    } catch (err) {
      alert("Ne mogu da pokrenem kameru: " + err);
      reader.style.display = "none";
    }

  } else {
    // Ako kamera već radi -> zaustavi je
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (err) {
      console.log("Greška pri gašenju kamere:", err);
    }

    reader.style.display = "none";
    cameraOn = false;
    cameraBtn.innerText = "Skeniraj kamerom";
  }
}
