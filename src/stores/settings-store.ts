import type { CustomGroup, HeroImage } from "#@/types/settings.ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import settingsApi from '#@/services/settings-service.ts'; // Also import settingsApi for bulk updates directly
import { SettingsManager } from "#@/lib/manager/settings-manager.ts";
import { DEFAULT_FRONTEND_SETTINGS } from "#@/config/settings.ts";

interface SettingsState {
  logoImage: string;
  logoTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  itemsPerGroup: number;
  customGroups: CustomGroup[];
  useCarousel: boolean;
  selectedHeroImageIds: string | string[] | null;

  isLoading: boolean;
  isSaving: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  updateMultipleSettings: (settings: Record<string, string>) => Promise<void>;
  addCustomGroup: (group: Omit<CustomGroup, "id" | "createdAt" | "updatedAt">) => Promise<void>; // Updated type to match SettingsManager
  updateCustomGroup: (id: string, updates: Partial<CustomGroup>) => Promise<void>;
  deleteCustomGroup: (id: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getActiveHeroImages: (allImages: HeroImage[]) => HeroImage[];
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initialize state with default settings
      logoImage: DEFAULT_FRONTEND_SETTINGS.logoImage,
      logoTitle: DEFAULT_FRONTEND_SETTINGS.logoTitle,
      heroTitle: DEFAULT_FRONTEND_SETTINGS.heroTitle,
      heroSubtitle: DEFAULT_FRONTEND_SETTINGS.heroSubtitle,
      itemsPerGroup: DEFAULT_FRONTEND_SETTINGS.itemsPerGroup,
      customGroups: DEFAULT_FRONTEND_SETTINGS.customGroups,
      useCarousel: DEFAULT_FRONTEND_SETTINGS.useCarousel,
      selectedHeroImageIds: DEFAULT_FRONTEND_SETTINGS.selectedHeroImageIds,

      isLoading: false,
      isSaving: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          // Use SettingsManager.getSettings() which now returns ApiResponse<SettingValue>
          const allSettings = await SettingsManager.getSettings();

          if (allSettings) {
            const {
              logoImage,
              logoTitle,
              heroTitle,
              heroSubtitle, // Correctly included in destructuring
              itemsPerGroup,
              customGroups,
              useCarousel,
              selectedHeroImageIds,
            } = allSettings; // Destructure from .data property

            set({
              logoImage,
              logoTitle,
              heroTitle,
              heroSubtitle,
              itemsPerGroup,
              customGroups,
              useCarousel, // Correctly assigned
              selectedHeroImageIds, // Correctly assigned
            });
          } else {
            console.log("Failed to load settings: No data received.");
            set({ ...DEFAULT_FRONTEND_SETTINGS });
          }
        } catch (e) {
          console.error("Error loading settings:", e);
        } finally {
          set({ isLoading: false });
        }
      },

      updateSetting: async (key, value) => {
        set({ isSaving: true });
        try {
          // Update local state based on the updated value (optimistic update or from API response if applicable)
          set((state) => {
            const patch: Partial<SettingsState> = {};
            switch (key) {
              case "logoImage":
                patch.logoImage = value;
                break;
              case "logoTitle":
                patch.logoTitle = value;
                break;
              case "heroTitle":
                patch.heroTitle = value;
                break;
              case "heroSubtitle":
                patch.heroSubtitle = value;
                break;
              case "itemsPerGroup":
                patch.itemsPerGroup = Number(value);
                break;
              case "customGroups":
                // If customGroups are managed as a single JSON string
                patch.customGroups = JSON.parse(value);
                break;
              case "useCarousel":
                patch.useCarousel = value === "true";
                // Adjust selectedHeroImageIds logic as needed for carousel toggle
                patch.selectedHeroImageIds =
                  value === "true"
                    ? Array.isArray(state.selectedHeroImageIds)
                      ? state.selectedHeroImageIds
                      : state.selectedHeroImageIds
                      ? [state.selectedHeroImageIds]
                      : []
                    : Array.isArray(state.selectedHeroImageIds)
                    ? state.selectedHeroImageIds[0] || null
                    : state.selectedHeroImageIds;
                break;
              case "selectedHeroImageIds":
                patch.selectedHeroImageIds = JSON.parse(value);
                break;
            }
            return { ...state, ...patch };
          });
        } catch (e) {
          console.error("Error updating setting:", e);
          // Error toasts are handled by settingsApi via SettingsManager
          throw e; // Re-throw to propagate if needed by calling components
        } finally {
          set({ isSaving: false });
        }
      },

      updateMultipleSettings: async (settings) => {
        set({ isSaving: true });
        try {
          // Use settingsApi directly for bulk updates as SettingsManager does not expose this.
          const result = await settingsApi.updateMultipleSettings(settings);
          if (!result.success) {
            // Toast handled by settingsApi
            throw new Error(result.error || "Failed to update multiple settings");
          }
          await get().loadSettings(); // Reload all settings to ensure consistency after bulk update
        } catch (e) {
          console.error("Error bulk updating settings:", e);
          throw e;
        } finally {
          set({ isSaving: false });
        }
      },

      addCustomGroup: async (group) => {
        set({ isSaving: true });
        try {
          // Delegate to SettingsManager for creating a custom group
          await SettingsManager.addCustomGroup(group);
          // After a successful operation, reload settings to sync customGroups state
          await get().loadSettings();
        } catch (e) {
          console.error("Error adding custom group:", e);
          throw e;
        } finally {
          set({ isSaving: false });
        }
      },

      updateCustomGroup: async (id, updates) => {
        set({ isSaving: true });
        try {
          // Delegate to SettingsManager for updating a custom group
          await SettingsManager.updateCustomGroup(id, updates);
          // After a successful operation, reload settings to sync customGroups state
          await get().loadSettings();
        } catch (e) {
          console.error("Error updating custom group:", e);
          throw e;
        } finally {
          set({ isSaving: false });
        }
      },

      deleteCustomGroup: async (id) => {
        set({ isSaving: true });
        try {
          // Delegate to SettingsManager for deleting a custom group
          await SettingsManager.deleteCustomGroup(id);
          // After a successful operation, reload settings to sync customGroups state
          await get().loadSettings();
        } catch (e) {
          console.error("Error deleting custom group:", e);
          throw e;
        } finally {
          set({ isSaving: false });
        }
      },

      resetToDefaults: async () => {
        set({ isSaving: true });
        try {
          // Delegate to SettingsManager to reset settings
          await SettingsManager.resetToDefaults();
          // After reset, load default settings into the store
          set({
            logoImage: DEFAULT_FRONTEND_SETTINGS.logoImage,
            logoTitle: DEFAULT_FRONTEND_SETTINGS.logoTitle,
            heroTitle: DEFAULT_FRONTEND_SETTINGS.heroTitle,
            heroSubtitle: DEFAULT_FRONTEND_SETTINGS.heroSubtitle,
            itemsPerGroup: DEFAULT_FRONTEND_SETTINGS.itemsPerGroup,
            customGroups: DEFAULT_FRONTEND_SETTINGS.customGroups,
            useCarousel: DEFAULT_FRONTEND_SETTINGS.useCarousel,
            selectedHeroImageIds: DEFAULT_FRONTEND_SETTINGS.selectedHeroImageIds,
          });
        } catch (e) {
          console.error("Error resetting settings to defaults:", e);
          throw e;
        } finally {
          set({ isSaving: false });
        }
      },

      getActiveHeroImages: (allImages) => {
        const { useCarousel, selectedHeroImageIds } = get();

        if (useCarousel && Array.isArray(selectedHeroImageIds)) {
          return selectedHeroImageIds
            .map((id) => allImages.find((img) => img.id === id))
            .filter((img): img is HeroImage => !!img);
        }

        if (!useCarousel && typeof selectedHeroImageIds === "string") {
          const img = allImages.find((i) => i.id === selectedHeroImageIds);
          return img ? [img] : [];
        }

        return [];
      },
    }),
    {
      name: "settings-storage",
      partialize: (state) => ({
        logoImage: state.logoImage,
        logoTitle: state.logoTitle,
        heroTitle: state.heroTitle,
        heroSubtitle: state.heroSubtitle,
        itemsPerGroup: state.itemsPerGroup,
        customGroups: state.customGroups,
        useCarousel: state.useCarousel,
        selectedHeroImageIds: state.selectedHeroImageIds,
      }),
    }
  )
);