# PermaPlanner project tracker

## Architecture review

- [ ] 4. Use the grouped plant counts and the same season chart in the footer, guild view, and plant calendar. Five trees of one variety must give the same harvest color and tooltip count in all three views.
- [ ] 5. Select only the ID, name, sync revision, and update time for the HTTP and MCP garden lists. Select only the owned garden ID to list or create share links.
- [ ] 6. Remove the `LegacyImport` and `LocalFile` forwarding modules. Have the import controller supply the default name and call `Gardens.create_garden` directly. Keep the current validation responses.

## Garden reads

- [x] Read the garden layout and aerial image from the same saved revision. A database test verifies a read during a save. Chromium verified that a garden opens without an image and restores its image and map scale after a save.

## Home-screen installation

- [x] Add home-screen installation for iPhone and Android with the Plants sprout icon. The production build passed. Phoenix served the manifest and all four PNG icons. Desktop Chrome opened the signed-in garden in a separate window with its open-in-window preference selected.
  - WebKit with an iPhone 16 profile and Chrome with a Pixel 7 profile loaded the icons and opened the garden. Installation on physical phones still needs a check.
  - A Phoenix test follows the installation links and checks each icon’s file type and size.
  - Git LFS stores the favicon, four PNG icons, and SVG source. The Phoenix and browser test jobs fetch them during checkout.
- [x] Stop the production build if an app icon is a Git LFS pointer. The error names the icon and tells the developer to run `git lfs pull`. Verified with Vite and the Docker frontend stage.

## Observation drafts and sync

- [ ] Save drafts and pending observations on the phone. Keep them when the grower switches apps or restarts the app. Show “Saved on this phone” until the server confirms the save, then show “Synced.”
- [ ] Open the last garden offline with its aerial image, plants, and observation history. When the phone reconnects, sync each observation once and preserve edits from other devices.
  - To verify sync, record an observation in airplane mode. Close and reopen the app. Check that the observation is still there. Reconnect and verify that exactly one copy appears on the laptop.

## Mobile imports and browser checks

- [ ] Add a standard file input for garden imports when the mobile browser does not support the file picker API.
- [ ] Add WebKit browser coverage. Check key flows on a real iPhone and Android phone, including installation, launch, and garden import.

## Tasks and reminders

- [ ] Create tasks for a plant, a guild, or the whole garden. Let growers create a follow-up task from an observation.
- [ ] Support optional reminders and recurring tasks.
- [ ] Show weekly tasks in Calendar, grouped by guild. Include overdue tasks.
- [ ] Let the grower record a Care observation when they complete a task.
