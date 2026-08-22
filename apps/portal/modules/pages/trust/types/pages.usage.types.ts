export interface PageUsageViewer {
  readonly id: string;
  readonly name: string;
  readonly viewedAt: Date;
}

export interface PageUsageSummary {
  readonly viewCount: number;
  readonly viewers: readonly PageUsageViewer[];
}

export interface PageUsageSettings {
  readonly enabled: boolean;
}

/** Everything the usage panel needs, asked for in one go when it opens. */
export interface PageUsageReport {
  readonly settings: PageUsageSettings;
  readonly summary: PageUsageSummary;
}
