/* eslint-disable @typescript-eslint/no-unused-vars */
// route.ts
import NextAuth, { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "#@/lib/server/prisma.ts"
import { compare } from "bcryptjs"
import type { Role } from "@prisma/client" // Make sure Role is imported

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validate credentials
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email dan password diperlukan')
          }

          // Find user
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              roles: true, // Include user roles (UserRole[] objects)
            },
          })

          // Verify user exists and has password
          if (!user) {
            throw new Error('Akun tidak ditemukan')
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.password!)
          if (!isPasswordValid) {
            throw new Error('Password salah')
          }

          // For CredentialsProvider, we can already transform roles here
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles.map((ur) => ur.role), // <-- Transformed to Role[] here
            image: user.image || null,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    GoogleProvider({
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
        },
      },
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Handle user updates in session
      if (trigger === "update" && session?.user) {
        token.name = session.user.name
        token.image = session.user.image
        // If roles can be updated via session, ensure they are also transformed if needed
        // For simplicity, we'll fetch them from DB below for all cases.
      }
      
      // Crucial: Always fetch the latest user roles from the DB and transform them
      // This ensures consistency regardless of the login provider (Credentials, Google, Email)
      if (user?.id) { // 'user' from `authorize` or `signIn` event
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            roles: true, // Include the UserRole objects from the database
          },
        });

        if (dbUser?.roles) {
          token.roles = dbUser.roles.map((ur) => ur.role); // <-- Transform UserRole[] to Role[] for the token
        } else {
          token.roles = [];
        }
        token.id = user.id;
        token.image = user.image; // Keep original image from provider/DB
        token.name = user.name; // Keep original name from provider/DB
        token.email = user.email; // Keep original email from provider/DB
      }
      return token;
    },
    async session({ session, token }) {
      // Add token info to session
      if (session.user) {
        // Assign the already transformed roles from the token to the session
        session.user.roles = (token.roles || []) as Role[]; // Ensure type safety
        session.user.id = token.id as string;
        session.user.image = token.image as string | null;
      }
      
      return session;
    },
    async signIn({ user, account, profile }) {
      // Handle Google OAuth registration
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email as string }
        })

        if (!existingUser) {
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email as string,
              name: user.name as string,
              roles: {
                create: {
                  role: "USER"
                }
              },
              image: user.image as string,
              accounts: {
                create: {
                  provider: account.provider,
                  type: "oauth",
                  providerAccountId: account.providerAccountId,
                }
              }
            }
          })
        }
      }
      if (account?.provider === "email") {
        const userExists = await prisma.user.findUnique({ where: { email: user.email! } })
        if (!userExists) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name ?? user.email?.split("@")[0],
            },
          })
        }
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/login/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`)
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token.sub}`)
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }