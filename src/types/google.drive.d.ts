import { JWT } from 'google-auth-library';

declare module 'googleapis' {
  interface AuthOptions {
    auth?: JWT | string;
  }
}