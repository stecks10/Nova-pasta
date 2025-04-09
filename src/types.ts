export type OutputFormat = "csv" | "html" | "markdown" | "all";

export interface JobListing {
  Fonte: string;
  Título: string;
  Empresa: string;
  Local: string;
  Link: string;
  Data: string;
  CargoAlvo: string;
  DataPublicacao?: Date;
}

export interface SearchResult {
  success: boolean;
  source: string;
  jobs: JobListing[];
  error?: string;
}

export interface UserConfig {
  habilidades: string[];
  cargosDesejados: string[];
  localizacoes: string[];
  experiencia: string;
  candidaturasAutomaticas: boolean;
  buscaDiaria: boolean;
  diasRecentes: number;
  formatoSaida: OutputFormat;
}

export interface UserProfile {
  nome: string;
  email: string;
  telefone: string;
  linkedin: string;
  github: string;
  experiencia: string;
}
