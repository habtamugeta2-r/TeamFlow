import { Router } from "express";

import { registerSchema, loginSchema } from "./auth.schema.js";
import * as argon2 from "argon2";
import { requireAuth } from "./auth.middleware.js";

import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createHash, randomBytes } from "node:crypto";
import { env } from "node:process";

/**
 * How long a browser session is valid after a successful login.
 * The value is set to 7 days and is also used for the cookie expiry.
 */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Normalizes structured API failures into a consistent JSON envelope.
 *
 * @param code - Stable machine-readable error identifier.
 * @param message - Human-readable summary shown to the client.
 * @param details - Optional validation or field-specific metadata.
 * @returns A standard error payload for HTTP responses.
 */
function errorEnvelope(code: string, message: string, details: unknown[] = []) {
    return {
        error: {
            code,
            message,
            details,
        },
    };
}

/**
 * Router responsible for registration, login, logout, and current-user flows.
 * All routes are under the /api/auth prefix in app.ts.
 */
export const authRouter = Router();

/**
 * Creates a new user account.
 *
 * Flow:
 * 1. Validate the request payload using the Zod registration schema.
 * 2. Hash the raw password with Argon2.
 * 3. Save the user record in PostgreSQL.
 * 4. Return the created public profile without exposing the password hash.
 *
 * Returns 400 for malformed input, 409 when the email is already in use,
 * 500 for unexpected database or server errors.
 */
authRouter.post("/register", async (request, response) => {
    const result = registerSchema.safeParse(request.body);

    if (!result.success) {
        return response.status(400).json(
            errorEnvelope(
                "VALIDATION_ERROR",
                "The request is invalid.",
                result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            ),
        );
    }

    const { name, email, password } = result.data;

    try {
        const hashedPassword = await argon2.hash(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        return response.status(201).json({ user });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return response.status(409).json(
                errorEnvelope("EMAIL_IN_USE", "An account with this email already exists.", []),
            );
        }

        console.error("registration failed", error);

        return response.status(500).json(
            errorEnvelope("INTERNAL_SERVER_ERROR", "Internal server error."),
        );
    }
});

/**
 * Authenticates an existing user and creates a session cookie.
 *
 * Flow:
 * 1. Validate the login payload.
 * 2. Look up the user by email.
 * 3. Verify the supplied password against the stored Argon2 hash.
 * 4. Generate a random session token, store only its hash in the database,
 *    and send the token as an HttpOnly cookie to the browser.
 *
 * Returns 401 for invalid credentials and 500 for unexpected failures.
 */
authRouter.post("/login", async (request, response) => {
    const result = loginSchema.safeParse(request.body);

    if (!result.success) {
        return response.status(400).json(
            errorEnvelope(
                "VALIDATION_ERROR",
                "The request is invalid.",
                result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            ),
        );
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                hashedPassword: true,
            },
        });

        if (!user) {
            return response.status(401).json(
                errorEnvelope("INVALID_CREDENTIALS", "Invalid email or password.", []),
            );
        }

        const passwordMatch = await argon2.verify(user.hashedPassword, password);

        if (!passwordMatch) {
            return response.status(401).json(
                errorEnvelope("INVALID_CREDENTIALS", "Invalid email or password.", []),
            );
        }

        const sessionToken = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
        const expireAt = new Date(Date.now() + SESSION_TTL_MS);

        await prisma.session.create({
            data: {
                tokenHash,
                userId: user.id,
                expireAt,
            },
        });

        response.cookie("teamflow_session", sessionToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_TTL_MS,
        });

        return response.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("login failed", error);

        return response.status(500).json(
            errorEnvelope("INTERNAL_SERVER_ERROR", "Internal server error."),
        );
    }
});

/**
 * Returns the authenticated user's public profile.
 *
 * Requires a valid teamflow_session cookie and is protected by the requireAuth
 * middleware, which validates the hashed token against the database and checks
 * session expiry.
 */
authRouter.get("/me", requireAuth, (request, response) => {
    const user = request.authUser;

    if (!user) {
        return response.status(401).json(
            errorEnvelope("UNAUTHENTICATED", "Authentication required.", []),
        );
    }

    return response.status(200).json({ user });
});

/**
 * Invalidates the current browser session.
 *
 * The token is read from the cookie, hashed, and removed from the sessions table.
 * The browser cookie is then cleared to ensure the client is logged out on the
 * next request.
 */
authRouter.post("/logout", async (request, response) => {
    const sessionToken = request.cookies?.teamflow_session;

    try {
        if (typeof sessionToken === "string" && sessionToken.length > 0) {
            const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
            await prisma.session.deleteMany({
                where: { tokenHash },
            });
        }

        response.clearCookie("teamflow_session", {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        return response.status(200).json({ success: true });
    } catch (error) {
        console.error("logout failed", error);

        return response.status(500).json(
            errorEnvelope("INTERNAL_SERVER_ERROR", "Internal server error."),
        );
    }
});


