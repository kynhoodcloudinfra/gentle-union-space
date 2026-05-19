## Plan

1. **Restore quiz images in the question popup**
   - Update the quiz question loader so it always fetches the active question directly from the `questions` table with `image_url` included, even if the rotation RPC response omits or loses the image field.
   - Keep the image display non-cropping (`object-contain`) and compact inside the popup.

2. **Make the timer consistently 60 seconds**
   - Keep the quiz timer duration at 60 seconds.
   - Update the homepage CTA text from “30 seconds” to “60 seconds” so the UI no longer looks reverted.

3. **Make scrollbars beige and integrated app-wide**
   - Adjust the global/themed scrollbar CSS to use the existing beige/gold accent color.
   - Apply the themed scrollbar to the main scrollable app surface and relevant modal/sheet/table scroll areas so scrollbars don’t appear white or detached.
   - Use transparent/inset styling so the scrollbar feels like part of the popup/sheet instead of a separate strip.

4. **Ensure Kyn username is not editable**
   - Remove the exposed `setKynUsername` updater from the user context API since profile editing should not allow changing Kyn username.
   - Keep profile display as read-only `@kynUsername` only.

5. **Change default profile image to a shuffled avatar**
   - Update `AvatarDisplay` so if no uploaded image or saved avatar exists, it shows one of the built-in shuffled avatar images instead of the `?` placeholder.
   - Use a stable default per render context so the profile/header/leaderboard still look polished before a user has saved an avatar.