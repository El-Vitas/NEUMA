/** Says nothing about the diagram: the agent is asked to resend it shortly. */
export class McpDiagramCheckerBusyError extends Error {
  constructor(waitingMax: number) {
    super(`The diagram checker already has ${String(waitingMax)} diagrams waiting`);
    this.name = new.target.name;
  }
}
