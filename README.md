# Keyboard Event Viewer

A self-contained developer tool that captures and logs DOM keyboard, input and
composition events, recreating the functionality of the
[W3C UI Events Keyboard Event Viewer](https://w3c.github.io/uievents/tools/key-event-viewer.html).

Type into the input box and every event is logged into a color-coded table so
you can inspect exactly what the browser dispatches.

## Features

- Captures all relevant events:
  - Keyboard: `keydown`, `keypress`, `keyup`
  - Input: `textinput`, `beforeinput`, `input`
  - Composition (IME): `compositionstart`, `compositionupdate`, `compositionend`
- Color-coded column groups: **Legacy** (`charCode`, `keyCode`, `which`),
  **Modifiers** (`getModifierState`, `shift`, `ctrl`, `alt`, `meta`),
  **Old DOM3** (`keyIdentifier`, `keyLocation`, `char`),
  **UI Events** (`key`, `code`, `location`, `repeat`, `isComposing`,
  `inputType`, `data`), **Proposed** (`locale`) and the live **Input field** value.
- Options panel to, per event type:
  - call `preventDefault()`
  - call `stopPropagation()`
  - show / hide the event in the table
  - highlight the `key` / `keyCode` chip
- Toggle which column groups are visible ("Show Fields").
- Read-only `<input>` toggle.
- "Clear Table" button. Newest events appear on top; capped at 100 rows.

## Usage

No build step or dependencies. Just open `index.html` in a browser, or serve
the folder locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — page structure
- `style.css` — styling and color-coded groups
- `app.js` — event capture, table rendering and the options panel
