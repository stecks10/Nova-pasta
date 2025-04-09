import puppeteer, { Page } from "puppeteer";
import { SearchResult, JobListing } from "../types";
import {
  getRandomUserAgent,
  delay,
  isJobInBrazil,
  isRemoteJob,
} from "../utils/helpers";
import { subDays, format } from "date-fns";
import { waitFor, autoScroll } from "../utils/puppeteerUtils";

interface LinkedInJob {
  title: string;
  company: string;
  location: string;
  link: string;
  postedDate: string;
}

export async function searchLinkedInJobs(
  cargo: string,
  local: string,
  experiencia: string,
  diasRecentes: number
): Promise<SearchResult> {
  console.log(
    `\n🔍 Buscando vagas remotas no LinkedIn para: ${cargo} - ${local}`
  );

  // Cálculo da data limite para filtrar vagas
  const limitDate = subDays(new Date(), diasRecentes);
  const formattedLimitDate = format(limitDate, "yyyy-MM-dd");

  const browser = await puppeteer.launch({
    headless: true, // Corrigido de "new" para true
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1366, height: 768 });

  const result: SearchResult = {
    success: false,
    source: "LinkedIn",
    jobs: [],
  };

  try {
    // Constrói a URL com filtro de experiência e data de postagem
    const expCode =
      experiencia === "Júnior" ? "1" : experiencia === "Pleno" ? "2" : "3";

    // Modificar a URL para incluir filtro de trabalho remoto
    const linkedinURL = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
      cargo
    )}&location=${encodeURIComponent(local)}&f_WT=2`; // f_WT=2 é o filtro para trabalho remoto no LinkedIn

    // Adiciona filtro de trabalho remoto (f_WT=2)
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
      cargo
    )}&location=${encodeURIComponent(
      local
    )}&f_E=${expCode}&geoId=106057199&f_WT=2&f_TPR=r${diasRecentes}d`;

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    try {
      await page.waitForSelector(".jobs-search__results-list", {
        timeout: 10000,
      });
    } catch (timeoutError) {
      console.log("⚠️ Tempo limite excedido ao buscar resultados no LinkedIn");
    }

    // Scroll para carregar mais vagas (usando a função do utilities)
    await autoScroll(page);

    const vagas = await page.evaluate(() => {
      const elementos = document.querySelectorAll<HTMLElement>(
        ".jobs-search__results-list li"
      );
      if (!elementos || elementos.length === 0) return [];

      return Array.from(elementos).map((vaga) => {
        // Tenta obter data de publicação
        let postedDate = "";
        const timeElement = vaga.querySelector("time");
        if (timeElement) {
          postedDate =
            timeElement.getAttribute("datetime") ||
            timeElement.textContent?.trim() ||
            "";
        }

        const titleElement = vaga.querySelector<HTMLElement>(
          ".base-search-card__title"
        );
        const companyElement = vaga.querySelector<HTMLElement>(
          ".base-search-card__subtitle"
        );
        const locationElement = vaga.querySelector<HTMLElement>(
          ".job-search-card__location"
        );
        const linkElement = vaga.querySelector<HTMLAnchorElement>(
          "a.base-card__full-link"
        );

        return {
          title: titleElement?.textContent?.trim() || "",
          company: companyElement?.textContent?.trim() || "",
          location: locationElement?.textContent?.trim() || "",
          link: linkElement?.href || "",
          postedDate: postedDate,
        };
      });
    });

    const currentDate = new Date().toLocaleDateString();

    vagas.forEach((vaga: LinkedInJob) => {
      if (vaga.title && vaga.company && vaga.link) {
        if (isJobInBrazil(vaga.location) || isRemoteJob(vaga.location)) {
          const jobListing: JobListing = {
            Fonte: "LinkedIn",
            Título: vaga.title,
            Empresa: vaga.company,
            Local: vaga.location,
            Link: vaga.link,
            Data: currentDate,
            CargoAlvo: cargo,
          };

          // Tentar converter a data de publicação
          if (vaga.postedDate) {
            try {
              if (vaga.postedDate.includes("T")) {
                // Formato ISO com timezone
                jobListing.DataPublicacao = new Date(vaga.postedDate);
              } else if (
                vaga.postedDate.includes("há") ||
                vaga.postedDate.includes("ha")
              ) {
                // Formato "há X dias"
                const match =
                  vaga.postedDate.match(/há\s+(\d+)\s+(dia|dias)/i) ||
                  vaga.postedDate.match(/ha\s+(\d+)\s+(dia|dias)/i);

                if (match && match[1]) {
                  const daysAgo = parseInt(match[1], 10);
                  jobListing.DataPublicacao = subDays(new Date(), daysAgo);
                }
              }
            } catch (error) {
              console.log(`⚠️ Erro ao processar data: ${error}`);
            }
          }

          result.jobs.push(jobListing);
        }
      }
    });

    result.success = true;
    console.log(`✅ Encontradas ${result.jobs.length} vagas no LinkedIn`);
  } catch (error) {
    console.log(
      `⚠️ Erro no LinkedIn: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  return result;
}
