import cron from "node-cron";
import { USER_CONFIG, MEU_PERFIL } from "./config";
import { searchLinkedInJobs } from "./services/linkedinService";
import { searchIndeedJobs } from "./services/indeedService";
import { applyToJobs } from "./services/applicationService";
import { saveResults } from "./services/output";
import { delay, removeDuplicateJobs, isRecentJob } from "./utils/helpers";
import { JobListing } from "./types";

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

  // Remover duplicatas e filtrar apenas vagas recentes
  const vagasUnicas = removeDuplicateJobs(resultados);
  const vagasRecentes = vagasUnicas.filter((vaga) =>
    isRecentJob(vaga, USER_CONFIG.diasRecentes)
  );

  // Salvar resultados
  if (vagasRecentes.length > 0) {
    console.log(
      `\n🎉 Encontramos ${vagasRecentes.length} vagas remotas únicas recentes no Brasil!`
    );

    // Salvar no formato desejado (CSV, HTML ou ambos)
    saveResults(vagasRecentes, { format: USER_CONFIG.formatoSaida });

    // Candidatura automática (simplificada)
    if (USER_CONFIG.candidaturasAutomaticas) {
      await applyToJobs(vagasRecentes.slice(0, 5), MEU_PERFIL); // Aplica nas 5 primeiras
    }
  } else {
    console.log("\n😢 Nenhuma vaga remota recente encontrada");
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
