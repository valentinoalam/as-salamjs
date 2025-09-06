import type { Prisma, Setting } from '@prisma/client';
import prisma from '../prisma';

export class SettingsRepository {
  /**
   * Finds a setting by its key.
   * @param key The key of the setting to find.
   * @returns The setting object if found, otherwise null.
   */
  async findByKey(key: string): Promise<Setting | null> {
    return prisma.setting.findUnique({
      where: { key },
    });
  }

  /**
   * Creates a new setting.
   * @param data The data for the new setting.
   * @returns The created setting object.
   */
  async create(data: Prisma.SettingCreateInput): Promise<Setting> {
    return prisma.setting.create({
      data,
    });
  }

  /**
   * Updates an existing setting by its key.
   * @param key The key of the setting to update.
   * @param data The data to update the setting with.
   * @returns The updated setting object.
   */
  async update(key: string, data: Prisma.SettingUpdateInput): Promise<Setting> {
    return prisma.setting.update({
      where: { key },
      data,
    });
  }

  /**
   * Deletes a setting by its key.
   * @param key The key of the setting to delete.
   * @returns The deleted setting object.
   */
  async delete(key: string): Promise<Setting> {
    return prisma.setting.delete({
      where: { key },
    });
  }

  /**
   * Finds all settings.
   * @returns An array of all setting objects.
   */
  async findAll(): Promise<Setting[]> {
    return prisma.setting.findMany();
  }

  /**
   * Finds or creates a setting. If a setting with the given key exists, it returns it.
   * Otherwise, it creates a new one with the provided value.
   * @param key The key of the setting.
   * @param defaultValue The default value to use if the setting does not exist.
   * @returns The found or created setting.
   */
  async findOrCreate(key: string, defaultValue: string): Promise<Setting> {
    let setting = await this.findByKey(key);
    if (!setting) {
      setting = await this.create({ key, value: defaultValue });
    }
    return setting;
  }
}