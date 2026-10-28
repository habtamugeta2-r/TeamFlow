import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

const SESSION_COOKIE_NAME = "teamflow_session";

function errorEnvelope(code: string, message: string, details: unknown[] = []) {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

  if (typeof sessionToken !== "string" || sessionToken.length === 0) {
    return response.status(401).json(
      errorEnvelope("UNAUTHENTICATED", "Authentication required.", []),
    );
  }

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        expireAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.expireAt.getTime() <= Date.now()) {
      if (session) {
        await prisma.session.deleteMany({
          where: { tokenHash },
        });
      }

      clearSessionCookie(response);

      return response.status(401).json(
        errorEnvelope("UNAUTHENTICATED", "Authentication required.", []),
      );
    }

    request.authUser = session.user;
    return next();
  } catch (error) {
    console.error("session authentication failed", error);

    return response.status(500).json(
      errorEnvelope("INTERNAL_SERVER_ERROR", "Internal server error."),
    );
  }
}
