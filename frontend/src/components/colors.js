// Turns the colour name stored in the database ("red") into a real colour.
const COLORS = {
  red: "#ff5a5f",
  yellow: "#ffd23f",
  green: "#3ddc84",
  blue: "#4dabf7",
  white: "#f8f9fa",
};

export function colorOf(name) {
  return COLORS[name] || "#9b8cff"; // fallback for any other colour
}
