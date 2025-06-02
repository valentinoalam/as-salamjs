import { JWT } from "google-auth-library"
import keys from '../../client_secret.json';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];
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

