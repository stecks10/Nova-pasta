import { USER_AGENTS } from "../config";
import { JobListing } from "../types";
import { format, subDays, isAfter, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

// Função auxiliar para obter um user agent aleatório
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Função para atrasar a execução - evita bloqueios por muitas requisições
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Verifica se a vaga é do Brasil
export function isJobInBrazil(location: string | undefined): boolean {
  if (!location) return false;

  const brPatterns = [
    /brasil/i,
    /brazil/i,
    /são paulo/i,
    /sao paulo/i,
    /rio de janeiro/i,
    /belo horizonte/i,
    /brasília/i,
    /brasilia/i,
    /curitiba/i,
    /salvador/i,
    /porto alegre/i,
    /recife/i,
    /sp/i,
    /rj/i,
    /mg/i,
    /pr/i,
    /ba/i,
    /rs/i,
    /pe/i,
  ];

  return brPatterns.some((pattern) => pattern.test(location));
}

// Verifica se a vaga é remota
export function isRemoteJob(location: string): boolean {
  if (!location) return false;

  const remotePatterns = [
    /remot[eo]/i,
    /home\s*office/i,
    /trabalho\s*remoto/i,
    /trabalho\s*à\s*distância/i,
    /trabalho\s*a\s*distância/i,
    /anywhere/i,
    /qualquer\s*lugar/i,
    /híbrido/i,
    /hibrido/i,
  ];

  return remotePatterns.some((pattern) => pattern.test(location));
}

// Verifica se a vaga foi publicada nos últimos X dias
export function isRecentJob(job: JobListing, daysLimit: number): boolean {
  try {
    // Se já temos a data de publicação como objeto Date
    if (
      job.DataPublicacao instanceof Date &&
      !isNaN(job.DataPublicacao.getTime())
    ) {
      return isAfter(job.DataPublicacao, subDays(new Date(), daysLimit));
    }

    // Se temos a data apenas como string, tentamos converter
    const dateStr = job.Data;
    if (!dateStr) return true; // Se não há data, assume como recente

    // Formatos específicos do Brasil para datas em texto
    if (
      dateStr.toLowerCase().includes("hoje") ||
      dateStr.toLowerCase().includes("today")
    ) {
      return true;
    }

    if (
      dateStr.toLowerCase().includes("ontem") ||
      dateStr.toLowerCase().includes("yesterday")
    ) {
      return daysLimit >= 1;
    }

    // Tentamos diversos formatos de data
    let jobDate: Date | null = null;

    // Formato DD/MM/YYYY
    try {
      const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
      if (!isNaN(parsedDate.getTime())) {
        jobDate = parsedDate;
      }
    } catch (e) {
      /* continua para o próximo formato */
    }

    // Formato YYYY-MM-DD
    if (!jobDate) {
      try {
        const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
        if (!isNaN(parsedDate.getTime())) {
          jobDate = parsedDate;
        }
      } catch (e) {
        /* continua para o próximo formato */
      }
    }

    // Se conseguiu converter a data, verifica se é recente
    if (jobDate && !isNaN(jobDate.getTime())) {
      return isAfter(jobDate, subDays(new Date(), daysLimit));
    }

    // Formato em texto (ex: "há 3 dias")
    if (dateStr.includes("há") || dateStr.includes("ha")) {
      const match =
        dateStr.match(/há\s+(\d+)\s+(dia|dias)/i) ||
        dateStr.match(/ha\s+(\d+)\s+(dia|dias)/i);

      if (match && match[1]) {
        const postedDaysAgo = parseInt(match[1], 10);
        return postedDaysAgo <= daysLimit;
      }
    }

    // Sem informação suficiente, retorna true para não filtrar
    return true;
  } catch (error) {
    console.error(`Erro ao processar data da vaga: ${error}`);
    return true; // Em caso de erro, incluir a vaga (melhor ter mais que menos)
  }
}

// Obter a data atual formatada
export function getCurrentDate(): string {
  return format(new Date(), "dd/MM/yyyy", { locale: ptBR });
}

// Função para remover duplicatas de vagas baseado no link
export function removeDuplicateJobs(jobs: JobListing[]): JobListing[] {
  return [...new Map(jobs.map((job) => [job.Link || "", job])).values()];
}

// Formatar texto para CSV (escapar aspas duplas)
export function formatCSVText(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/"/g, '""');
}
