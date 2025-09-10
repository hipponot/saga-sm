export type ID = string;

export type StatusResponse = SuccessResponse | ErrorResponse;

export interface SuccessResponse{
  success: true;
  message?: string;
}

export interface ErrorResponse{
  success: false;
  message: string;
  code?: string;
}

/**
 * @skipSchema
 */
export type DataResponse<T> = SuccessResponse & { data: T; } | ErrorResponse;