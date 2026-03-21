import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthPayload {
  email: string;
  password: string;
}

interface RegisterResponse {
  user: AuthUser;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function register(payload: AuthPayload): Promise<AuthUser> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to register: ${message}`);
  }

  const body = (await response.json()) as RegisterResponse;
  return body.user;
}

export async function login(payload: AuthPayload): Promise<LoginResponse> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to login: ${message}`);
  }

  return response.json();
}
