// Keyboard Event Viewer
// Recreates the functionality of https://w3c.github.io/uievents/tools/key-event-viewer.html
// Captures keyboard / input / composition events and logs them to a color-coded table.

"use strict";

const MAX_OUTPUT_ROWS = 100;

// ---------------------------------------------------------------------------
// Table column configuration.
// Each group: { title, type, grouplabel, columns: [{ title, format }] }
// format: "text" | "bool" | "node"  (node = already a DOM node / can be highlighted)
// ---------------------------------------------------------------------------
const TABLE_GROUPS = [
  {
    title: "", type: "etype", grouplabel: false, columns: [
      { title: "#", format: "text" },
      { title: "Event type", format: "node" },
    ],
  },
  {
    title: "Legacy", type: "legacy", checked: true, columns: [
      { title: "charCode", format: "node" },
      { title: "keyCode", format: "node" },
      { title: "which", format: "text" },
    ],
  },
  {
    title: "Modifiers", type: "modifiers", checked: true, columns: [
      { title: "getModifierState", format: "text" },
      { title: "shift", format: "bool" },
      { title: "ctrl", format: "bool" },
      { title: "alt", format: "bool" },
      { title: "meta", format: "bool" },
    ],
  },
  {
    title: "Old DOM3", type: "olddom3", checked: false, columns: [
      { title: "keyIdentifier", format: "text" },
      { title: "keyLocation", format: "text" },
      { title: "char", format: "text" },
    ],
  },
  {
    title: "UI Events", type: "uievents", checked: true, columns: [
      { title: "key", format: "node" },
      { title: "code", format: "text" },
      { title: "location", format: "text" },
      { title: "repeat", format: "bool" },
      { title: "isComposing", format: "bool" },
      { title: "inputType", format: "text" },
      { title: "data", format: "text" },
    ],
  },
  {
    title: "Proposed", type: "proposed", checked: false, columns: [
      { title: "locale", format: "text" },
    ],
  },
  {
    title: "Input", type: "inputbox", checked: true, grouplabel: false, columns: [
      { title: "Input field", format: "text", align: "left" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Event configuration.
// Each event: { name, defaults: { preventDefault, stopPropagation, show, highlight } }
// `highlight: null` means the highlight checkbox is disabled (not applicable).
// ---------------------------------------------------------------------------
const EVENTS = [
  { name: "keydown",         defaults: { pd: false, sp: false, show: true,  hl: true  } },
  { name: "keypress",        defaults: { pd: false, sp: false, show: true,  hl: false } },
  { name: "keyup",           defaults: { pd: false, sp: false, show: true,  hl: true  } },
  { name: "textinput",       defaults: { pd: false, sp: false, show: false, hl: null  } },
  { name: "beforeinput",     defaults: { pd: false, sp: false, show: true,  hl: null  } },
  { name: "input",           defaults: { pd: false, sp: false, show: true,  hl: null  } },
  { name: "compositionstart",  defaults: { pd: false, sp: false, show: true, hl: null } },
  { name: "compositionupdate", defaults: { pd: false, sp: false, show: true, hl: null } },
  { name: "compositionend",    defaults: { pd: false, sp: false, show: true, hl: null } },
];

let seqId = 1;
let isKeydown = false;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function $(id) {
  return document.getElementById(id);
}

function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function isChecked(id) {
  const el = $(id);
  return !!(el && el.checked);
}

// ---------------------------------------------------------------------------
// Output table
// ---------------------------------------------------------------------------
function buildTableHeader() {
  const table = $("output");
  const thead = table.createTHead();
  const row1 = thead.insertRow(-1); // group titles
  const row2 = thead.insertRow(-1); // column titles

  for (const group of TABLE_GROUPS) {
    const headerClass = group.grouplabel === false ? "" : group.type + "_header";
    const th = document.createElement("th");
    th.colSpan = group.columns.length;
    th.textContent = group.grouplabel === false ? "" : group.title;
    if (headerClass) th.className = headerClass;
    th.classList.add("group_" + group.type, "col_" + group.type);
    row1.appendChild(th);

    for (const col of group.columns) {
      const th2 = document.createElement("th");
      th2.textContent = col.title;
      th2.className = group.type + "_header subheader col_" + group.type;
      row2.appendChild(th2);
    }
  }
}

function resetTable(resetData = true) {
  const table = $("output");
  clearChildren(table);
  buildTableHeader();
  table.createTBody();
  seqId = 1;
  applyFieldVisibility();
  setInputFocus(resetData);
}

function addEventRow(eventinfo, extraClass) {
  const tbody = $("output").tBodies[0];

  while (tbody.rows.length >= MAX_OUTPUT_ROWS) {
    tbody.deleteRow(-1);
  }

  const row = tbody.insertRow(0); // newest on top
  if (extraClass) row.classList.add(extraClass);

  for (const group of TABLE_GROUPS) {
    const visible = group.type === "etype" || isChecked("show_" + group.type);
    for (const col of group.columns) {
      let val = col.title === "#" ? seqId : eventinfo[col.title];
      const cell = row.insertCell(-1);
      cell.className = "col_" + group.type;
      cell.style.textAlign = col.align || "center";

      if (col.format === "bool") {
        renderBool(cell, val);
      } else if (col.format === "node" && val instanceof Node) {
        cell.appendChild(val);
      } else if (val === undefined || val === null) {
        cell.textContent = "-";
        cell.classList.add("undef");
      } else {
        cell.textContent = String(val);
      }

      if (!visible) cell.style.display = "none";
    }
  }
  seqId++;
}

function renderBool(cell, val) {
  cell.textContent = val ? "\u2713" : "\u2717";
  cell.classList.add(val ? "modOn" : "modOff");
}

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------
function calcLocation(loc) {
  switch (loc) {
    case 1: return "LEFT";
    case 2: return "RIGHT";
    case 3: return "NUMPAD";
    default: return loc;
  }
}

function calcString(data) {
  return data === undefined ? undefined : "'" + data + "'";
}

function calcInput() {
  return "'" + $("input").value + "'";
}

function getModifierState(e) {
  const modifiers = [
    "Alt", "AltGraph", "Control", "Shift", "Meta",
    "CapsLock", "NumLock", "ScrollLock",
    "Hyper", "Super", "Symbol", "SymbolLock", "Fn", "FnLock",
  ];
  if (typeof e.getModifierState !== "function") return "Undefined";
  const active = modifiers.filter((m) => {
    try { return e.getModifierState(m); } catch (_) { return false; }
  });
  return active.length ? active.join(", ") : undefined;
}

// Build a highlighted chip span for the given event type, if highlighting is on.
function hilightString(eventType, data, addArrow) {
  if (data === undefined || data === null) return null;
  const span = document.createElement("span");
  if (isChecked("hl_" + eventType)) {
    span.classList.add("keyevent_hilight", eventType + "_hilight");
    if (addArrow && (eventType === "keydown" || eventType === "keyup")) {
      span.classList.add(eventType + "_arrow");
    }
  }
  span.textContent = data;
  return span;
}

// Build a keyCode/charCode cell: numeric value plus the decoded character chip.
function richKeyVal(eventType, attrName, key) {
  if (key === undefined) return null;

  let keyString = String.fromCharCode(key);
  if (attrName === "keyCode") {
    if (key < 32 || key > 90) keyString = "";
    switch (key) {
      case 16: keyString = "Shift"; break;
      case 17: keyString = "Control"; break;
      case 18: keyString = "Alt"; break;
      case 91: case 93: case 224: keyString = "Meta"; break;
    }
  }

  const relevant =
    (eventType === "keypress" && attrName === "charCode") ||
    ((eventType === "keydown" || eventType === "keyup") && attrName === "keyCode");

  if (keyString !== "" && relevant) {
    const wrap = document.createElement("span");
    wrap.appendChild(document.createTextNode(key));
    const chip = document.createElement("span");
    if (isChecked("hl_" + eventType)) {
      chip.classList.add("keyevent_hilight", eventType + "_hilight");
    } else {
      keyString = " " + keyString;
    }
    chip.textContent = keyString;
    wrap.appendChild(chip);
    return wrap;
  }
  return document.createTextNode(String(key));
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
function handleDefaultPropagation(etype, e) {
  if (isChecked("pd_" + etype) && e.preventDefault) e.preventDefault();
  if (isChecked("sp_" + etype) && e.stopPropagation) e.stopPropagation();
  // Always prevent default for Tab so focus stays in the input.
  if (e.keyCode === 9 || e.code === "Tab") e.preventDefault();
}

function handleKeyEvent(etype, e) {
  if (isChecked("show_" + etype)) addKeyEvent(etype, e);
  handleDefaultPropagation(etype, e);
}

function addKeyEvent(etype, e) {
  const info = {
    "Event type": hilightString(etype, e.type, true),
    "charCode": richKeyVal(etype, "charCode", e.charCode),
    "keyCode": richKeyVal(etype, "keyCode", e.keyCode),
    "which": e.which,
    "getModifierState": getModifierState(e),
    "shift": e.shiftKey,
    "ctrl": e.ctrlKey,
    "alt": e.altKey,
    "meta": e.metaKey,
    "keyIdentifier": e.keyIdentifier,
    "keyLocation": calcLocation(e.keyLocation),
    "char": calcString(e.char),
    "key": hilightString(etype, e.key, false),
    "code": e.code,
    "location": calcLocation(e.location),
    "repeat": e.repeat,
    "isComposing": e.isComposing,
    "Input field": calcInput(),
  };

  let extraClass;
  if (isKeydown && isChecked("hl_keydown")) {
    extraClass = "keydown_row_hilight";
  }
  addEventRow(info, extraClass);
}

function handleInputEvent(etype, e) {
  if (isChecked("show_" + etype)) {
    addEventRow({
      "Event type": hilightString(etype, e.type, true),
      "isComposing": e.isComposing,
      "inputType": e.inputType,
      "data": calcString(e.data),
      "Input field": calcInput(),
    });
  }
  handleDefaultPropagation(etype, e);
}

function handleCompositionEvent(etype, e) {
  if (isChecked("show_" + etype)) {
    addEventRow({
      "Event type": hilightString(etype, e.type, true),
      "isComposing": e.isComposing,
      "data": calcString(e.data),
      "Input field": calcInput(),
    });
  }
  handleDefaultPropagation(etype, e);
}

// ---------------------------------------------------------------------------
// Options panel
// ---------------------------------------------------------------------------
const OPTION_COLUMNS = [
  { title: "preventDefault", prefix: "pd_", key: "pd" },
  { title: "stopPropagation", prefix: "sp_", key: "sp" },
  { title: "ShowEvents", prefix: "show_", key: "show" },
  { title: "Highlight", prefix: "hl_", key: "hl" },
];

function makeCheckbox(id, labelText, { checked = true, disabled = false, onclick, labelClass } = {}) {
  const line = document.createElement("div");
  line.className = "optline";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.disabled = disabled;
  if (onclick) input.addEventListener("click", onclick);
  line.appendChild(input);

  const label = document.createElement("label");
  label.setAttribute("for", id);
  const span = document.createElement("span");
  if (labelClass) labelClass.split(" ").forEach((c) => span.classList.add(c));
  span.textContent = labelText;
  label.appendChild(span);
  line.appendChild(label);

  return line;
}

function buildOptions() {
  const container = $("options");
  clearChildren(container);

  const table = document.createElement("div");
  table.className = "opttable";

  // One column per option type (preventDefault / stopPropagation / show / highlight).
  for (const col of OPTION_COLUMNS) {
    const cell = document.createElement("div");
    cell.className = "optcell";
    const title = document.createElement("span");
    title.className = "opttitle";
    title.textContent = col.title;
    cell.appendChild(title);

    for (const ev of EVENTS) {
      const def = ev.defaults[col.key];
      const disabled = def === null;
      cell.appendChild(
        makeCheckbox(col.prefix + ev.name, ev.name, {
          checked: disabled ? false : def,
          disabled,
        })
      );
    }
    table.appendChild(cell);
  }

  // "Show Fields" column toggles whole column groups.
  const fieldCell = document.createElement("div");
  fieldCell.className = "optcell";
  const fieldTitle = document.createElement("span");
  fieldTitle.className = "opttitle";
  fieldTitle.textContent = "Show Fields";
  fieldCell.appendChild(fieldTitle);

  for (const group of TABLE_GROUPS) {
    if (!group.title) continue;
    fieldCell.appendChild(
      makeCheckbox("show_" + group.type, group.title, {
        checked: group.checked !== false,
        labelClass: group.type + "_header showfieldoption",
        onclick: applyFieldVisibility,
      })
    );
  }
  table.appendChild(fieldCell);

  // General options row.
  const general = document.createElement("div");
  general.className = "optcell full";
  const genTitle = document.createElement("span");
  genTitle.className = "opttitle";
  genTitle.textContent = "General Options";
  general.appendChild(genTitle);
  general.appendChild(
    makeCheckbox("readonlyToggle", "Read only <input>", {
      checked: false,
      onclick: toggleReadonly,
    })
  );
  const note = document.createElement("div");
  note.className = "optline";
  note.textContent = "Note: Options apply to new events only.";
  general.appendChild(note);
  table.appendChild(general);

  container.appendChild(table);
}

// Show/hide whole column groups based on the "Show Fields" checkboxes.
function applyFieldVisibility() {
  for (const group of TABLE_GROUPS) {
    if (!group.title) continue;
    const show = isChecked("show_" + group.type);
    const cells = document.querySelectorAll("#output .col_" + group.type);
    cells.forEach((c) => { c.style.display = show ? "" : "none"; });
  }
}

function toggleOptions() {
  const options = $("options");
  const toggle = $("optionsToggle");
  const willShow = options.hidden;
  options.hidden = !willShow;
  toggle.textContent = willShow ? "Hide Options" : "Show Options";
  toggle.setAttribute("aria-expanded", String(willShow));
}

function toggleReadonly() {
  const input = $("input");
  if (isChecked("readonlyToggle")) {
    input.setAttribute("readonly", "true");
  } else {
    input.removeAttribute("readonly");
  }
  setInputFocus(false);
}

function setInputFocus(resetData) {
  const input = $("input");
  if (resetData) input.value = "";
  input.focus();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  $("useragent").textContent = navigator.userAgent;

  buildOptions();
  resetTable(false);

  const input = $("input");
  input.addEventListener("keydown", (e) => {
    isKeydown = true;
    handleKeyEvent("keydown", e);
    isKeydown = false;
  });
  input.addEventListener("keypress", (e) => handleKeyEvent("keypress", e));
  input.addEventListener("keyup", (e) => handleKeyEvent("keyup", e));
  input.addEventListener("textInput", (e) => handleInputEvent("textinput", e));
  input.addEventListener("beforeinput", (e) => handleInputEvent("beforeinput", e));
  input.addEventListener("input", (e) => handleInputEvent("input", e));
  input.addEventListener("compositionstart", (e) => handleCompositionEvent("compositionstart", e));
  input.addEventListener("compositionupdate", (e) => handleCompositionEvent("compositionupdate", e));
  input.addEventListener("compositionend", (e) => handleCompositionEvent("compositionend", e));

  $("resetTable").addEventListener("click", () => resetTable(true));
  $("optionsToggle").addEventListener("click", toggleOptions);
}

document.addEventListener("DOMContentLoaded", init);
