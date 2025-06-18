import NextAuth, { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
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
          if (!user) {
            // const newUser = await prisma.user.create({
            //   data: {
            //     email: credentials.email,
            //     name: credentials.email.split('@')[0], // Default name
            //     password: await hash(credentials.password, 12), // Remember to import hash from bcryptjs
            //     role: 'USER' as Role,
            //   }
            // })
            // return {
            //   id: newUser.id,
            //   email: newUser.email,
            //   name: newUser.name,
            //   role: newUser.role,
            //   urlAvatar: newUser.urlAvatar
            // }
            throw new Error('Akun tidak ditemukan')
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.password!)
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
        token.urlAvatar = session.user.urlAvatar
      }
      
      if (user) {
        token.id = user.id
        token.role = user.role
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user, account, profile }) {
      // Handle Google OAuth registration
      if (account?.provider === "google") {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email as string }
        })

        // Create new user if doesn't exist
        if (!existingUser) {
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email as string,
              name: user.name as string,
              role: 'USER' as Role,
              urlAvatar: user.image as string,
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
  //   async redirect({ url, baseUrl }) {
  //   if (token?.role === 'ADMIN') {
  //     return url
  //   }
  //   return baseUrl // fallback
  // },
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