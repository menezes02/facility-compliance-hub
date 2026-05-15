export type VerticalKey = "fire" | "parking" | "pool";

export type UserRole = "admin" | "manager" | "worker" | "viewer";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export type ChecklistItemType =
  | "checkbox"
  | "number"
  | "text"
  | "photo"
  | "choice";

export interface ChecklistItemDefinition {
  key: string;
  label: string;
  type: ChecklistItemType;
  required?: boolean;
  options?: string[];
}

export interface ChecklistTemplateDefinition {
  name: string;
  description: string;
  category: string;
  vertical: VerticalKey;
  recurrence: string;
  items: ChecklistItemDefinition[];
}

export interface AuthPayload {
  token: string;
  user: {
    id: string;
    orgId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

