export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "inprogress" | "review" | "done";

export interface Task {
  id: string; title: string; priority: Priority;
  status: TaskStatus; due: string; matter: string; assignedTo?: string;
}
export interface Matter {
  id: string; client: string; title: string;
  type: "Civil Litigation"|"Commercial"|"Family Law"|"Criminal"|"Conveyancing"|"Intellectual Property"|"Probate & Administration";
  status: "active"|"closed"|"pending";
  caseStatus?: "pending" | "hearing-scheduled" | "completed";
  nextHearingDate?: string;
  result?: "won" | "lost" | "settled" | "withdrawn" | "dismissed";
  resultNote?: string;
  resultDate?: string; court?: string; fileNo?: string; openedDate?: string; notes?: string; folders?: string[]; partyA?: string; partyB?: string; assignedTo?: string;
}
export interface Deadline {
  id: string; title: string; matter: string; court: string; date: string;
  time?: string;
  mode?: "online" | "physical";
  meetingLink?: string;
  judge?: string;
  summary?: string;
  type: "hearing"|"filing"|"mention"|"ruling"|"deadline"|"lsk";
}
export type DeadlineType = Deadline["type"];
export interface LedgerEntry {
  id: string; date: string; description: string; matter: string;
  debit: number; credit: number; type: "billable"|"disbursement"|"payment"|"trust";
}
export interface StaffMember {
  id: string; name: string; role: Role; email: string; phone: string; practice: string; initials: string;
}
export interface VaultDocument {
  id: string; name: string; matter: string;
  fileType?: string; date?: string; uploadedBy?: string;
  uploadedAt?: string; size?: number; mime?: string; data?: string;
  matterId?: string; folder?: string; sizeKb?: number;
  storagePath?: string; url?: string; file?: File;
}
export interface Message {
  id: string; from: string; content: string; timestamp: string; direction: "sent"|"received"; matter?: string;
}
export interface Witness {
  id: string; name: string; type: "witness"|"expert"; matter: string;
  contact: string; status: "confirmed"|"pending"|"contacted"; expertise?: string;
}
export interface AuditLog {
  id: string; action: string; user: string; timestamp: string; module: string;
}
export type ViewKey = "dashboard"|"matters"|"calendar"|"vault"|"directory"|"invoices"|"admin"|"finance"|"clientportal"|"drafting"|"witness" | "users";
export type Role = "partner"|"associate"|"paralegal"|"client";

export interface InvoiceItem {
  id: string; description: string; quantity: number; rate: number; amount: number;
}
export interface Invoice {
  id: string; invoiceNo: string; matter: string; client: string;
  date: string; dueDate: string; items: InvoiceItem[];
  status: "draft"|"sent"|"paid"|"overdue"; notes?: string; partyA?: string; partyB?: string; assignedTo?: string; totalAmount: number;
}
