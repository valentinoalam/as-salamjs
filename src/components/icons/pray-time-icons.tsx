import { Clock, Sunrise, Sun, Moon, Sunset } from "lucide-react"

export const IconShubuh = () => <Clock className="hidden sm:inline-flex mr-1 h-4 w-4 text-blue-600" />

export const IconSuruq = () => <Sunrise className="hidden sm:inline-flex mr-1 h-4 w-4 text-orange-500" />

export const IconDhuha = () => <Sun className="hidden sm:inline-flex mr-1 h-4 w-4 text-yellow-500" />

export const IconDhuhur = () => <Sun className="hidden sm:inline-flex mr-1 h-4 w-4 text-orange-600" />

export const IconAshar = () => <Sun className="hidden sm:inline-flex mr-1 h-4 w-4 text-amber-700" />

export const IconMagrib = () => <Sunset className="hidden sm:inline-flex mr-1 h-4 w-4 text-rose-600" />

export const IconIsya = () => <Moon className="hidden sm:inline-flex mr-1 h-4 w-4 text-indigo-600" />

/**
 *  This file contains all the icon components needed for the prayer times
// In a real application, these would be separate files, but I'm combining them here for simplicity

export function IconShubuh() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
      <path d="M12 6v1.5M12 16.5V18M6 12h1.5M16.5 12H18"/>
    </svg>
  );
}

export function IconSuruq() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 2L8 6h3v10h2V6h3L12 2zM19 18l-4 4v-3H5v-2h10v-3l4 4z"/>
    </svg>
  );
}

export function IconDhuha() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 2v2M12 20v2M22 12h-2M4 12H2M20 4l-1.41 1.41M5.41 18.59L4 20M20 20l-1.41-1.41M5.41 5.41L4 4"/>
    </svg>
  );
}

export function IconDhuhur() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7"/>
      <path d="M12 9v3l2 2"/>
    </svg>
  );
}

export function IconAshar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="6"/>
      <path d="M12 8v4l2.5 2.5"/>
      <path d="M16 2v4M8 2v4M16 18v4M8 18v4"/>
    </svg>
  );
}

export function IconMagrib() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 22L8 18h3V8h2v10h3l-4 4zM19 6l-4-4v3H5v2h10v3l4-4z"/>
    </svg>
  );
}

export function IconIsya() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 109 9c0-5-4-9-9-9zm0 16a7 7 0 110-14 7 7 0 010 14z"/>
      <path d="M15.9 11.2l-2.3 2.3.6 3.2-2.9-1.5L8.4 16.7l.6-3.2-2.3-2.3 3.3-.4 1.4-2.9 1.4 2.9 3.1.4z"/>
    </svg>
  );
}

// Export all icons from one file for ease of import
export default {
  IconShubuh,
  IconSuruq,
  IconDhuha,
  IconDhuhur,
  IconAshar,
  IconMagrib,
  IconIsya
};
 */