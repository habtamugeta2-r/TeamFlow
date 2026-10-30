import * as argon2 from "argon2";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$6iMIyi+dx3CuctNSaHyQmA$YE5ic+Or118TAj1PeVTy6Wu0KtjAZHOfCIGnKiPRPi8";

export async function performDecoyVerification(
  plainPassword: string,
): Promise<void> {
  await argon2.verify(DUMMY_PASSWORD_HASH, plainPassword);
}
