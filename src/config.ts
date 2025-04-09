import { UserConfig, UserProfile } from "./types";
import dotenv from "dotenv";

dotenv.config();

// Lista de user agents para rotacionar
export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
];

// Configurações do usuário
export const USER_CONFIG: UserConfig = {
  habilidades: ["JavaScript", "Node.js", "React", "Angular", "React Native"],
  cargosDesejados: [
    "Desenvolvedor Web",
    "Desenvolvedor React",
    "Desenvolvedor Angular",
    "Desenvolvedor Node.js",
    "Desenvolvedor React Native",
    "Analista de Sistemas",
  ],
  localizacoes: [
    "Brasil",
    "São Paulo",
    "Rio de Janeiro",
    "Remoto Brasil",
    "Trabalho Remoto Brasil",
  ],
  experiencia: "Pleno", // Júnior, Pleno, Sênior
  candidaturasAutomaticas: true,
  buscaDiaria: true,
  diasRecentes: 7, // De .env ou padrão 7
  formatoSaida: "csv", // Atualize para 'csv', 'html' ou 'ambos'
};

// Dados para autopreenchimento
export const MEU_PERFIL: UserProfile = {
  nome: process.env.NOME || "Vitor nunes",
  email: process.env.EMAIL || "vnn2006@gmail.com",
  telefone: process.env.TELEFONE || "(22) 99929-3439",
  linkedin:
    process.env.LINKEDIN ||
    "https://www.linkedin.com/in/vitor-nunes-do-nascimento-466004197/",
  github: process.env.GITHUB || "https://github.com/stecks10",
  experiencia:
    process.env.EXPERIENCIA || "5 anos como Desenvolvedor Full Stack",
};
