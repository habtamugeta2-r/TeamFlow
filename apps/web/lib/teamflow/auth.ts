import { apiRequest } from "../api";
import type { TeamUser } from "./types";

export async function getCurrentUser(): Promise<TeamUser> {
  const result = await apiRequest<{ user: TeamUser }>("/api/auth/me");
  return result.user;
}

export async function signIn(
  email: string,
  password: string,
): Promise<TeamUser> {
  const result = await apiRequest<{ user: TeamUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return result.user;
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await apiRequest<{ user: TeamUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signOut(): Promise<void> {
  await apiRequest<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}
