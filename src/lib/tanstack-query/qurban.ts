// Define query keys
export const queryKeys = {
  sapi: ['hewan', 'sapi'],
  domba: ['hewan', 'domba'],
  products: ['products'],
  shipments: ['shipments'],
  productLogs: ['productLogs'],
  errorLogs: ['errorLogs'],
  meta: ['meta'],
  mudhohi: ['mudhohi'],
  distribusi: ['distribusi'],
  penerima: ['penerima'],
}

export const qurbanKeys = {
  sapi: (page: number) => [...queryKeys.sapi, page],
  domba: (group: string, page: number) => [...queryKeys.domba, group, page]
}