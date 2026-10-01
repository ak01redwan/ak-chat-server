export interface CommonStrings {
  language: string;
  switchToLightTheme: string;
  switchToDarkTheme: string;
  loadingMessages: string;
  loadingMessagesSr: string;
  connecting: string;
  noMessagesYet: string;
  noMessagesYetBody: string;
  skipToChat: string;
  communityChat: string;
  results_one: string;
  results_other: string;
  searchMessages: string;
  closeSearch: string;
  loadEarlierMessages: string;
  loading: string;
  copyMessage: string;
  copied: string;
  replyToMessage: string;
  editYourMessage: string;
  deleteYourMessage: string;
  signOut: string;
  signingOut: string;
  signInTitle: string;
  welcomeTo: string;
  welcomeIntro: string;
  search: string;
  continueWithGoogle: string;
  signingIn: string;
  realTimeTitle: string;
  realTimeText: string;
  reactionsRepliesTitle: string;
  reactionsRepliesText: string;
  yourDataTitle: string;
  yourDataText: string;
  communityGuidelines: string;
  cocPoint1: string;
  cocPoint2: string;
  cocPoint3: string;
  cocDisclaimer: string;
  cocIntro: string;
  cocOutro: string;
  iAgree: string;
  delete: string;
  cancel: string;
  editMessage: string;
  editMessageAria: (name: string) => string;
  editMessageFrom: (name: string) => string;
  save: string;
  saving: string;
  sending: string;
  deleteThisMessage: string;
  deleteMessageBody: string;
  replyTo: (name: string) => string;
  replyingTo: (name: string) => string;
  cancelReply: string;
  quickEmoji: string;
  insertEmoji: (emoji: string) => string;
  writeMessage: string;
  message: string;
  sendMessage: string;
  enterToSend: string;
  anonymous: string;
  noMatches: string;
  nothingFoundFor: (query: string) => string;
  today: string;
  yesterday: string;
  online: (count: number) => string;
  guest: string;
  hi: (name: string) => string;
  hiThere: string;
  copiedTooltip: string;
  copy: string;
  reply: string;
  edit: string;
  removeYourReaction: (emoji: string) => string;
  reactWith: (emoji: string) => string;
  people_one: string;
  people_other: string;
  youReacted: string;
  addReaction: string;
  chooseEmoji: string;
  beKind: string;
  by: string;
  sendingDots: string;
  connectingDots: string;
  signingOutDots: string;
  signingInDots: string;
  offlineBanner: string;
  popupClosedNotError: string;
  popupBlocked: string;
  emailAccountExistsDifferent: string;
  networkProblem: string;
  tooManyAttempts: string;
  somethingWentWrongSignIn: string;
  cannotStart: string;
  configHint: (envExample: string, envFile: string) => string;
  firebaseNotConfigured: string;
  reactionCount: (count: number) => string;
  messageTimeTitle: (date: string, time: string, ago: string) => string;
  // Validation messages
  messageEmpty: string;
  messageTooLong: (max: number) => string;
  failedToUpdateMessage: string;
  failedToSend: string;
  failedToUpdateReaction: string;
  failedToDelete: string;
  permissionDenied: string;
  signOutFailed: string;
}

