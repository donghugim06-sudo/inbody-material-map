// Firebase를 사용하지 않는 로컬 전용 버전입니다.
// 데이터는 서버나 데이터베이스에 저장되지 않으며, 페이지를 새로고침하면 초기화됩니다.

let state = { rows: 5, cols: 6, cells: {} };
let selected = null;
let editingKey = null;

const $ = id => document.getElementById(id);
const keyOf = (r, c) => `${r}-${c}`;
const parseKey = key => key.split("-").map(Number);

function setStatus(message, ok = false) {
  $("syncState").textContent = message;
  $("syncState").style.color = ok ? "#26865e" : "#777";
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

      const num = document.createElement("span");
      num.className = "cell-num";
      num.textContent = `${r + 1}행 · ${c + 1}열`;
      cell.append(num);

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
        if (item) {
          loadForEdit(key);
        } else if (!editingKey) {
          resetForm();
        }
        render();
      });

      cell.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.effectAllowed = "move";
      });
      cell.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      cell.addEventListener("drop", e => {
        e.preventDefault();
        const from = e.dataTransfer.getData("text/plain");
        const to = key;
        if (!from || from === to || !Object.prototype.hasOwnProperty.call(state.cells, from)) return;

        // 빈 칸이면 이동, 자재가 있으면 두 위치를 교환합니다.
        const moving = state.cells[from];
        const destination = state.cells[to];
        state.cells[to] = moving;
        if (destination) state.cells[from] = destination;
        else delete state.cells[from];

        selected = to;
        resetForm();
        render();
        setStatus("위치 변경 완료 (이 브라우저에서만 적용)", true);
      });

      grid.append(cell);
    }
  }

  $("mapCount").textContent = `${count}개 자재`;
  $("clearCell").disabled = !(selected && state.cells[selected]);
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

$("colorPicker").addEventListener("click", e => {
  const button = e.target.closest(".color-swatch");
  if (button) setColor(button.dataset.color);
});

$("materialForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("materialName").value.trim();
  const code = $("materialCode").value.trim();
  const color = $("materialColor").value;
  const target = selected;

  if (!target) {
    alert("먼저 배치도에서 자재를 넣을 칸을 선택해 주세요.");
    return;
  }
  if (!name || !code) return;

  // 기존 자재를 수정하면서 다른 칸으로 옮기는 경우
  if (editingKey && editingKey !== target) {
    const source = editingKey;
    const destination = state.cells[target];
    if (destination && !confirm("선택한 칸에 자재가 있습니다. 두 자재의 위치를 바꿀까요?")) return;

    if (destination) state.cells[source] = destination;
    else delete state.cells[source];
  }

  // 등록 또는 수정한 정보를 선택한 칸에 반영
  state.cells[target] = { name, code, color };
  selected = target;
  resetForm();
  render();
  setStatus("변경 완료 (이 브라우저에서만 적용)", true);
});

$("cancelEdit").addEventListener("click", resetForm);

$("clearCell").addEventListener("click", () => {
  if (!selected || !state.cells[selected]) return;
  if (confirm("선택한 칸의 자재 정보를 삭제할까요?")) {
    delete state.cells[selected];
    resetForm();
    render();
    setStatus("삭제 완료 (이 브라우저에서만 적용)", true);
  }
});

$("addCol").addEventListener("click", () => {
  state.cols++;
  render();
});
$("addRow").addEventListener("click", () => {
  state.rows++;
  render();
});

$("removeCol").addEventListener("click", () => {
  if (state.cols <= 1) {
    alert("세로 칸은 최소 1개가 필요합니다.");
    return;
  }
  const last = state.cols - 1;
  const occupied = Object.keys(state.cells).some(k => parseKey(k)[1] === last);
  if (occupied && !confirm("마지막 세로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  for (const key of Object.keys(state.cells)) {
    if (parseKey(key)[1] === last) delete state.cells[key];
  }
  state.cols--;
  if (selected && parseKey(selected)[1] >= state.cols) {
    selected = null;
    resetForm();
  }
  render();
});
$("removeRow").addEventListener("click", () => {
  if (state.rows <= 1) {
    alert("가로 칸은 최소 1개가 필요합니다.");
    return;
  }
  const last = state.rows - 1;
  const occupied = Object.keys(state.cells).some(k => parseKey(k)[0] === last);
  if (occupied && !confirm("마지막 가로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  for (const key of Object.keys(state.cells)) {
    if (parseKey(key)[0] === last) delete state.cells[key];
  }
  state.rows--;
  if (selected && parseKey(selected)[0] >= state.rows) {
    selected = null;
    resetForm();
  }
  render();
});

$("searchBtn").addEventListener("click", render);
$("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") render();
});
$("resetSearch").addEventListener("click", () => {
  $("searchInput").value = "";
  render();
});

setStatus("로컬 모드 · 서버 저장 및 실시간 공유 사용 안 함", false);
render();
