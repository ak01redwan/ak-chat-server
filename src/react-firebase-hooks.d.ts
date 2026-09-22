// react-firebase-hooks ships without TypeScript declarations (see the package's
// published `files` list). This ambient shim declares the subset of the API used
// by this application. Keep it in sync when additional hooks are adopted.
declare module 'react-firebase-hooks/auth' {
  import type { Auth, User } from 'firebase/auth';

  /**
   * Subscribes to auth state changes. Returns `[user, loading, error]` where
   * `user` is null while signed out, and `loading` is true until the initial
   * state has been resolved.
   */
  export function useAuthState(auth: Auth): [User | null, boolean, Error | undefined];
}
