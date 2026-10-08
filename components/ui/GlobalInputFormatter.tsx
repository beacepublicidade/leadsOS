"use client";

import { useEffect } from "react";

// Palavras/padrões que indicam que o campo NÃO deve receber title case
const SKIP_PLACEHOLDERS = [
  "email", "url", "site", "www", "http", "cnpj", "cpf", "pix",
  "cep", "chave", "@", "senha", "password", "hex", "#",
  "apenas números", "número", "token", "api", "id",
];
const SKIP_TYPES = ["email", "url", "number", "password", "color", "tel", "search"];

function shouldSkip(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el instanceof HTMLInputElement && SKIP_TYPES.includes(el.type)) return true;
  const ph = (el.placeholder ?? "").toLowerCase();
  if (SKIP_PLACEHOLDERS.some(s => ph.includes(s))) return true;
  // Campos de mensagem/chat/descrição longa: textarea com mais de 100 caracteres não formata
  if (el.tagName === "TEXTAREA" && el.value.length > 120) return true;
  return false;
}

function toTitleCase(str: string): string {
  // Se tiver alguma letra minúscula, já está num padrão misto — respeita
  // Se for tudo maiúsculo ou tudo minúsculo, aplica title case
  const hasLower = /[a-záéíóúãõâêîôûàèìòùç]/.test(str);
  const hasUpper = /[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ]/.test(str);
  if (hasLower && hasUpper) return str; // já misto — não mexe
  return str.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function GlobalInputFormatter() {
  useEffect(() => {
    function handleBlur(e: FocusEvent) {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!el || !el.classList?.contains("input")) return;
      if (shouldSkip(el)) return;
      if (!el.value.trim()) return;

      const newVal = toTitleCase(el.value);
      if (newVal === el.value) return;

      // Atualiza o valor usando o setter nativo para que o React detecte a mudança
      const proto = el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) {
        setter.call(el, newVal);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    document.addEventListener("blur", handleBlur, true);
    return () => document.removeEventListener("blur", handleBlur, true);
  }, []);

  return null;
}
