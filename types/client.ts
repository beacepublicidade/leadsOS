export interface Client {
  id:               string;
  name:             string;
  niche:            string;
  whatsapp_number:  string;
  created_at:       string;
}

export type CreateClientInput = Omit<Client, "id" | "created_at">;
