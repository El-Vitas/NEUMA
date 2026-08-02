export interface EnvelopeBody {
  code: string;
  details?: unknown;
  message: string;
}
export interface Envelope {
  body: EnvelopeBody;
  status: number;
}
