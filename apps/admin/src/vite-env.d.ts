/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_API_URL: string
  /** Which tenant this build is for: 'melek' (default) | 'father'. See config/tenant.ts. */
  readonly VITE_TENANT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
