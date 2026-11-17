import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// 기존 Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyAbI6Q2Q6aGywUvP4i08-4viRqtyrXuaXU",
  authDomain: "inbody-material-map.firebaseapp.com",
  databaseURL: "https://inbody-material-map-default-rtdb.firebaseio.com",
  projectId: "inbody-material-map",
  storageBucket: "inbody-material-map.firebasestorage.app",
  messagingSenderId: "527906866996",
  appId: "1:527906866996:web:0afd52317e2548f0f58761",
  measurementId: "G-QWLR95BJXT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mapRef = doc(db, "sharedMap", "main");

let state = { rows: 5, cols: 6, cells: {} };
let selected = null;
let editingKey = null;
let busy = false;

const $ = id => document.getElementById(id);
const keyOf = (r, c) => `${r}-${c}`;
const parseKey = key => key.split("-").map(Number);

function setStatus(message, ok = false) {
  $("syncState").textContent = message;
  $("syncState").style.color = ok ? "#26865e" : "#777";
}

function normalize(raw) {
  const next = {
    rows: Math.max(1, Number(raw?.rows) || 5),
    cols: Math.max(1, Number(raw?.cols) || 6),
    cells: {}
  };
  if (raw?.cells && typeof raw.cells === "object") {
    for (const [key, value] of Object.entries(raw.cells)) {
      if (!value || !value.name || !value.code) continue;
      const [r, c] = parseKey(key);
      if (Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < next.rows && c < next.cols) {
        next.cells[key] = {
          name: String(value.name),
          code: String(value.code),
          color: value.color || "red"
        };
      }
    }
  }
  return next;
}

// 모든 변경은 서버의 최신 문서를 읽은 뒤 트랜잭션으로 반영한다.
// 여러 사용자가 동시에 수정해도 오래된 화면 데이터가 삭제/이동 결과를 덮어쓰는 일을 줄인다.
async function commitMutation(mutator, successMessage = "실시간 저장 완료") {
  if (busy) return false;
  busy = true;
  setStatus("저장 중...");
  try {
    const updated = await runTransaction(db, async transaction => {
      const snap = await transaction.get(mapRef);
      const latest = snap.exists() && snap.data().mapState
        ? normalize(snap.data().mapState)
        : { rows: 5, cols: 6, cells: {} };
      const changed = mutator(latest);
      if (changed === false) return latest;
      transaction.set(mapRef, { mapState: latest }, { merge: true });
      return latest;
    });
    state = normalize(updated);
    render();
    setStatus(successMessage, true);
    return true;
  } catch (error) {
    console.error(error);
    setStatus("저장 오류: Firebase 연결 또는 권한을 확인해 주세요.");
    alert("변경 내용을 저장하지 못했습니다. 인터넷 연결과 Firebase 권한을 확인해 주세요.");
    return false;
  } finally {
    busy = false;
  }
}

function render() {
  const grid = $("mapGrid");
  grid.style.gridTemplateColumns = `repeat(${state.cols}, 130px)`;
  grid.innerHTML = "";
  let count = 0;
  const query = $("searchInput").value.trim().toLowerCase();

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const key = keyOf(r, c);
      const item = state.cells[key];
      if (item) count++;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell" + (selected === key ? " selected" : "");
      if (item && query && (item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query))) {
        cell.classList.add("highlight");
      }
      cell.draggable = !!item;
      cell.dataset.key = key;

      const number = document.createElement("span");
      number.className = "cell-num";
      number.textContent = `${r + 1}행 · ${c + 1}열`;
      cell.append(number);

      if (item) {
        const card = document.createElement("div");
        card.className = `material ${item.color || "red"}`;
        const name = document.createElement("strong");
        name.textContent = item.name;
        const code = document.createElement("small");
        code.textContent = item.code;
        card.append(name, code);
        cell.append(card);
      } else {
        const empty = document.createElement("span");
        empty.className = "empty-text";
        empty.textContent = "빈 칸";
        cell.append(empty);
      }

      cell.addEventListener("click", () => {
        selected = key;
        $("selectedLabel").textContent = `선택: ${r + 1}행 ${c + 1}열`;
        $("clearCell").disabled = !state.cells[key];
        if (state.cells[key]) loadForEdit(key);
        else if (!editingKey) resetForm();
        render();
      });

      cell.addEventListener("dragstart", event => {
        if (!state.cells[key]) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", key);
      });
      cell.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      cell.addEventListener("drop", async event => {
        event.preventDefault();
        const from = event.dataTransfer.getData("text/plain");
        const to = key;
        if (!from || from === to) return;
        const ok = await commitMutation(latest => {
          if (!Object.prototype.hasOwnProperty.call(latest.cells, from)) return false;
          const movingItem = latest.cells[from];
          const targetItem = latest.cells[to];
          delete latest.cells[from];
          latest.cells[to] = movingItem;
          if (targetItem) latest.cells[from] = targetItem;
        });
        if (ok) {
          selected = to;
          editingKey = null;
          resetForm();
          render();
        }
      });
      grid.append(cell);
    }
  }

  $("mapCount").textContent = `${count}개 자재`;
  $("clearCell").disabled = !(selected && state.cells[selected]);
  if (selected) {
    const [r, c] = parseKey(selected);
    $("selectedLabel").textContent = `선택: ${r + 1}행 ${c + 1}열`;
  } else {
    $("selectedLabel").textContent = "선택된 칸 없음";
  }
}

