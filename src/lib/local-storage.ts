// Safe localStorage functions that work with SSR
export function getLocalStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") {
      return defaultValue
    }
  
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  }
  
  export function setLocalStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
      return
    }
  
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }
  
  