const en: CommonStrings = {
  language: 'Language',
  switchToLightTheme: 'Switch to light theme',
  switchToDarkTheme: 'Switch to dark theme',
  loadingMessages: 'Loading messages.',
  loadingMessagesSr: 'Loading messages.',
  connecting: 'Connecting…',
  noMessagesYet: 'No messages yet',
  noMessagesYetBody: 'Be the first to say hello!',
  skipToChat: 'Skip to chat',
  communityChat: 'Community chat',
  results_one: 'result',
  results_other: 'results',
  searchMessages: 'Search messages…',
  search: 'Search',
  closeSearch: 'Close search',
  loadEarlierMessages: 'Load earlier messages',
  loading: 'Loading…',
  copyMessage: 'Copy message',
  copied: 'Copied',
  replyToMessage: 'Reply to this message',
  editYourMessage: 'Edit your message',
  deleteYourMessage: 'Delete your message',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  signInTitle: 'Sign in to AK-CHAT',
  welcomeTo: 'Welcome to AK-CHAT',
  welcomeIntro:
    'A real-time community chat for AK01REDWAN followers and friends. Join the conversation, share updates, and stay connected.',
  continueWithGoogle: 'Continue with Google',
  signingIn: 'Signing in…',
  realTimeTitle: 'Real-time',
  realTimeText: 'Messages appear instantly for everyone in the room.',
  reactionsRepliesTitle: 'Reactions & replies',
  reactionsRepliesText: 'React with emoji and quote messages you care about.',
  yourDataTitle: 'Your data, your rules',
  yourDataText: 'Edit or delete anything you post, any time.',
  communityGuidelines: 'Community guidelines',
  cocPoint1: 'Treat others kindly and avoid abusive language.',
  cocPoint2: "Stick to the topic of AK01REDWAN's news and updates.",
  cocPoint3: 'Report any violations to moderators.',
  cocDisclaimer: 'Failure to follow these guidelines may result in warnings, suspension, or a ban.',
  cocIntro: 'AK-CHAT welcomes everyone to chat and share updates. Respectful behavior is expected:',
  cocOutro:
    'Failure to follow these guidelines may result in warnings, suspension, or a ban. Enjoy your time in the chat!',
  iAgree: 'I agree',
  delete: 'Delete',
  cancel: 'Cancel',
  editMessage: 'Edit message',
  editMessageAria: (name: string) => `Edit your message from ${name}`,
  editMessageFrom: (name: string) => `Edit your message from ${name}`,
  save: 'Save',
  saving: 'Saving…',
  sending: 'Sending…',
  deleteThisMessage: 'Delete this message?',
  deleteMessageBody:
    'This permanently removes the message for everyone in the chat. This cannot be undone.',
  replyTo: (name: string) => `Reply to ${name}`,
  replyingTo: (name: string) => `Replying to ${name}`,
  cancelReply: 'Cancel reply',
  quickEmoji: 'Quick emoji',
  insertEmoji: (emoji: string) => `Insert ${emoji}`,
  writeMessage: 'Write a message…',
  message: 'Message',
  sendMessage: 'Send message',
  enterToSend: 'Enter to send',
  anonymous: 'Anonymous',
  noMatches: 'No matches',
  nothingFoundFor: (query: string) => `Nothing found for “${query}”.`,
  today: 'Today',
  yesterday: 'Yesterday',
  online: (count: number) => `${count} online`,
  guest: 'Guest',
  hi: (name: string) => `Hi, ${name}`,
  hiThere: 'Hi, there',
  copiedTooltip: 'Copied',
  copy: 'Copy',
  reply: 'Reply',
  edit: 'Edit',
  removeYourReaction: (emoji: string) => `Remove your ${emoji}`,
  reactWith: (emoji: string) => `React with ${emoji}`,
  people_one: 'person',
  people_other: 'people',
  youReacted: ', you reacted',
  addReaction: 'Add a reaction',
  chooseEmoji: 'Choose an emoji',
  beKind: 'Be kind, stay on topic.',
  by: 'by',
  sendingDots: 'Sending…',
  connectingDots: 'Connecting…',
  signingOutDots: 'Signing out…',
  signingInDots: 'Signing in…',
  offlineBanner: 'You are offline — messages will send when the connection returns.',
  popupClosedNotError: 'The sign-in popup was closed — this is not an error.',
  popupBlocked: 'The sign-in popup was blocked by your browser. Allow popups and try again.',
  emailAccountExistsDifferent:
    'An account with this email already exists using a different sign-in method.',
  networkProblem: 'Network problem. Check your connection and try again.',
  tooManyAttempts: 'Too many attempts. Wait a moment and try again.',
  somethingWentWrongSignIn: 'Something went wrong during sign-in.',
  cannotStart: "AK-CHAT can't start",
  configHint: (envExample: string, envFile: string) =>
    `Copy ${envExample} to ${envFile}, fill in your Firebase web app credentials, then restart. See the deployment guide for details.`,
  firebaseNotConfigured: 'Firebase is not configured.',
  reactionCount: (count: number) => String(count),
  messageTimeTitle: (date: string, time: string, ago: string) => `${date} ${time} • ${ago}`,
  messageEmpty: 'Message cannot be empty.',
  messageTooLong: (max: number) => `Messages are limited to ${max} characters.`,
  failedToUpdateMessage: 'Failed to update the message.',
  failedToSend: 'Failed to send message.',
  failedToUpdateReaction: 'Failed to update reaction.',
  failedToDelete: 'Failed to delete the message.',
  permissionDenied: 'permission-denied',
  signOutFailed: 'Sign out failed.',
};

export default en;
