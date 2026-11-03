"use client";

import { useQuery } from "@tanstack/react-query";
import { apiList } from "./client";

/** One class recording on YouTube (unlisted), already cut down by the server to what this person may see. */
export interface RecordingRecord {
  RecordingID: string;
  YouTubeId: string;
  Title: string;
  Level: string;
  Subject: string;
  SubjectCode: string;
  /** Set when the subject has several components, for example "Pure Mathematics 1" under 9709. */
  Component?: string;
  ChapterNo: number;
  ChapterName: string;
  Date: string;
  Batch: string;
  DurationMin: number;
  Hidden?: boolean;
}

export function useRecordings() {
  return useQuery({ queryKey: ["recordings"] as const, queryFn: async () => await apiList<RecordingRecord>("/api/recordings", "recordings") });
}
