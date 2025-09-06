

//cache

// Cache keys for localStorage
export const CACHE_KEYS = {
  TRANSACTIONS: 'keuangan_transactions',
  CATEGORIES: 'keuangan_categories', 
  BUDGETS: 'keuangan_budgets',
  STATS: 'keuangan_stats',
  QURBAN_SALES: 'keuangan_qurban_sales',
  WEEKLY_SALES: 'keuangan_weekly_sales',
  PROCESSED_OVERVIEW: 'keuangan_processed_overview',
  LAST_FETCH: 'keuangan_last_fetch',
  FILTERS: 'keuangan_filters'
} as const

// Cache duration in milliseconds (5 minutes for dynamic data, 30 minutes for static data)
export const CACHE_DURATION = {
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  CATEGORIES: 30 * 60 * 1000,  // 30 minutes
  BUDGETS: 10 * 60 * 1000,     // 10 minutes
  STATS: 5 * 60 * 1000,        // 5 minutes
  QURBAN_SALES: 5 * 60 * 1000, // 5 minutes
} as const