import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

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
let unsubscribe = null;
let saveTimer = null;
let ignoreSnapshot = false;
let localDirty = false;
let saveQueue = Promise.resolve();

const $ = id => document.getElementById(id);
const keyOf = (r,c) => `${r}-${c}`;
const parseKey = key => key.split("-").map(Number);

function setStatus(message, ok=false) {
  $("syncState").textContent = message;
  $("syncState").style.color = ok ? "#26865e" : "#777";
}
function normalize(raw) {
  const next = { rows: Math.max(1, Number(raw?.rows) || 5), cols: Math.max(1, Number(raw?.cols) || 6), cells: {} };
  if (raw?.cells && typeof raw.cells === "object") {
    for (const [key, value] of Object.entries(raw.cells)) {
      if (!value || !value.name || !value.code) continue;
      const [r,c] = parseKey(key);
      if (Number.isInteger(r) && Number.isInteger(c) && r>=0 && c>=0 && r<next.rows && c<next.cols)
        next.cells[key] = { name:String(value.name), code:String(value.code), color:value.color || "red" };
    }
  }
  return next;
}
function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function persist() {
  // 로컬 변경이 생긴 순간부터 서버가 같은 내용을 돌려줄 때까지
  // 이전 스냅샷이 화면을 덮어쓰지 못하게 막습니다.
  localDirty = true;
  clearTimeout(saveTimer);
  const snapshotToSave = JSON.parse(JSON.stringify(state));
  saveTimer = setTimeout(() => {
    saveQueue = saveQueue.then(async () => {
      try {
        await setDoc(mapRef, { mapState: snapshotToSave }, { merge: true });
        setStatus("실시간 저장 완료", true);
      } catch (e) {
        console.error(e);
        localDirty = false;
        setStatus("저장 오류: Firebase 설정 확인");
      }
    });
  }, 250);
}

function render() {
  const grid=$("mapGrid");
  grid.style.gridTemplateColumns=`repeat(${state.cols}, 130px)`;
  grid.innerHTML="";
  let count=0;
  const query=$("searchInput").value.trim().toLowerCase();
  for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) {
    const key=keyOf(r,c), item=state.cells[key];
    if(item) count++;
    const cell=document.createElement("button");
    cell.type="button"; cell.className="cell"+(selected===key?" selected":"");
    if(item && query && (item.name.toLowerCase().includes(query)||item.code.toLowerCase().includes(query))) cell.classList.add("highlight");
    cell.draggable=!!item;
    cell.dataset.key=key;
    const num=document.createElement("span"); num.className="cell-num"; num.textContent=`${r+1}행 · ${c+1}열`; cell.append(num);
    if(item) {
      const card=document.createElement("div"); card.className=`material ${item.color||"red"}`;
      const name=document.createElement("strong"); name.textContent=item.name;
      const code=document.createElement("small"); code.textContent=item.code;
      card.append(name,code); cell.append(card);
    } else {
      const empty=document.createElement("span"); empty.className="empty-text"; empty.textContent="빈 칸"; cell.append(empty);
    }
    cell.addEventListener("click",()=>{selected=key; $("selectedLabel").textContent=`선택: ${r+1}행 ${c+1}열`; $("clearCell").disabled=!state.cells[key]; if(item) loadForEdit(key); else if(!editingKey) resetForm(); render();});
    cell.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",key);});
    cell.addEventListener("dragover",e=>{e.preventDefault();});
    cell.addEventListener("drop",e=>{
      e.preventDefault();
      const from=e.dataTransfer.getData("text/plain");
      const to=key;
      if(!from || from===to || !Object.prototype.hasOwnProperty.call(state.cells, from)) return;

      const movingItem = state.cells[from];
      const targetItem = state.cells[to];
      // 빈 칸이면 이동, 자재가 있으면 두 자재의 위치를 서로 교환합니다.
      if(targetItem) state.cells[from] = targetItem;
      else delete state.cells[from];
      state.cells[to] = movingItem;

      selected=to;
      resetForm();
      render();
      persist();
    });
    grid.append(cell);
  }
  $("mapCount").textContent=`${count}개 자재`;
  $("clearCell").disabled=!(selected && state.cells[selected]);
}
function loadForEdit(key) {
  const item=state.cells[key]; if(!item) return;
  editingKey=key; $("materialName").value=item.name; $("materialCode").value=item.code;
  setColor(item.color||"red");
  $("saveMaterial").textContent="자재 정보 수정";
}
function resetForm() {
  editingKey=null; $("materialForm").reset(); setColor("red");
  $("saveMaterial").textContent="자재 등록";
}
function setColor(color) {
  $("materialColor").value=color;
  document.querySelectorAll(".color-swatch").forEach(button=>{
    button.classList.toggle("active",button.dataset.color===color);
  });

}
$("colorPicker").addEventListener("click",e=>{
  const button=e.target.closest(".color-swatch");
  if(button) setColor(button.dataset.color);
});

