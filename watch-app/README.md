# My Transit Watch

Accessible, dependency-free web prototype based on the linked Figma transit watch flow.

Run `python3 -m http.server 5173 --directory dist` from this folder and open http://localhost:5173.

Scroll over the watch to move through the highlighted options. Press Enter or left-click an option to select it. Up/Down arrow keys also move through options, Backspace or right-click goes back, and R repeats guidance. On adjustment screens, scrolling or pressing Up/Down changes the value; left-click Test or Save to activate it. Navigation can be canceled from any navigation step. Shortcuts apply outside native controls.

Spoken guidance uses the browser's speech synthesis after activation. Settings persist locally. Rhythm sounds represent the original vibration patterns using short and long beeps. No microphone permission is needed. All transit times, accessibility information, and navigation steps are illustrative sample data; no live transit, location tracking, calls, or reporting backend is connected.

## Rhythm sounds

On iPhone or Android, open the latest website deployment and tap **Enable rhythm sounds**. Turn up the phone’s media volume; if silent, check silent mode and connected headphones. The button plays a short-long-short test. Sound activation is required again after reloading. Spoken guidance has its own independent toggle.

Navigate as usual to hear the Figma rhythms as 660 Hz tones instead of physical vibration:

- Menus: one, two, three, etc. short beeps, excluding Back from the count.
- Routes 01 / 03 / 04 / 05: long-short-short / long-long-short / short-long-short / short-short-long. Figma gives the first two as examples; the other two extend that scheme.
- Continue navigation: two short beeps. Approaching a turn: three short beeps. Stop reached: one long then two short beeps.
- Accessibility information: a long beep. Repeat details and audio test options: a short beep.

Use **Customize → Rhythm length → Test rhythm** to replay the test. Shorter / Standard / Longer adjusts tone durations; Off silences the rhythms. **Audio settings → Volume level** controls rhythm and speech volume. The sidebar button turns rhythm sounds off immediately. Playback stops when the page is hidden. The website no longer requests physical vibration.

At Standard length, short tones last 70 ms, long tones 280 ms, with 110 ms gaps. Web Audio schedules the rhythm with gentle volume ramps to avoid clicks. Only cues for existing screens are wired; language and accessibility-error screens remain outside this prototype.

Run `node --test watch-app/tests/haptics.test.cjs` from the repository root to check rhythm mappings, Web Audio scheduling, activation, mute behavior, navigation, and fallback handling. These automated checks do not replace listening on physical iPhone and Android devices.

## Navigation and learning

Every watch screen has a flat Back button on the left side, a flat Home button on the right side, with navigation controls outside the display. The bottom controls also provide Back and Home. Home returns to the main menu and clears the navigation stack; Back restores the previous screen and highlighted selection. Back is disabled at Home. Both controls can be reached with Tab and activated with Enter or Space. The flat side button is labeled HOME and returns directly to the main menu.

Choose **Learn rhythm patterns** below the watch or in the main menu for a five-part guide. Each lesson includes a written explanation and a **Play example** action; Next, Previous, Finish, and Skip to home let users learn at their own pace. Play example enables rhythm sounds after the user gesture.

When both feedback types are enabled, spoken guidance finishes first, followed by a 250 ms pause and then the rhythm. A visible status identifies the speaking and rhythm phases. Starting a new action cancels stale feedback, and hiding the page stops both speech and tones.
