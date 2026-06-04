// erne (Volt) theme tokens — shared across companion chat UI.
// Remapped from the legacy rallyora palette to Volt so every popup/overlay
// that imports T picks up the redesign without per-file edits. Keys are kept
// stable; only the values move to the Volt palette.
export const T = {
  navy: '#16180F',   // dark surface (headers, dark cards)
  navy2: '#1F2116',  // raised surface on dark
  navy3: '#2C2E22',  // border/line on dark
  lime: '#C7F23A',   // accent
  lime2: '#A9D62B',  // accent, darker (hover/active)
  ink: '#16180F',
  paper: '#F1F0E8',  // app background
  white: '#FBFAF4',  // light surface
  muted: '#8A8C7C',  // secondary text (works on light + dark)
  font:
    '"Hanken Grotesk", "Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  radius: 16,
};
