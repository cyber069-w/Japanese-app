declare module 'virtual:private-pack' {
  /** The private course pack, or null when it isn't bundled (see vite.config.ts). */
  const pack: import('./core/store').PrivatePack | null;
  export default pack;
}
