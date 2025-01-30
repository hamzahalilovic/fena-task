export interface Job {
  id: string;
  totalEmails: number;
  processedEmails: number;
  status: "pending" | "in-progress" | "completed";
}
