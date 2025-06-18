"use client";

import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import React from "react";
// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Next.js image
jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // You may need React imported if not already in global scope
    return React.createElement("img", props);
  },
}));

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: "unauthenticated",
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mudhohi: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    pembayaran: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    tipeHewan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    hewanQurban: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));
