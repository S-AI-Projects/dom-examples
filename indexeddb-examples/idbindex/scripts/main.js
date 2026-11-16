// create an instance of a db object for us to store the IDB data in
let db = null;
let activeIndex;
let activeController = null;

const contacts = [
  {
    id: 1,
    fName: "Brian",
    lName: "Damage",
    jTitle: "Master of Synergies",
    company: "Acme",
    eMail: "brian@acme.com",
    phone: "+441210000000",
    age: 37,
  },
  {
    id: 2,
    fName: "Ted",
    lName: "Maul",
    jTitle: "Chief Reporter",
    company: "Brass eye",
    eMail: "ted@itsthenews.co.uk",
    phone: "+442081111111",
    age: 46,
  },
  {
    id: 3,
    fName: "Mr",
    lName: "Bungle",
    jTitle: "Bad Clown",
    company: "Stub a Dub",
    eMail: "bungle@maiof.com",
    phone: "+1508888888",
    age: 50,
  },
  {
    id: 4,
    fName: "Richard",
    lName: "James",
    jTitle: "Sound Engineer",
    company: "Aphex Twin",
    eMail: "richard@drukqs.com",
    phone: "+1517777777",
    age: 43,
  },
  {
    id: 5,
    fName: "Brian",
    lName: "Umlaut",
    jTitle: "Shredmeister",
    company: "Minions of metal",
    eMail: "brian@raiseyourhorns.com",
    phone: "+14086666666",
    age: 40,
  },
  {
    id: 6,
    fName: "Jonathan",
    lName: "Crane",
    jTitle: "Freelance Psychologist",
    company: "Arkham",
    eMail: "jon@arkham.com",
    phone: "n/a",
    age: 38,
  },
  {
    id: 7,
    fName: "Julian",
    lName: "Day",
    jTitle: "Schedule Keeper",
    company: "Arkham",
    eMail: "julian@arkham.com",
    phone: "n/a",
    age: 43,
  },
  {
    id: 8,
    fName: "Bolivar",
    lName: "Trask",
    jTitle: "Head of R&D",
    company: "Trask",
    eMail: "bolivar@trask.com",
    phone: "+14095555555",
    age: 55,
  },
  {
    id: 9,
    fName: "Cloud",
    lName: "Strife",
    jTitle: "Weapons Instructor",
    company: "Avalanche",
    eMail: "cloud@avalanche.com",
    phone: "+17083333333",
    age: 24,
  },
  {
    id: 10,
    fName: "Bilbo",
    lName: "Bagshot",
    jTitle: "Comic Shop Owner",
    company: "Fantasy Bazaar",
    eMail: "bilbo@fantasybazaar.co.uk",
    phone: "+12084444444",
    age: 43,
  },
];

function cleanupApp() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  if (db) {
    try {
      db.close();
    } catch (_) {}
    db = null;
  }
}

