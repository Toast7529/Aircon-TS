export function formatDuration(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

    const safeSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function generateProgressBar(currentSeconds: number, totalSeconds: number, length = 18): string {
    const safeLength = Math.max(5, Math.floor(length));

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        return `:radio_button:${"▬".repeat(safeLength - 1)}`;
    }

    const normalizedCurrent = Number.isFinite(currentSeconds) ? currentSeconds : 0;
    const progress = Math.max(0, Math.min(1, normalizedCurrent / totalSeconds));
    const markerIndex = Math.min(safeLength - 1, Math.floor(progress * (safeLength - 1)));

    const bar = Array.from({ length: safeLength }, (_, index) => {
        if (index === markerIndex) return ":radio_button:";
        if (index < markerIndex) return "▬";
        return "▬";
    }).join("");

    return bar;
}
