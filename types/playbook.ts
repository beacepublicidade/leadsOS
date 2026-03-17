import type { TemplateType } from "@/types/template";

export interface PlaybookTemplate {
  type:    TemplateType;
  trigger: string;
  message: string;
}

export interface Playbook {
  id:        string;
  niche:     string;
  templates: PlaybookTemplate[];
}

export type CreatePlaybookInput = Omit<Playbook, "id">;
