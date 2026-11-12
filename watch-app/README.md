# My Transit Watch

Accessible, dependency-free web prototype based on the linked Figma transit watch flow.

Run `python3 -m http.server 5173 --directory dist` from this folder and open http://localhost:5173.

Scroll over the watch to move through the highlighted options. Press Enter or left-click an option to select it. Up/Down arrow keys also move through options, Backspace or right-click goes back, and R repeats guidance. On adjustment screens, scrolling or pressing Up/Down changes the value; left-click Test or Save to activate it. Navigation can be canceled from any navigation step. Shortcuts apply outside native controls.

Spoken guidance uses the browser's speech synthesis after activation. Settings persist locally. Vibration depends on device/browser support. No microphone permission is needed. All transit times, accessibility information, and navigation steps are illustrative sample data; no live transit, location tracking, calls, or reporting backend is connected.
