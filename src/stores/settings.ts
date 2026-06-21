import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Ajustes de la app persistidos en localStorage.
interface SettingsState {
  /**
   * Umbral de confianza de la criba edge (FOMO), 0–1. Gobierna el `min_score` con el que
   * FOMO emite candidatos y, por tanto, la decisión de criba (H8). Bajo = criba sensible
   * (más recall, menos ahorro de banda). Ver discusión de H8 en el TFM.
   */
  edgeScreenThreshold: number;
  setEdgeScreenThreshold: (v: number) => void;
}

export const DEFAULT_EDGE_SCREEN_THRESHOLD = 0.05;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      edgeScreenThreshold: DEFAULT_EDGE_SCREEN_THRESHOLD,
      setEdgeScreenThreshold: (v) => set({ edgeScreenThreshold: Math.min(1, Math.max(0, v)) }),
    }),
    { name: 'coastwatch-settings' },
  ),
);