function initApp(onReady) {
  // Clean up any existing instance first to guarantee idempotency
  cleanupApp();
  activeController = new AbortController();
  const { signal } = activeController;

  const tableEntry = document.querySelector("tbody");
  if (tableEntry) {
    tableEntry.innerHTML = "";
  }

  window.indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB;

  window.IDBTransaction =
    window.IDBTransaction ||
    window.webkitIDBTransaction ||
    window.msIDBTransaction;
  window.IDBKeyRange =
    window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

  const DBOpenRequest = window.indexedDB.open("contactsList", 1);

  DBOpenRequest.onsuccess = function (event) {
    if (signal.aborted) return;
    db = DBOpenRequest.result;
    populateData();
  };

  DBOpenRequest.onupgradeneeded = function (event) {
    const upgradedDb = event.target.result;

    upgradedDb.onerror = function (event) {
      console.log("Error loading database.");
    };

    if (!upgradedDb.objectStoreNames.contains("contactsList")) {
      const objectStore = upgradedDb.createObjectStore("contactsList", { keyPath: "id" });
      objectStore.createIndex("lName", "lName", { unique: false });
      objectStore.createIndex("fName", "fName", { unique: false });
      objectStore.createIndex("jTitle", "jTitle", { unique: false });
      objectStore.createIndex("company", "company", { unique: false });
      objectStore.createIndex("eMail", "eMail", { unique: true });
      objectStore.createIndex("phone", "phone", { unique: false });
      objectStore.createIndex("age", "age", { unique: false });
    }
  };

  function populateData() {
    if (signal.aborted || !db) return;
    const transaction = db.transaction(["contactsList"], "readwrite");
    const objectStore = transaction.objectStore("contactsList");
    for (let i = 0; i < contacts.length; i++) {
      objectStore.put(contacts[i]);
    }

    transaction.oncomplete = function () {
      if (signal.aborted) return;
      displayDataByKey();
    };
  }

  const table = document.querySelector("table");
  if (table) {
    table.addEventListener(
      "click",
      function (e) {
        const th = e.target.closest("th");
        if (!th) return;
        const text = th.textContent.trim();
        if (text === "ID") {
          displayDataByKey();
        } else if (text === "Last name") {
          displayDataByIndex("lName");
        } else if (text === "First name") {
          displayDataByIndex("fName");
        } else if (text === "Job title") {
          displayDataByIndex("jTitle");
        } else if (text === "Company") {
          displayDataByIndex("company");
        } else if (text === "E-mail") {
          displayDataByIndex("eMail");
        } else if (text === "Phone") {
          displayDataByIndex("phone");
        } else if (text === "Age") {
          displayDataByIndex("age");
        }
      },
      { signal }
    );
  }

  function displayDataByKey() {
    if (signal.aborted || !db) return;
    const tbody = document.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const transaction = db.transaction(["contactsList"], "readonly");
    const objectStore = transaction.objectStore("contactsList");

    objectStore.openCursor().onsuccess = function (event) {
      if (signal.aborted) return;
      const cursor = event.target.result;
      if (cursor) {
        const tableRow = document.createElement("tr");
        tableRow.innerHTML =
          "<td>" + cursor.value.id + "</td>" +
          "<td>" + cursor.value.lName + "</td>" +
          "<td>" + cursor.value.fName + "</td>" +
          "<td>" + cursor.value.jTitle + "</td>" +
          "<td>" + cursor.value.company + "</td>" +
          "<td>" + cursor.value.eMail + "</td>" +
          "<td>" + cursor.value.phone + "</td>" +
          "<td>" + cursor.value.age + "</td>";
        tbody.appendChild(tableRow);
        cursor.continue();
      } else {
        if (typeof onReady === "function") onReady();
        window.dispatchEvent(new CustomEvent("idb-data-rendered"));
      }
    };
  }

  function displayDataByIndex(idx) {
    if (signal.aborted || !db) return;
    const tbody = document.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const transaction = db.transaction(["contactsList"], "readonly");
    const objectStore = transaction.objectStore("contactsList");
    const myIndex = objectStore.index(idx);

    myIndex.openCursor().onsuccess = function (event) {
      if (signal.aborted) return;
      const cursor = event.target.result;
      if (cursor) {
        const tableRow = document.createElement("tr");
        tableRow.innerHTML =
          "<td>" + cursor.value.id + "</td>" +
          "<td>" + cursor.value.lName + "</td>" +
          "<td>" + cursor.value.fName + "</td>" +
          "<td>" + cursor.value.jTitle + "</td>" +
          "<td>" + cursor.value.company + "</td>" +
          "<td>" + cursor.value.eMail + "</td>" +
          "<td>" + cursor.value.phone + "</td>" +
          "<td>" + cursor.value.age + "</td>";
        tbody.appendChild(tableRow);
        cursor.continue();
      } else {
        window.dispatchEvent(new CustomEvent("idb-data-rendered"));
      }
    };
  }
}

window.initApp = initApp;
window.cleanupApp = cleanupApp;
window.contacts = contacts;

window.addEventListener("DOMContentLoaded", () => {
  initApp();
});
