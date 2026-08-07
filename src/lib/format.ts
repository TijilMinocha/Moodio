/** 272 -> "04:32". Mirrors secondsToMinutesSeconds from the original script.js. */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
