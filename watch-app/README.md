# My Transit Watch

Accessible, dependency-free web prototype based on the linked Figma transit watch flow.

Run `python3 -m http.server 5173 --directory dist` from this folder and open http://localhost:5173.

Scroll over the watch to change the highlighted option. Press Enter or click the crown/select button to activate. Arrow keys also navigate, Escape goes back, M opens the menu, and R repeats guidance (shortcuts apply outside native controls). The lower watch side button opens the main menu. On adjustment screens, scrolling changes the value; click Test or Save, or use Tab and Enter.

Spoken guidance uses the browser's speech synthesis after activation. Settings persist locally. Vibration depends on device/browser support. No microphone permission is needed. All transit times, accessibility information, and navigation steps are illustrative sample data; no live transit, location tracking, calls, or reporting backend is connected.
