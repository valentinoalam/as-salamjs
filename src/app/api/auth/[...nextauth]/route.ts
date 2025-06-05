import NextAuth, { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { compare } from "bcryptjs"
import type { Role } from "@prisma/client"

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
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
            select: {
              id: true,
              name: true,
              email: true,
              password: true,
              role: true,
              urlAvatar: true
            }
          })

          // Verify user exists and has password
          if (!user || !user.password) {
            throw new Error('Akun tidak ditemukan')
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.password)
          if (!isPasswordValid) {
            throw new Error('Password salah')
          }

          // Return user object without password
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            urlAvatar: user.urlAvatar || null,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          // Return null instead of throwing to prevent exposing sensitive errors
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to token on initial sign-in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.urlAvatar = user.image
      }
      return token
    },
    async session({ session, token }) {
      // Add token info to session
      if (session.user) {
        session.user.role = token.role as Role
        session.user.id = token.id as string
        session.user.urlAvatar = token.urlAvatar as string | null
      }
      // Add cache control headers
      if (typeof window === "undefined") {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`)
        response.headers.set(
          "Cache-Control", 
          "public, s-maxage=3600, stale-while-revalidate=600"
        )
      }
      
      return session
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
  debug: false, //process.env.NODE_ENV === 'development',
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