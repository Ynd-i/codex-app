import { getIsElectronMac } from "@/constants/platform";
import { buildDarkSemanticColors, buildDarkTheme, REGISTERED_THEMES as upstream } from "./theme";

// Only the default macOS dark theme follows the supplied Codex reference.
// Keep every other built-in theme and contributed theme under upstream ownership.
const desktopDark = buildDarkTheme({
  ...buildDarkSemanticColors({
    surface0: "#2c2c2b",
    surface1: "#393937",
    surface2: "#454543",
    surface3: "#535351",
    surface4: "#60605e",
    surfaceDiffEmpty: "#30302e",
    surfaceSidebar: "#323230",
    foreground: "#eeeeec",
    foregroundMuted: "#b5b5b2",
    foregroundExtraMuted: "#949490",
    border: "#41413f",
    borderAccent: "#50504d",
    accent: "#dededb",
    accentBright: "#f3f3f0",
    accentForeground: "#2c2c2b",
    destructive: upstream.dark.colors.destructive,
    terminalBlack: "#2c2c2b",
    terminalBrightBlack: "#747471",
  }),
  surfaceWorkspace: "#2c2c2b",
  success: upstream.dark.colors.success,
});

export const REGISTERED_THEMES = getIsElectronMac() ? { ...upstream, dark: desktopDark } : upstream;
