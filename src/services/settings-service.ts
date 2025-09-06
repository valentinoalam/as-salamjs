/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiResponse } from "#@/lib/DTOs/global.ts"
import type { CustomGroup, GroupSettings, LogoSettings, SettingValue } from "#@/types/settings.ts"
import { DEFAULT_FRONTEND_SETTINGS } from "#@/config/settings.ts";

const settingsApi = {
  async getSetting(key: string): Promise<ApiResponse<string | null>> {
    try {
      const response = await fetch(`/api/settings/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      const result: ApiResponse<string | null> = await response.json();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async getSettings(): Promise<ApiResponse<SettingValue>> {
    try {
      const response = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      const rawSettings: Array<{ key: string; value: string }> = await response.json();
      const transformedSettings: SettingValue = { ...DEFAULT_FRONTEND_SETTINGS };

      rawSettings.forEach(setting => {
        switch (setting.key) {
          case 'logoImage':
          case 'logoTitle':
          case 'heroTitle':
          case 'heroSubtitle':
            transformedSettings[setting.key] = setting.value;
            break;
          case 'itemsPerGroup':
            transformedSettings.itemsPerGroup = Number.parseInt(setting.value) || DEFAULT_FRONTEND_SETTINGS.itemsPerGroup;
            break;
          case 'useCarousel':
            transformedSettings.useCarousel = setting.value === 'true';
            break;
          case 'selectedHeroImageIds':
            try {
              transformedSettings.selectedHeroImageIds = JSON.parse(setting.value);
            } catch {
              transformedSettings.selectedHeroImageIds = DEFAULT_FRONTEND_SETTINGS.selectedHeroImageIds;
            }
            break;
          case 'customGroups':
            try {
              transformedSettings.customGroups = JSON.parse(setting.value);
            } catch {
              transformedSettings.customGroups = DEFAULT_FRONTEND_SETTINGS.customGroups;
            }
            break;
        }
      });
      
      return { success: true, data: transformedSettings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async updateLogoSettings(data: LogoSettings): Promise<ApiResponse<LogoSettings>> {
    try {
      const response = await fetch('/api/settings/logo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async updateGroupSettings(data: GroupSettings): Promise<ApiResponse<GroupSettings>> {
    try {
      const response = await fetch('/api/settings/groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async uploadLogo(file: File): Promise<ApiResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async createCustomGroup(data: Omit<CustomGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CustomGroup>> {
    try {
      const response = await fetch('/api/settings/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async updateCustomGroup(id: string, data: Partial<CustomGroup>): Promise<ApiResponse<CustomGroup>> {
    try {
      const response = await fetch(`/api/settings/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async deleteCustomGroup(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`/api/settings/groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async updateSetting(key: string, value: any): Promise<ApiResponse> {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';   
      return { success: false, error: errorMessage };
    }
  },

  async updateMultipleSettings(settings: Record<string, any>): Promise<ApiResponse> {
    try {
      const response = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  },

  async resetToDefaults(): Promise<ApiResponse> {
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: errorMessage };
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return { success: false, error: errorMessage };
    }
  }
};

export default settingsApi;