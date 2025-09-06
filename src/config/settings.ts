import type { SettingValue } from "#@/types/settings.ts";

export const DEFAULT_FRONTEND_SETTINGS: SettingValue = {
  logoImage: "/logo.png",
  logoTitle: "Qurban Management System",
  heroTitle: "Selamat Datang di Sistem Manajemen Qurban",
  heroSubtitle: "Kelola qurban Anda dengan mudah dan efisien",
  itemsPerGroup: 100,
  customGroups: [
    {
      id: "group-1",
      name: "Grup A",
      itemCount: 10,
      description: "Grup default untuk sapi",
      isActive: true,
      createdAt: new Date(), // Add default for missing fields based on your schema
      updatedAt: new Date(),
    },
    {
      id: "group-2",
      name: "Grup B",
      itemCount: 15,
      description: "Grup default untuk domba",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  useCarousel: false,
  selectedHeroImageIds: [],
};