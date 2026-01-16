# Implementation Plan - Restore Persistence and Add Campaign Sync

## Problem
1.  **Persistence Issues:** User selections (highlights, checkboxes) were not persisting after page refresh because `syncLocalToGlobal()` calls were missing from key state-modifying functions.
2.  **Missing Features:** A previous operation accidentally deleted a large portion of the script, including UI, undo/redo, and smart data pipeline functions.
3.  **New Feature Request:** The user requested to implement campaign sync from the "Minus phrases" modal.

## Solution
1.  **Full Restoration:** Restored all accidentally deleted functions (`finalizePhraseBuilding`, `toggleSoftWord`, `toggleStrictWord`, `removeSelectionById`, `undo`, `redo`, `createPanel`, `updateUI`, etc.).
2.  **Persistence Fix:** Re-inserted `syncLocalToGlobal()` calls into all state-modifying functions:
    *   `finalizePhraseBuilding`
    *   `toggleSoftWord`
    *   `toggleStrictWord`
    *   `removeSelectionById`
    *   `undo`
    *   `redo`
    *   `toggleMatchType`
    *   `startInlineEdit.finishEdit`
    *   `addToSentHistory`
    *   `importMinusesFromClipboard`
    *   `clearImportedMinuses`
    *   `makePanelDraggable`
    *   `renderSentHistory` (remove item)
    *   `renderImportedMinuses` (remove item)
3.  **Campaign Sync:** Implemented `setupMinusModalObserver` and `syncCampaignDataFromTextarea` to automatically sync phrases from the Yandex Direct "Minus phrases" modal into the script's "In Campaign" list (`importedMinuses`).
    *   Added `setupMinusModalObserver` to `initWithTable`.
    *   The observer watches for the modal and attaches listeners to the textarea.

## Verification
*   **Persistence:** Verified that `syncLocalToGlobal()` is present in the restored functions.
*   **Functionality:** Verified that the script structure is correct and all functions are defined.
*   **Campaign Sync:** Verified that `setupMinusModalObserver` is called during initialization.

## Next Steps
*   The user should test the script in the browser to confirm that selections now persist across refreshes.
*   The user should open the "Minus phrases" modal in Yandex Direct to verify that the script syncs the campaign data.