$("materialForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("materialName").value.trim();
  const code=$("materialCode").value.trim();
  const color=$("materialColor").value;
  const target=selected;
  if(!target) { alert("먼저 배치도에서 자재를 넣을 칸을 선택해 주세요."); return; }
  if(!name || !code) return;

  const source=editingKey;
  const targetItem=state.cells[target];
  if(targetItem && target!==source && !confirm("선택한 칸에 자재가 있습니다. 기존 자재를 덮어쓸까요?")) return;

  // 다른 칸의 자재를 수정 중이라면 원래 칸을 비우고,
  // 목적지에 자재가 있으면 원래 칸으로 옮겨 교환합니다.
  if(source && source!==target) {
    if(targetItem) state.cells[source]=targetItem;
    else delete state.cells[source];
  }
  state.cells[target]={name,code,color};
  selected=target;
  resetForm();
  render();
  persist();
});
$("cancelEdit").addEventListener("click",resetForm);
$("clearCell").addEventListener("click",()=>{
  if(!selected||!state.cells[selected]) return;
  if(confirm("선택한 칸의 자재 정보를 삭제할까요?")) { delete state.cells[selected]; resetForm(); render(); persist(); }
});
$("addCol").addEventListener("click",()=>{state.cols++; render(); persist();});
$("addRow").addEventListener("click",()=>{state.rows++; render(); persist();});
$("removeCol").addEventListener("click",()=>{
  if(state.cols<=1){alert("세로 칸은 최소 1개가 필요합니다.");return;}
  const last=state.cols-1, occupied=Object.keys(state.cells).some(k=>parseKey(k)[1]===last);
  if(occupied&&!confirm("마지막 세로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  for(const key of Object.keys(state.cells)) if(parseKey(key)[1]===last) delete state.cells[key];
  state.cols--; if(selected && parseKey(selected)[1]>=state.cols) selected=null; render(); persist();
});
$("removeRow").addEventListener("click",()=>{
  if(state.rows<=1){alert("가로 칸은 최소 1개가 필요합니다.");return;}
  const last=state.rows-1, occupied=Object.keys(state.cells).some(k=>parseKey(k)[0]===last);
  if(occupied&&!confirm("마지막 가로 칸에 등록된 자재도 함께 삭제됩니다. 진행할까요?")) return;
  for(const key of Object.keys(state.cells)) if(parseKey(key)[0]===last) delete state.cells[key];
  state.rows--; if(selected && parseKey(selected)[0]>=state.rows) selected=null; render(); persist();
});
$("searchBtn").addEventListener("click",()=>render());
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")render();});
$("resetSearch").addEventListener("click",()=>{$("searchInput").value="";render();});

unsubscribe=onSnapshot(mapRef, snap=>{
  if(ignoreSnapshot) return;
  if(snap.exists() && snap.data().mapState) {
    const incoming=normalize(snap.data().mapState);
    if(localDirty) {
      // 내가 방금 저장한 상태와 일치하는 서버 응답을 받았을 때만
      // 로컬 변경 보호를 해제합니다. 그 전의 오래된 응답은 무시합니다.
      if(sameState(incoming, state)) localDirty=false;
      else return;
    } else {
      if(!sameState(incoming, state)) {
        state=incoming;
        if(selected && !state.cells[selected] && !editingKey) selected=null;
        render();
      }
    }
  } else {
    if(!localDirty) persist();
  }
  setStatus("실시간 연결됨",true);
}, err=>{console.error(err);setStatus("연결 오류: Firestore 규칙 확인");});
