// ============================================================
// ADAPTER: GitHub — API Client
// ============================================================
// Thin fetch-based client. Accepts an optional fetchFn so tests
// can mock responses without network calls.
// ============================================================

export type GitHubFetchFn = (url: string, init: RequestInit) => Promise<Response>

export class GitHubClient {
  private baseUrl: string
  private token: string
  private fetchFn: GitHubFetchFn

  constructor(config: { baseUrl?: string; token: string }, fetchFn?: GitHubFetchFn) {
    this.baseUrl = config.baseUrl || "https://api.github.com"
    this.token = config.token
    this.fetchFn = fetchFn || ((url, init) => fetch(url, init))
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    }
  }

  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`
    const init: RequestInit = {
      method,
      headers: this.headers(),
    }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }

    const response = await this.fetchFn(url, init)
    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    if (!response.ok) {
      throw new Error(`GITHUB_API_ERROR: ${response.status} ${response.statusText} - ${data?.message || ""}`)
    }

    return data
  }

  get(path: string): Promise<unknown> {
    return this.request("GET", path)
  }

  post(path: string, body: unknown): Promise<unknown> {
    return this.request("POST", path, body)
  }

  patch(path: string, body: unknown): Promise<unknown> {
    return this.request("PATCH", path, body)
  }

  put(path: string, body?: unknown): Promise<unknown> {
    return this.request("PUT", path, body)
  }
}

export function createGitHubClient(config: { baseUrl?: string; token: string }, fetchFn?: GitHubFetchFn): GitHubClient {
  return new GitHubClient(config, fetchFn)
}
