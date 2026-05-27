export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DELETED = 'deleted',
}

export interface PaginatedResponse<T> {
  list: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

