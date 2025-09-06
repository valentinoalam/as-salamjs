import type { ProductLog } from '@/types/qurban';

export type ProductLogDTO = Omit<ProductLog, "id">
