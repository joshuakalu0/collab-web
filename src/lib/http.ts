import { NextResponse } from "next/server";

type SuccessInit = Omit<ResponseInit, "status"> & {
  detail?: string | null;
  status?: number;
};

type ErrorInit = Omit<ResponseInit, "status">;

export function apiError(status: number, error: string, detail: string, init?: ErrorInit) {
  return NextResponse.json(
    {
      data: null,
      detail,
      error
    },
    {
      headers: init?.headers,
      status
    }
  );
}

export function apiSuccess<T>(data: T, init?: SuccessInit) {
  return NextResponse.json(
    {
      data,
      detail: init?.detail ?? null,
      error: null
    },
    {
      headers: init?.headers,
      status: init?.status ?? 200
    }
  );
}
