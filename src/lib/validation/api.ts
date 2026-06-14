import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export function handleApiError(error: any) {
  console.error("API Error:", error);
  
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation error",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const status = error.status || 500;
  const message = error.message || "An unexpected error occurred";

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}
