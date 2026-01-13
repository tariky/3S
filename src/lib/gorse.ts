// Gorse recommendation engine client configuration

const gorseUrl = process.env.GORSE_URL || "http://localhost:8087";
const gorseToken = process.env.GORSE_TOKEN || "";

// Types
export interface GorseItem {
  ItemId: string;
  IsHidden: boolean;
  Categories: string[];
  Timestamp: string;
  Labels: string[];
  Comment: string;
}

export interface GorseUser {
  UserId: string;
  Labels: string[];
  Subscribe: string[];
  Comment: string;
}

export interface GorseFeedback {
  FeedbackType: string;
  UserId: string;
  ItemId: string;
  Timestamp: string;
}

export interface GorseRecommendation {
  Id: string;
  Score: number;
}

// Check if Gorse is configured
export function isGorseConfigured(): boolean {
  return !!(process.env.GORSE_URL && process.env.GORSE_TOKEN);
}

// Get Gorse URL (for display in admin)
export function getGorseUrl(): string {
  return gorseUrl;
}

// Generic request function with auth header
export async function gorseRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${gorseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(gorseToken && { "X-API-Key": gorseToken }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gorse API error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// Insert or update a single item
export async function upsertItem(item: GorseItem): Promise<void> {
  await gorseRequest("/api/item", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

// Insert multiple items
export async function upsertItems(items: GorseItem[]): Promise<void> {
  await gorseRequest("/api/items", {
    method: "POST",
    body: JSON.stringify(items),
  });
}

// Delete an item
export async function deleteItem(itemId: string): Promise<void> {
  await gorseRequest(`/api/item/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

// Insert feedback
export async function insertFeedback(feedback: GorseFeedback[]): Promise<void> {
  await gorseRequest("/api/feedback", {
    method: "POST",
    body: JSON.stringify(feedback),
  });
}

// Get personalized recommendations for a user
export async function getRecommendations(
  userId: string,
  n: number = 10,
  categories?: string[]
): Promise<GorseRecommendation[]> {
  let endpoint = `/api/recommend/${encodeURIComponent(userId)}?n=${n}`;
  if (categories && categories.length > 0) {
    endpoint += `&category=${encodeURIComponent(categories.join(","))}`;
  }
  try {
    return await gorseRequest<GorseRecommendation[]>(endpoint);
  } catch (error) {
    console.warn("Recommendations not available:", error);
    return [];
  }
}

// Get similar items (item-based recommendations)
export async function getSimilarItems(
  itemId: string,
  n: number = 10,
  categories?: string[]
): Promise<GorseRecommendation[]> {
  let endpoint = `/api/item/${encodeURIComponent(itemId)}/neighbors?n=${n}`;
  if (categories && categories.length > 0) {
    endpoint += `&category=${encodeURIComponent(categories.join(","))}`;
  }
  try {
    return await gorseRequest<GorseRecommendation[]>(endpoint);
  } catch (error) {
    // Item-to-item recommendation might not be enabled
    // Fall back to empty array
    console.warn("Similar items not available:", error);
    return [];
  }
}

// Get popular items
export async function getPopularItems(
  n: number = 10,
  categories?: string[]
): Promise<GorseRecommendation[]> {
  let endpoint = `/api/popular?n=${n}`;
  if (categories && categories.length > 0) {
    endpoint += `&category=${encodeURIComponent(categories.join(","))}`;
  }
  try {
    return await gorseRequest<GorseRecommendation[]>(endpoint);
  } catch (error) {
    // Popular endpoint might not be available on some Gorse configurations
    // Fall back to empty array
    console.warn("Popular items not available:", error);
    return [];
  }
}

// Get latest items
export async function getLatestItems(
  n: number = 10,
  categories?: string[]
): Promise<GorseRecommendation[]> {
  let endpoint = `/api/latest?n=${n}`;
  if (categories && categories.length > 0) {
    endpoint += `&category=${encodeURIComponent(categories.join(","))}`;
  }
  try {
    return await gorseRequest<GorseRecommendation[]>(endpoint);
  } catch (error) {
    console.warn("Latest items not available:", error);
    return [];
  }
}

// Health check
export async function checkHealth(): Promise<boolean> {
  try {
    await gorseRequest("/api/health/live");
    return true;
  } catch {
    return false;
  }
}

// Get item count
export async function getItemCount(): Promise<number> {
  try {
    // Get items endpoint returns array, we'll use the measurement endpoint
    const stats = await gorseRequest<{ NumItems?: number }>("/api/dashboard/stats");
    return stats.NumItems || 0;
  } catch {
    // If dashboard endpoint not available, return 0
    return 0;
  }
}
