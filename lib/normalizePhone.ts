/**
 * Normaliza número de telefone para o formato E.164 brasileiro: 55XXXXXXXXXXX
 * Remove tudo que não é dígito e garante o prefixo 55.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Retorna o número sem o prefixo 55 — útil para comparar com
 * leads que foram salvos sem o código do país.
 */
export function stripCountryCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits.slice(2) : digits;
}
