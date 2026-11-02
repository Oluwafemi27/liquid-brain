import { useAuth } from "@/store/auth-store";

/** Authorization header for calls to our own REST routes (the server verifies the session token). */
export function authHeaders(): Record<string, string> {
  const token = useAuth.getState().accessToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}
