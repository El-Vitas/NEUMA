/** Two concurrent retries with the same token and request id: the second writes nothing. */
export class McpRequestTakenError extends Error {
  constructor(readonly requestId: string) {
    super(`Another call with request id ${requestId} is already under way`);
    this.name = new.target.name;
  }
}
