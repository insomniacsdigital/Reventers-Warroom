export const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

export function chartChrome(dark: boolean) {
  return {
    surface: dark ? "#1a1a19" : "#fcfcfb",
    textPrimary: dark ? "#ffffff" : "#0b0b0b",
    textSecondary: dark ? "#c3c2b7" : "#52514e",
    muted: "#898781",
    grid: dark ? "#2c2c2a" : "#e1e0d9",
    baseline: dark ? "#383835" : "#c3c2b7",
    seriesBlue: dark ? "#3987e5" : "#2a78d6",
    seriesOrange: dark ? "#d95926" : "#eb6834",
  };
}
