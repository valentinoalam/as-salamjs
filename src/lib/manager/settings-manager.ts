/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from '#@/hooks/use-toast.ts';
import settingsApi from '#@/services/settings-service.ts';
import type { CustomGroup, SettingValue, LogoSettings, GroupSettings } from '#@/types/settings.ts';

export class SettingsManager {

  /**
   * Get a single setting by key
   */
  static async getSetting(key: string): Promise<string | null> {
    const result = await settingsApi.getSetting(key);
    
    if (!result.success) {
      console.error(`Failed to retrieve setting '${key}' from API: ${result.error}`);
      toast({
        title: "Error",
        description: `Failed to load setting '${key}': ${result.error}`,
        variant: "destructive",
      });
      throw new Error(result.error || `Failed to retrieve setting '${key}'`);
    }
    
    return result.data!;
  }

  /**Promise<ApiResponse<SettingValue>>
   * Get all settings
   */
  static async getSettings(): Promise<SettingValue> {
    const result = await settingsApi.getSettings();
    
    if (!result.success) {
      console.error(`Failed to retrieve settings from API: ${result.error}`);
      toast({
        title: "Error",
        description: `Failed to load settings: ${result.error}`,
        variant: "destructive",
      });
      throw new Error(result.error || 'Failed to get settings');
    }
    
    return result.data!;
  }

  /**
   * Update a single setting
   */
  static async setSetting(key: string, value: string): Promise<void> {
    const result = await settingsApi.updateSetting(key, value);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
      
    } else {
      toast({
        title: "Error",
        description: result.error ? `Failed to update setting: ${result.error}` : "Failed to update setting",
        variant: "destructive",
      });
      throw new Error(result.error || `Failed to update setting '${key}'`);
    }
  }

  /**
   * Get and parse a JSON setting
   */
  static async getJsonSetting<T>(key: string): Promise<T | null> {
    const value = await this.getSetting(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`Failed to parse JSON setting for key '${key}':`, e);
      toast({
        title: "Error",
        description: `Failed to parse setting '${key}': Invalid JSON format`,
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Set a JSON setting
   */
  static async setJsonSetting<T>(key: string, value: T): Promise<void> {
    await this.setSetting(key, JSON.stringify(value));
  }

  /**
   * Update logo settings
   */
  static async setLogoSettings(data:{logoImage?: string, logoTitle?: string}): Promise<Partial<LogoSettings> | void> {
    const result = await settingsApi.updateLogoSettings(data);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Logo settings updated successfully",
      });
      return result.data
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update logo settings",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to set logo settings");
    }
  }

  /**
   * Update hero settings
   */
  static async setHeroSettings(heroImage?: string, heroTitle?: string, heroSubtitle?: string): Promise<void> {
    const updates: Record<string, string> = {};
    
    if (heroImage !== undefined) {
      updates.hero_image = heroImage;
    }
    if (heroTitle !== undefined) {
      updates.heroTitle = heroTitle;
    }
    if (heroSubtitle !== undefined) {
      updates.heroSubtitle = heroSubtitle;
    }

    if (Object.keys(updates).length === 0) return;

    const result = await settingsApi.updateMultipleSettings(updates);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Hero settings updated successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update hero settings",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to set hero settings");
    }
  }

  /**
   * Set items per group
   */
  static async setItemsPerGroup(count: number): Promise<void> {
    const data: GroupSettings = { itemsPerGroup: count };
    const result = await settingsApi.updateGroupSettings(data);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Items per group updated successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update items per group",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to set items per group");
    }
  }

  /**
   * Upload logo file
   */
  static async uploadLogo(file: File): Promise<string> {
    const result = await settingsApi.uploadLogo(file);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      return result.data!.url;
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to upload logo",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to upload logo");
    }
  }

  /**
   * Set custom groups (for internal JSON management)
   */
  static async setCustomGroups(groups: CustomGroup[]): Promise<void> {
    await this.setJsonSetting('customGroups', groups);
  }

  /**
   * Add a new custom group
   */
  static async addCustomGroup(data: Omit<CustomGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomGroup> {
    const result = await settingsApi.createCustomGroup(data);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Custom group created successfully",
      });
      return result.data!;
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create custom group",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to add custom group");
    }
  }

  /**
   * Update an existing custom group
   */
  static async updateCustomGroup(id: string, updates: Partial<Omit<CustomGroup, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CustomGroup> {
    const result = await settingsApi.updateCustomGroup(id, updates);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Custom group updated successfully",
      });
      return result.data!;
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update custom group",
        variant: "destructive",
      });
      throw new Error(result.error || `Failed to update custom group with ID ${id}`);
    }
  }

  /**
   * Delete a custom group
   */
  static async deleteCustomGroup(id: string): Promise<void> {
    const result = await settingsApi.deleteCustomGroup(id);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Custom group deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete custom group",
        variant: "destructive",
      });
      throw new Error(result.error || `Failed to delete custom group with ID ${id}`);
    }
  }

  /**
   * Update multiple settings at once
   */
  static async updateMultipleSettings(settings: Record<string, any>): Promise<void> {
    const result = await settingsApi.updateMultipleSettings(settings);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update settings",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to update multiple settings");
    }
  }

  /**
   * Reset all settings to defaults
   */
  static async resetToDefaults(): Promise<void> {
    const result = await settingsApi.resetToDefaults();
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Settings reset to defaults successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reset settings",
        variant: "destructive",
      });
      throw new Error(result.error || "Failed to reset settings to defaults");
    }
  }
}

/* Usage Examples:

// Get a single setting
const logoTitle = await SettingsManager.getSetting('logoTitle');

// Get all settings
const allSettings = await SettingsManager.getSettings();

// Update logo settings
await SettingsManager.setLogoSettings('path/to/logo.png', 'My App');

// Update hero settings
await SettingsManager.setHeroSettings(undefined, 'Welcome!', 'Get started today');

// Upload a logo
const logoUrl = await SettingsManager.uploadLogo(file);

// Add custom group
const newGroup = await SettingsManager.addCustomGroup({
  name: 'Special Offers',
  itemCount: 5,
  description: 'Limited time offers',
  order: 4
});

// Update multiple settings
await SettingsManager.updateMultipleSettings({
  heroTitle: 'New Title',
  heroSubtitle: 'New Subtitle',
  itemsPerGroup: 10
});

// Reset to defaults
await SettingsManager.resetToDefaults();

*/