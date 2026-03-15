// Custom error for 401 Unauthorized responses
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

// Fetch wrapper that throws UnauthorizedError on 401 responses
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    throw new UnauthorizedError()
  }

  return response
}
