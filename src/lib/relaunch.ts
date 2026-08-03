// Hard kill-switch for the relaunch: every user must see the "coming soon"
// messaging, no exceptions, regardless of what's in the questions pool or
// any other data state. Flip this back to false only when explicitly told
// the relaunch is over — until then it must not change.
export const COMING_SOON_MODE = true;
