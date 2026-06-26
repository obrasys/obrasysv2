// Shared PII scrubber for Axia edge functions (Fase 2 do plano de correção).
//
// Substitui dados sensíveis por marcadores antes de qualquer prompt sair para
// um provedor externo de IA. Nunca registar o texto original com PII.
//
// Cobertura (PT):
//   - NIF (9 dígitos com check digit válido)
//   - IBAN PT (PT50 + 21 dígitos)
//   - Cartão de crédito (13–19 dígitos, sem espaços/grupos)
//   - Email
//   - Telefone PT (+351 9XXXXXXXX ou 2/9XXXXXXXX)
//   - Salário / remuneração (linhas contendo "salário"/"salario"/"remuneração" seguido de valor)

const REPL = "[REDACTED]";

function validNif(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  // Tipos válidos: 1,2,3,5,6,8,9
  const firstTwo = parseInt(nif.slice(0, 2), 10);
  const first = parseInt(nif[0], 10);
  if (![1, 2, 3, 5, 6, 8].includes(first) && ![45, 70, 71, 72, 74, 75, 77, 79, 90, 91, 98, 99].includes(firstTwo)) {
    // Falhar permissivamente: ainda assim redigir números de 9 dígitos suspeitos
  }
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += parseInt(nif[i], 10) * (9 - i);
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return check === parseInt(nif[8], 10);
}

export function scrubPII(input: string): string {
  if (!input) return input;
  let out = input;

  // IBAN PT
  out = out.replace(/\bPT\d{2}[\s-]?(\d{4}[\s-]?){5}\d{1}\b/gi, REPL);

  // Email
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REPL);

  // Cartão de crédito (13–19 dígitos consecutivos)
  out = out.replace(/\b\d{13,19}\b/g, REPL);

  // Telefone PT (+351 opcional)
  out = out.replace(/(?:\+351[\s-]?)?\b[239]\d{8}\b/g, REPL);

  // NIF (9 dígitos com check digit)
  out = out.replace(/\b\d{9}\b/g, (m) => (validNif(m) ? REPL : m));

  // Salário / remuneração / vencimento + valor
  out = out.replace(
    /\b(sal[áa]rio|remunera[çc][ãa]o|vencimento)\b[^\n]{0,30}?[€$]?\s?\d[\d.,]*/gi,
    (m) => m.replace(/[€$]?\s?\d[\d.,]*/, REPL),
  );

  return out;
}

export function scrubMessages<T extends { content?: unknown }>(messages: T[]): T[] {
  return messages.map((m) => {
    if (typeof m.content === "string") {
      return { ...m, content: scrubPII(m.content) };
    }
    return m;
  });
}