function loadForEdit(key) {
  const item = state.cells[key];
  if (!item) return;
  editingKey = key;
  $("materialName").value = item.name;
  $("materialCode").value = item.code;
  setColor(item.color || "red");
  $("saveMaterial").textContent = "자재 정보 수정";
}

function resetForm() {
  editingKey = null;
  $("materialForm").reset();
  setColor("red");
  $("saveMaterial").textContent = "자재 등록";
}

function setColor(color) {
  $("materialColor").value = color;
  document.querySelectorAll(".color-swatch").forEach(button => {
    button.classList.toggle("active", button.dataset.color === color);
  });
}

$("colorPicker").addEventListener("click", event => {
  const button = event.target.closest(".color-swatch");
  if (button) setColor(button.dataset.color);
});

$("materialForm").addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("materialName").value.trim();
  const code = $("materialCode").value.trim();
  const color = $("materialColor").value;
  const target = selected;
  const source = editingKey;

  if (!target) { alert("먼저 배치도에서 자재를 넣을 칸을 선택해 주세요."); return; }
  if (!name || !code) return;

  if (source && source !== target && state.cells[target] &&
      !confirm("선택한 칸에 자재가 있습니다. 두 자재의 위치를 서로 바꿀까요?")) return;
  if (!source && state.cells[target] &&
      !confirm("선택한 칸에 자재가 있습니다. 기존 자재를 덮어쓸까요?")) return;

  const ok = await commitMutation(latest => {
    const targetItem = latest.cells[target];
    if (source && source !== target) {
      const sourceItem = latest.cells[source];
      if (!sourceItem) throw new Error("수정할 기존 자재를 찾을 수 없습니다.");
      delete latest.cells[source];
      if (targetItem) latest.cells[source] = targetItem;
      latest.cells[target] = { name, code, color };
    } else {
      latest.cells[target] = { name, code, color };
    }
  });
  if (ok) {
    selected = target;
    resetForm();
    render();
  }
});

$("cancelEdit").addEventListener("click", resetForm);

$("clearCell").addEventListener("click", async () => {
  const key = selected;
  if (!key || !state.cells[key]) return;
  if (!confirm("선택한 칸의 자재 정보를 삭제할까요?")) return;
  const ok = await commitMutation(latest => {
    // 서버의 최신 문서에서 해당 칸만 삭제한다.
    delete latest.cells[key];
  }, "자재 삭제 및 실시간 저장 완료");
  if (ok) resetForm();
});

$("addCol").addEventListener("click", async () => {
  await commitMutation(latest => { latest.cols++; });
});
$("addRow").addEventListener("click", async () => {
  await commitMutation(latest => { latest.rows++; });
});

$("removeCol").addEventListener("click", async () => {
  if (state.cols <= 1) { alert("세로 칸은 최소 1개가 필요합니다."); return; }
  const last = state.cols - 1;
  const occupied = Object.keys(state.cells).some(key => parseKey(key)[1] === last);
  if (occupied && !confirm("마지막 세로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  const ok = await commitMutation(latest => {
    const currentLast = latest.cols - 1;
    for (const key of Object.keys(latest.cells)) {
      if (parseKey(key)[1] === currentLast) delete latest.cells[key];
    }
    latest.cols = Math.max(1, latest.cols - 1);
  });
  if (ok && selected && parseKey(selected)[1] >= state.cols) selected = null;
  render();
});

$("removeRow").addEventListener("click", async () => {
  if (state.rows <= 1) { alert("가로 칸은 최소 1개가 필요합니다."); return; }
  const last = state.rows - 1;
  const occupied = Object.keys(state.cells).some(key => parseKey(key)[0] === last);
  if (occupied && !confirm("마지막 가로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  const ok = await commitMutation(latest => {
    const currentLast = latest.rows - 1;
    for (const key of Object.keys(latest.cells)) {
      if (parseKey(key)[0] === currentLast) delete latest.cells[key];
    }
    latest.rows = Math.max(1, latest.rows - 1);
  });
  if (ok && selected && parseKey(selected)[0] >= state.rows) selected = null;
  render();
});

$("searchBtn").addEventListener("click", render);
$("searchInput").addEventListener("keydown", event => { if (event.key === "Enter") render(); });
$("resetSearch").addEventListener("click", () => { $("searchInput").value = ""; render(); });

onSnapshot(mapRef, snapshot => {
  if (!snapshot.exists() || !snapshot.data().mapState) {
    if (!busy) {
      commitMutation(() => {}, "새 지도 준비 완료");
    }
    return;
  }
  // 로컬 트랜잭션의 미확정 쓰기 스냅샷은 적용하지 않는다.
  if (snapshot.metadata.hasPendingWrites) return;
  state = normalize(snapshot.data().mapState);
  if (selected) {
    const [r, c] = parseKey(selected);
    if (r >= state.rows || c >= state.cols) selected = null;
  }
  setStatus("실시간 연결됨", true);
  render();
}, error => {
  console.error(error);
  setStatus("연결 오류: Firestore 규칙 확인");
});
