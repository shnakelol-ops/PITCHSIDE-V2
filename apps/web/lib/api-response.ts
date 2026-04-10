import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "./errors";

export const apiSuccess = <T>(data: T, init?: ResponseInit) => {
  return NextResponse.json({ data }, { status: 200, ...init });
};

export const apiCreated = <T>(data: T) => {
  return NextResponse.json({ data }, { status: 201 });
};

export const apiError = (error: unknown) => {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message =
      first?.message && first.message.length > 0
        ? first.message
        : "Request validation failed.";
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message,
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong."
      }
    },
    { status: 500 }
  );
};

export const requireJson = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    throw new AppError("Invalid JSON body.", {
      statusCode: 400,
      code: "INVALID_JSON"
    });
  }
};
