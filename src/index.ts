import cron from "node-cron";
import { MEU_PERFIL, USER_CONFIG } from "./config";
import { applyToJobs } from "./services/applicationService";
import { searchIndeedJobs } from "./services/indeedService";
import { searchLinkedInJobs } from "./services/linkedinService";
import { saveResults } from "./services/output";
import { JobListing } from "./types";
import { delay, isRecentJob, removeDuplicateJobs } from "./utils/helpers";

// Função para verificar se a vaga tem candidatura simplificada
function hasCandidaturaSimplificada(job: JobListing): boolean {
  // Verifica se o link da vaga contém indicadores de candidatura simplificada
  const linkIndicators = [
    "easy-apply",
    "candidatar",
    "aplicar-agora",
    "apply-now",
    "1-click-apply",
  ];

  if (job.Link) {
    if (
      linkIndicators.some((indicator) =>
        job.Link.toLowerCase().includes(indicator)
      )
    ) {
      return true;
    }
  }

  // LinkedIn geralmente tem candidatura simplificada
  if (job.Fonte === "LinkedIn" && job.Link.includes("jobs/view")) {
    return true;
  }

  // Indeed tem candidaturas simplificadas via "Apply Now"
  if (job.Fonte === "Indeed" && job.Link.includes("from=serp")) {
    return true;
  }

  return false;
}

async function buscarVagas(): Promise<void> {
  console.log("🔍 Iniciando busca de vagas remotas no Brasil...");
  const resultados: JobListing[] = [];

  // Limitar o número de requisições simultâneas
  const maxRequestsAtOnce = 2;
  const buscas = [];

  // Preparar todas as buscas
  for (const cargo of USER_CONFIG.cargosDesejados) {
    for (const local of USER_CONFIG.localizacoes) {
      buscas.push({ cargo, local });
    }
  }

  // Executar em lotes para evitar bloqueios
  for (let i = 0; i < buscas.length; i += maxRequestsAtOnce) {
    const lote = buscas.slice(i, i + maxRequestsAtOnce);

    // Executa cada lote em paralelo
    const resultadosLote = await Promise.all(
      lote.map(async ({ cargo, local }) => {
        console.log(`\n🔍 Buscando vagas remotas para: ${cargo} - ${local}`);

        const loteResultados: JobListing[] = [];

        // Busca no LinkedIn
        try {
          const linkedinResults = await searchLinkedInJobs(
            cargo,
            local,
            USER_CONFIG.experiencia,
            USER_CONFIG.diasRecentes
          );

          if (linkedinResults.success && linkedinResults.jobs.length > 0) {
            loteResultados.push(...linkedinResults.jobs);
          }
        } catch (error) {
          console.error("Erro ao buscar no LinkedIn:", error);
        }

        // Adiciona um intervalo antes de consultar o próximo site
        await delay(3000);

        // Busca no Indeed Brasil
        try {
          const indeedResults = await searchIndeedJobs(
            cargo,
            local,
            USER_CONFIG.diasRecentes
          );

          if (indeedResults.success && indeedResults.jobs.length > 0) {
            loteResultados.push(...indeedResults.jobs);
          }
        } catch (error) {
          console.error("Erro ao buscar no Indeed:", error);
        }

        return loteResultados;
      })
    );

    // Adiciona todos os resultados do lote ao array principal
    resultadosLote.forEach((loteItems) => {
      resultados.push(...loteItems);
    });

    // Adiciona um intervalo entre os lotes
    await delay(5000);
  }

  // Remover duplicatas e aplicar filtros:
  // 1. Filtrar apenas vagas recentes
  // 2. Mostrar apenas vagas com candidatura simplificada
  const vagasUnicas = removeDuplicateJobs(resultados);
  const vagasRecentes = vagasUnicas.filter((vaga) =>
    isRecentJob(vaga, USER_CONFIG.diasRecentes)
  );
  const vagasSimplificadas = vagasRecentes.filter(hasCandidaturaSimplificada);

  console.log(`Total de vagas encontradas: ${resultados.length}`);
  console.log(`Vagas únicas: ${vagasUnicas.length}`);
  console.log(
    `Vagas recentes (últimos ${USER_CONFIG.diasRecentes} dias): ${vagasRecentes.length}`
  );
  console.log(
    `Vagas com candidaturas simplificadas: ${vagasSimplificadas.length}`
  );

  // Salvar resultados - USANDO APENAS VAGAS SIMPLIFICADAS
  if (vagasSimplificadas.length > 0) {
    console.log(
      `\n🎉 Encontramos ${vagasSimplificadas.length} vagas com candidatura simplificada nos últimos ${USER_CONFIG.diasRecentes} dias!`
    );

    // Salvar no formato desejado (CSV, HTML ou ambos)
    const outputFormat =
      (USER_CONFIG.formatoSaida as string) === "csv"
        ? "all"
        : USER_CONFIG.formatoSaida;
    saveResults(vagasSimplificadas, { format: outputFormat });

    // Candidatura automática (simplificada)
    if (USER_CONFIG.candidaturasAutomaticas) {
      await applyToJobs(vagasSimplificadas.slice(0, 5), MEU_PERFIL); // Aplica nas 5 primeiras
    }
  } else {
    console.log(
      `\n😢 Nenhuma vaga com candidatura simplificada encontrada nos últimos ${USER_CONFIG.diasRecentes} dias`
    );
  }
}

// Função principal para iniciar o processo
async function main(): Promise<void> {
  console.log("🤖 Bot de Busca de Vagas - Iniciando...");

  // Configurar agendamento diário se habilitado
  if (USER_CONFIG.buscaDiaria) {
    console.log("\n⏰ Agendando busca diária às 9h...");
    cron.schedule("0 9 * * *", () => {
      console.log("\n🔄 Executando busca diária agendada...");
      buscarVagas().catch((error) => {
        console.error("❌ Erro na execução agendada:", error);
      });
    });
  }

  // Executa imediatamente na primeira vez
  await buscarVagas();
}

// Inicia o programa
main().catch((error) => {
  console.error("❌ Erro crítico na execução do programa:", error);
  process.exit(1);
});
