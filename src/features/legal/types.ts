export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "inprogress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
  matter: string;
}

export interface Matter {
  id: string;
  client: string;
  title: string;
  type: "Civil Litigation" | "Commercial" | "Family Law" | "Criminal" | "Conveyancing";
  status: "active" | "closed" | "pending";
}

export type ViewKey =
  | "dashboard" | "matters" | "calendar" | "clientportal"
  | "vault" | "drafting" | "witness" | "directory" | "finance" | "admin";

export type Role = "partner" | "associate" | "paralegal" | "client";
