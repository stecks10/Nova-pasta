import puppeteer, { Page } from "puppeteer";
import { SearchResult, JobListing } from "../types";
import {
  getRandomUserAgent,
  isJobInBrazil,
  isRemoteJob,
} from "../utils/helpers";
import { subDays } from "date-fns";
import { waitFor, autoScroll } from "../utils/puppeteerUtils";

interface IndeedJob {
  titulo: string;
  empresa: string;
  local: string;
  link: string;
  dataPublicacaoTexto: string;
}

export async function searchIndeedJobs(
  cargo: string,
  local: string,
  diasRecentes: number
): Promise<SearchResult> {
  console.log(
    `\n🔍 Buscando vagas remotas no Indeed para: ${cargo} - ${local}`
  );

  const browser = await puppeteer.launch({
    headless: true, // Corrigido de "new" para true
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1366, height: 768 });

  const result: SearchResult = {
    success: false,
    source: "Indeed",
    jobs: [],
  };

  try {
    // Adicionar filtro de data e remoto à URL
    const indeedURL = `https://br.indeed.com/jobs?q=${encodeURIComponent(
      cargo
    )}+remoto&l=${encodeURIComponent(
      local
    )}&sc=0kf%3Ajt%28remote%29%3B&fromage=${diasRecentes}`;

    await page.goto(indeedURL, { waitUntil: "networkidle2", timeout: 30000 });
    await waitFor(page, 2000);

    // Opcionalmente adicionar scroll para carregar mais resultados
    await autoScroll(page);

    // Extrair as vagas
    const indeedVagas = await page.evaluate(() => {
      const vagas: Array<{
        titulo: string;
        empresa: string;
        local: string;
        link: string;
        dataPublicacaoTexto: string;
      }> = [];

      const elementos =
        document.querySelectorAll<HTMLElement>(".job_seen_beacon");

      elementos.forEach((element) => {
        const tituloElement = element.querySelector<HTMLElement>(".jobTitle");
        const empresaElement =
          element.querySelector<HTMLElement>(".companyName");
        const localElement =
          element.querySelector<HTMLElement>(".companyLocation");
        const linkElement =
          element.querySelector<HTMLAnchorElement>("a.jcs-JobTitle");
        const dataElement = element.querySelector<HTMLElement>(
          '[data-testid="job-age"]'
        );

        const titulo = tituloElement?.textContent?.trim() || "";
        const empresa = empresaElement?.textContent?.trim() || "";
        const local = localElement?.textContent?.trim() || "";
        const link = linkElement?.href || "";
        const dataPublicacaoTexto = dataElement?.textContent?.trim() || "";

        if (titulo && empresa) {
          vagas.push({
            titulo,
            empresa,
            local,
            link: link.startsWith("/") ? `https://br.indeed.com${link}` : link,
            dataPublicacaoTexto,
          });
        }
      });

      return vagas;
    });

    const currentDate = new Date().toLocaleDateString();

    // Filtrar apenas vagas brasileiras e remotas
    indeedVagas.forEach((vaga: IndeedJob) => {
      if (
        vaga.local &&
        (isJobInBrazil(vaga.local) || isRemoteJob(vaga.local))
      ) {
        const jobListing: JobListing = {
          Fonte: "Indeed",
          Título: vaga.titulo,
          Empresa: vaga.empresa,
          Local: vaga.local,
          Link: vaga.link,
          Data: currentDate,
          CargoAlvo: cargo,
        };

        // Processar data de publicação se disponível
        if (vaga.dataPublicacaoTexto) {
          try {
            if (
              vaga.dataPublicacaoTexto.includes("há") ||
              vaga.dataPublicacaoTexto.includes("ha")
            ) {
              const match =
                vaga.dataPublicacaoTexto.match(/há\s+(\d+)\s+(dia|dias)/i) ||
                vaga.dataPublicacaoTexto.match(/ha\s+(\d+)\s+(dia|dias)/i);

              if (match && match[1]) {
                const daysAgo = parseInt(match[1], 10);
                jobListing.DataPublicacao = subDays(new Date(), daysAgo);
              }
            } else if (vaga.dataPublicacaoTexto.toLowerCase() === "hoje") {
              jobListing.DataPublicacao = new Date();
            }
          } catch (error) {
            console.log(`⚠️ Erro ao processar data Indeed: ${error}`);
          }
        }

        result.jobs.push(jobListing);
      }
    });

    result.success = true;
    console.log(`✅ Encontradas ${result.jobs.length} vagas no Indeed`);
  } catch (error) {
    console.log(
      `⚠️ Erro no Indeed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  return result;
}
