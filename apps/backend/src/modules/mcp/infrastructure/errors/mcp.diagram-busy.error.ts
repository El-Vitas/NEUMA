/**
 * El revisor de diagramas ya tiene la fila llena. No dice nada del diagrama:
 * se le pide al agente que lo vuelva a mandar en un momento.
 */
export class McpDiagramCheckerBusyError extends Error {
  constructor(waitingMax: number) {
    super(`The diagram checker already has ${String(waitingMax)} diagrams waiting`);
    this.name = new.target.name;
  }
}
