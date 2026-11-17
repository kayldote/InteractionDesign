# My Transit Watch

Accessible, dependency-free web prototype based on the linked Figma transit watch flow.

Run `python3 -m http.server 5173 --directory dist` from this folder and open http://localhost:5173.

Scroll over the watch to move through the highlighted options. Press Enter or left-click an option to select it. Up/Down arrow keys also move through options, Backspace or right-click goes back, and R repeats guidance. On adjustment screens, scrolling or pressing Up/Down changes the value; left-click Test or Save to activate it. Navigation can be canceled from any navigation step. Shortcuts apply outside native controls.

Spoken guidance uses the browser's speech synthesis after activation. Settings persist locally. Vibration depends on device/browser support. No microphone permission is needed. All transit times, accessibility information, and navigation steps are illustrative sample data; no live transit, location tracking, calls, or reporting backend is connected.

## Haptic feedback

Scrolling to an option, entering a screen, or pointing at an option requests its haptic cue. The sidebar describes the last requested rhythm and whether the browser accepted the request; acceptance cannot confirm that a physical motor actually vibrated. Ordinary desktop mice cannot vibrate through this API. Use a device and browser with Vibration API hardware support to feel the cues, after clicking or pressing a key in the app.

- Menu options: one, two, three, etc. short pulses, excluding Back from the count.
- Routes 01 / 03 / 04 / 05: long-short-short / long-long-short / short-long-short / short-short-long. Figma gives the first two as examples; the other two extend that scheme.
- Continue navigation: two short pulses. Approaching a turn: three short pulses. Stop reached: one long then two short pulses.
- Accessibility information: a long pulse. Repeat details and audio test options: a short pulse.

Figma does not specify timing in milliseconds: short pulses are 70 ms, long pulses 280 ms, with 110 ms gaps at Medium. Light and Strong scale pulse duration to 65% and 140%; the browser API cannot control motor amplitude. Off cancels vibration and silences all cues, including Test vibration. Feedback stops when the page is hidden. Navigation entry cues finish before hover feedback can replace them.

Only cues for existing screens are wired. The current prototype has no language or accessibility-error screen; adding these screens remains separate work.

Run haptic mapping, integration, and fallback checks from the repository root with `node --test watch-app/tests/haptics.test.cjs`. These checks verify requests, not physical vibration hardware.
