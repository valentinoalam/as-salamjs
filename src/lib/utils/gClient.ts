import { JWT } from "google-auth-library"
// import keys from '../../../client_secret.json';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];
const rawKeys = process.env.GOOGLE_SECRET_JSON;

if (!rawKeys) {
    throw new Error("Missing GOOGLE_SECRET_JSON environment variable");
}

let keys: { client_email: string; private_key: string };
try {
    // Parse the JSON string from the environment variable
    keys = JSON.parse(rawKeys);
} catch (error) {
    throw new Error("Invalid GOOGLE_SECRET_JSON format: " + (error instanceof Error ? error.message : String(error)));
}

// Ensure the necessary properties exist in the parsed object
if (!keys.client_email || !keys.private_key) {
    throw new Error("Missing Google API credentials (client_email or private_key) in environment variable");
}
export async function getGoogleClient(scopes = SCOPES) {
  try {
    if (!keys.client_email || !keys.private_key) {
      throw new Error("Missing Google API credentials")
    }

    const client = new JWT({
      email: keys.client_email,
      key: keys.private_key,
      scopes,
    })

    return client
  } catch (error) {
    console.error("Error creating Google client:", error)
    throw error
  }
}
