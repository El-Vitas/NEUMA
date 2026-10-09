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

export interface PageUsageReport {
  readonly settings: PageUsageSettings;
  readonly summary: PageUsageSummary;
}
