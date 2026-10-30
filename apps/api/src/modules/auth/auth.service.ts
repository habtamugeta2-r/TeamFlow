import { createHash, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { ServiceError } from "../../http/service-error.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import type { AuthErrorCode } from "./auth.errors.js";
import { SESSION_TTL_MS } from "./auth.constants.js";
import { performDecoyVerification } from "./auth.password.js";

/* ───────── Public user projection ───────── */

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

/* ───────── Domain error ───────── */

export class AuthServiceError extends ServiceError<AuthErrorCode> {
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthServiceError";
  }
}

/* ───────── Contract ───────── */

export interface AuthService {
  registerUser(input: RegisterInput): Promise<PublicUser>;
  authenticateUser(
    input: LoginInput,
  ): Promise<{ user: PublicUser; sessionToken: string }>;
  findUserBySessionToken(sessionToken: string): Promise<PublicUser | null>;
  revokeSession(sessionToken: string): Promise<void>;
}

export interface AuthServiceConstructor {
  new (database: PrismaClient): AuthService;
}

/* ───────── Implementation ───────── */

export class AuthServiceImpl implements AuthService {
  constructor(private readonly database: PrismaClient) {}

  private hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async registerUser(input: RegisterInput): Promise<PublicUser> {
    const hashedPassword = await argon2.hash(input.password);

    try {
      return await this.database.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AuthServiceError("EMAIL_IN_USE");
      }

      throw error;
    }
  }

  async authenticateUser(
    input: LoginInput,
  ): Promise<{ user: PublicUser; sessionToken: string }> {
    const user = await this.database.user.findUnique({
      where: { email: input.email },
      select: {
        ...publicUserSelect,
        hashedPassword: true,
      },
    });

    if (!user) {
      await performDecoyVerification(input.password);
      throw new AuthServiceError("INVALID_CREDENTIALS");
    }

    const { hashedPassword, ...publicUser } = user;

    if (!(await argon2.verify(hashedPassword, input.password))) {
      throw new AuthServiceError("INVALID_CREDENTIALS");
    }

    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashSessionToken(sessionToken);
    const expireAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.database.$transaction(async (transaction) => {
      await transaction.session.deleteMany({
        where: { userId: user.id },
      });

      await transaction.session.create({
        data: {
          tokenHash,
          userId: user.id,
          expireAt,
        },
      });
    });

    return { user: publicUser, sessionToken };
  }

  async findUserBySessionToken(
    sessionToken: string,
  ): Promise<PublicUser | null> {
    const tokenHash = this.hashSessionToken(sessionToken);
    const session = await this.database.session.findUnique({
      where: { tokenHash },
      select: {
        expireAt: true,
        user: {
          select: publicUserSelect,
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expireAt.getTime() <= Date.now()) {
      await this.database.session.deleteMany({
        where: { tokenHash },
      });
      return null;
    }

    return session.user;
  }

  async revokeSession(sessionToken: string): Promise<void> {
    const tokenHash = this.hashSessionToken(sessionToken);
    await this.database.session.deleteMany({
      where: { tokenHash },
    });
  }
}

export const AuthService: AuthServiceConstructor = AuthServiceImpl;

export function createAuthService(database: PrismaClient): AuthService {
  return new AuthServiceImpl(database);
}
