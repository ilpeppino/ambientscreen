import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";

const SLIDES_TIMEOUT_MS = 8000;

export interface SlideRecord {
  id: string;
  profileId: string;
  name: string;
  order: number;
  durationSeconds: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface SlidesListResponse {
  slides: SlideRecord[];
}

function withProfileQuery(path: string, profileId?: string) {
  if (!profileId) {
    return path;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("profileId", profileId);
  return `${path}?${searchParams.toString()}`;
}

export async function listSlides(profileId?: string): Promise<SlidesListResponse> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/slides`, profileId),
    undefined,
    SLIDES_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch slides: ${message}`);
  }

  return response.json();
}

export async function createSlide(
  payload: { name: string; durationSeconds?: number | null; isEnabled?: boolean },
  profileId?: string,
): Promise<SlideRecord> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/slides`, profileId),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    SLIDES_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create slide: ${message}`);
  }

  return response.json();
}

export async function updateSlide(
  slideId: string,
  payload: { name?: string; durationSeconds?: number | null; isEnabled?: boolean; order?: number },
  profileId?: string,
): Promise<SlideRecord> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/slides/${slideId}`, profileId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    SLIDES_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update slide: ${message}`);
  }

  return response.json();
}

export async function deleteSlide(slideId: string, profileId?: string): Promise<void> {
  const response = await apiFetchWithTimeout(
    withProfileQuery(`${API_BASE_URL}/slides/${slideId}`, profileId),
    {
      method: "DELETE",
    },
    SLIDES_TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete slide: ${message}`);
  }
}
