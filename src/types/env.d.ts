// Add this new file to help TS know env vars are strings
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_PUSHER_KEY?: string;
    NEXT_PUBLIC_PUSHER_CLUSTER?: string;
    PUSHER_APP_ID?: string;
    PUSHER_KEY?: string;
    PUSHER_SECRET?: string;
    PUSHER_CLUSTER?: string;
  }
}