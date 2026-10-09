/** The agent's diagram is slow, not the infrastructure: it is told to simplify rather than retry the same thing. */
export class McpDiagramCheckTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The diagram checker took more than ${String(timeoutMs)} ms on one diagram`);
    this.name = new.target.name;
  }
}
