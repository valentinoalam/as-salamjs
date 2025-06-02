export default function debounce(func: (...args: unknown[]) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function executedFunction(...args: unknown[]) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }