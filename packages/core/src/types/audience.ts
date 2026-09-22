/**
 * A configured audience persona used by the Audience Perspective Simulation.
 * These are *simulated* perspectives, not survey results — the `description`
 * is what the agent uses to condition its interpretation.
 */
export interface AudienceSegment {
  id: string;
  key: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface AudiencePerspectiveResult {
  id: string;
  analysisRunId: string;
  audienceSegmentId: string;
  audienceSegmentKey: string;
  possibleInterpretation: string;
  positiveSignals: string[];
  concernSignals: string[];
  ambiguity?: string;
  potentialSensitivity?: string;
  confidence: number;
  createdAt: string;
}
