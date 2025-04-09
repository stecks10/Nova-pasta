export interface UserConfig {
  habilidades: string[];
  cargosDesejados: string[];
  localizacoes: string[];
  experiencia: "Júnior" | "Pleno";
  candidaturasAutomaticas: boolean;
  buscaDiaria: boolean;
  diasRecentes: number;
  formatoSaida: "csv" | "html" | "ambos" | "markdown";
}

export interface UserProfile {
  nome: string;
  email: string;
  telefone: string;
  linkedin: string;
  github: string;
  experiencia: string;
  curriculo?: string;
}

export interface JobListing {
  Fonte: string;
  Título: string;
  Empresa: string;
  Local: string;
  Link: string;
  Data: string;
  DataPublicacao?: Date;
  CargoAlvo: string;
  Descricao?: string;
}

export interface SearchResult {
  success: boolean;
  source: string;
  jobs: JobListing[];
  error?: string;
}
