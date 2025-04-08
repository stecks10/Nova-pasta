const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const cron = require("node-cron");

// Lista de user agents para rotacionar
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
];

// Função auxiliar para obter um user agent aleatório
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Configurações do usuário (pode ser movido para um arquivo .env)
const USER_CONFIG = {
  habilidades: ["JavaScript", "Node.js", "React", "Angular", "React Native"], // Habilidades atualizadas
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
  candidaturasAutomaticas: true, // Habilita autopreenchimento
  buscaDiaria: true, // Executa automaticamente todo dia
};

// Dados para autopreenchimento (substitua com seus dados)
const MEU_PERFIL = {
  nome: "Vitor nunes",
  email: "vnn2006@gmail.com",
  telefone: "(22) 99929-3439",
  linkedin: "https://www.linkedin.com/in/vitor-nunes-do-nascimento-466004197/",
  github: "https://github.com/stecks10",
  experiencia: "5 anos como Desenvolvedor Full Stack",
};

// Função para atrasar a execução - evita bloqueios por muitas requisições rápidas
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function buscarVagas() {
  console.log("🔍 Iniciando busca de vagas no Brasil...");
  const resultados = [];

  // Busca para cada cargo e localização
  for (const cargo of USER_CONFIG.cargosDesejados) {
    for (const local of USER_CONFIG.localizacoes) {
      console.log(`\n🔍 Buscando vagas para: ${cargo} - ${local}`);

      // Adiciona pequeno delay entre buscas para evitar ser bloqueado
      await delay(2000);

      // Busca no LinkedIn (com Puppeteer para renderização JS)
      console.log("\n🔍 Procurando no LinkedIn...");
      const browser = await puppeteer.launch({
        headless: "new", // Usa o novo modo headless
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      // Configura um user agent para parecer um navegador real
      await page.setUserAgent(getRandomUserAgent());

      // Ajusta o viewport para parecer um navegador normal
      await page.setViewport({ width: 1366, height: 768 });

      try {
        await page.goto(
          `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
            cargo
          )}&location=${encodeURIComponent(local)}&f_EL=${
            USER_CONFIG.experiencia === "Júnior"
              ? "1"
              : USER_CONFIG.experiencia === "Pleno"
              ? "2"
              : "3"
          }&geoId=106057199`, // geoId para Brasil
          { waitUntil: "networkidle2", timeout: 30000 }
        );

        // Aumenta o timeout e adiciona fallback
        try {
          await page.waitForSelector(".jobs-search__results-list", {
            timeout: 10000,
          });
        } catch (timeoutError) {
          console.log(
            "⚠️ Tempo limite excedido ao buscar resultados no LinkedIn"
          );

          // Verifica se há algum conteúdo alternativo ou mensagem de erro
          const pageContent = await page.content();
          if (
            pageContent.includes("resultado") ||
            pageContent.includes("vaga")
          ) {
            console.log(
              "🔍 Tentando método alternativo para capturar vagas..."
            );
          }
        }

        const vagas = await page.evaluate(() => {
          const elementos = document.querySelectorAll(
            ".jobs-search__results-list li"
          );
          if (!elementos || elementos.length === 0) return [];

          return Array.from(elementos).map((vaga) => ({
            title: vaga
              .querySelector(".base-search-card__title")
              ?.innerText.trim(),
            company: vaga
              .querySelector(".base-search-card__subtitle")
              ?.innerText.trim(),
            location: vaga
              .querySelector(".job-search-card__location")
              ?.innerText.trim(),
            link: vaga.querySelector("a.base-card__full-link")?.href,
          }));
        });

        vagas.forEach((vaga) => {
          if (vaga.title && vaga.company) {
            // Adiciona somente se a localização conter Brasil ou for remoto
            if (
              vaga.location &&
              (vaga.location.toLowerCase().includes("brasil") ||
                vaga.location.toLowerCase().includes("brazil") ||
                ((vaga.location.toLowerCase().includes("remoto") ||
                  vaga.location.toLowerCase().includes("remote")) &&
                  !vaga.location.toLowerCase().includes("usa") &&
                  !vaga.location.toLowerCase().includes("united states")))
            ) {
              resultados.push({
                Fonte: "LinkedIn",
                Título: vaga.title,
                Empresa: vaga.company,
                Local: vaga.location,
                Link: vaga.link,
                Data: new Date().toLocaleDateString(),
                CargoAlvo: cargo,
              });
            }
          }
        });
      } catch (error) {
        console.log("⚠️ Erro no LinkedIn:", error.message);
      }

      // Busca no Indeed Brasil (com Puppeteer em vez de Cheerio para evitar bloqueios)
      console.log("\n🔍 Procurando no Indeed Brasil...");
      try {
        // Usando Puppeteer em vez de Axios+Cheerio para o Indeed
        // O Indeed está bloqueando requisições diretas com 403 Forbidden
        const indeedURL = `https://br.indeed.com/jobs?q=${encodeURIComponent(
          cargo
        )}&l=${encodeURIComponent(local)}`;

        // Navega para a página do Indeed com Puppeteer
        await page.goto(indeedURL, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Espera um pouco para garantir que o conteúdo foi carregado
        await page.waitForTimeout(2000);

        // Extrai as vagas usando Puppeteer
        const indeedVagas = await page.evaluate(() => {
          const vagas = [];
          const elementos = document.querySelectorAll(".job_seen_beacon");

          elementos.forEach((element) => {
            const titulo = element.querySelector(".jobTitle")?.innerText.trim();
            const empresa = element
              .querySelector(".companyName")
              ?.innerText.trim();
            const local = element
              .querySelector(".companyLocation")
              ?.innerText.trim();
            const link = element.querySelector("a.jcs-JobTitle")?.href;

            if (titulo && empresa) {
              vagas.push({ titulo, empresa, local, link });
            }
          });

          return vagas;
        });

        // Filtra apenas vagas brasileiras
        indeedVagas.forEach((vaga) => {
          if (
            vaga.local &&
            (vaga.local.toLowerCase().includes("brasil") ||
              vaga.local.toLowerCase().includes("brazil") ||
              vaga.local.includes("SP") ||
              vaga.local.includes("RJ") ||
              vaga.local.includes("MG") ||
              vaga.local.toLowerCase().includes("remoto"))
          ) {
            resultados.push({
              Fonte: "Indeed",
              Título: vaga.titulo,
              Empresa: vaga.empresa,
              Local: vaga.local,
              Link: vaga.link,
              Data: new Date().toLocaleDateString(),
              CargoAlvo: cargo,
            });
          }
        });
      } catch (error) {
        console.log("⚠️ Erro no Indeed:", error.message);
      }

      await browser.close();

      // Adiciona um intervalo entre as iterações para evitar ser bloqueado
      await delay(3000);
    }
  }

  // Função auxiliar para verificar se a vaga é do Brasil
  function vagaEhDoBrasil(vaga) {
    const local = vaga.Local ? vaga.Local.toLowerCase() : "";
    return (
      local.includes("brasil") ||
      local.includes("brazil") ||
      local.includes("remoto") ||
      local.includes("remote") ||
      local.includes("sp,") ||
      local.includes("rj,") ||
      local.includes("mg,") ||
      local.includes("são paulo") ||
      local.includes("rio de janeiro") ||
      (!local.includes("usa") && !local.includes("united states"))
    );
  }

  // Remover duplicatas baseado no link e garantir apenas vagas brasileiras
  const vagasUnicas = [
    ...new Map(resultados.map((v) => [v.Link, v])).values(),
  ].filter(vagaEhDoBrasil);

  // Salvar resultados
  if (vagasUnicas.length > 0) {
    console.log(
      `\n🎉 Encontramos ${vagasUnicas.length} vagas únicas no Brasil!`
    );

    const csvContent = vagasUnicas
      .map(
        (v) =>
          `${v.Fonte};"${v.Título}";"${v.Empresa}";"${v.Local}";${v.Link};${v.Data};"${v.CargoAlvo}"`
      )
      .join("\n");

    fs.writeFileSync(
      "vagas.csv",
      "Fonte;Título;Empresa;Local;Link;Data;CargoAlvo\n" + csvContent
    );
    console.log("✅ Vagas salvas em vagas.csv");

    // Candidatura automática (simplificada)
    if (USER_CONFIG.candidaturasAutomaticas) {
      console.log("\n⚡ Iniciando candidaturas automáticas...");
      await aplicarVagas(vagasUnicas.slice(0, 5)); // Aplica nas 5 primeiras
    }
  } else {
    console.log("\n😢 Nenhuma vaga encontrada hoje");
  }
}

async function aplicarVagas(vagas) {
  const browser = await puppeteer.launch({
    headless: false, // Mantendo visível para debug
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Configura um user agent
  await page.setUserAgent(getRandomUserAgent());

  // Aumenta os timeouts padrão
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  for (const vaga of vagas) {
    try {
      console.log(`\n📝 Aplicando para: ${vaga.Título} na ${vaga.Empresa}`);

      // Melhora a navegação com mais opções
      await page.goto(vaga.Link, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Espera mais tempo para garantir que a página carregou completamente
      await page.waitForTimeout(5000);

      // LinkedIn Easy Apply
      if (vaga.Fonte === "LinkedIn") {
        // Verifica se o botão existe
        const applyButton = await page.$("button.jobs-apply-button");
        if (applyButton) {
          // Clica com retry
          try {
            await applyButton.click();
            await page.waitForTimeout(3000);

            // Verifica se o modal de aplicação abriu
            const formExists = await page.$("form.jobs-easy-apply-form");
            if (formExists) {
              // Preenche informações básicas
              if (await page.$("input#first-name")) {
                await page.type(
                  "input#first-name",
                  MEU_PERFIL.nome.split(" ")[0]
                );
              }

              if (await page.$("input#last-name")) {
                await page.type(
                  "input#last-name",
                  MEU_PERFIL.nome.split(" ")[1]
                );
              }

              if (await page.$("input#email")) {
                await page.type("input#email", MEU_PERFIL.email);
              }

              if (await page.$("input#phone")) {
                await page.type("input#phone", MEU_PERFIL.telefone);
              }

              console.log("✅ Candidatura enviada no LinkedIn");
            } else {
              console.log("⚠️ Modal de aplicação não encontrado");
            }
          } catch (clickError) {
            console.log(
              "⚠️ Erro ao clicar no botão de aplicação:",
              clickError.message
            );
          }
        } else {
          console.log("⚠️ Botão de aplicação não encontrado");
        }
      }
      // Indeed
      else if (vaga.Fonte === "Indeed") {
        // Verifica se o botão existe
        const applyButton = await page.$("button#indeedApplyButton");
        if (applyButton) {
          try {
            await applyButton.click();
            await page.waitForTimeout(5000);

            // Indeed geralmente abre em um iframe ou nova janela
            // Verifica se há novos frames
            const frames = page.frames();
            const applicationFrame = frames.find(
              (frame) =>
                frame.url().includes("apply") || frame.url().includes("form")
            );

            if (applicationFrame) {
              // Tenta preencher no frame
              if (await applicationFrame.$("input[name*='name']")) {
                await applicationFrame.type(
                  "input[name*='name']",
                  MEU_PERFIL.nome
                );
              }

              if (await applicationFrame.$("input[name*='email']")) {
                await applicationFrame.type(
                  "input[name*='email']",
                  MEU_PERFIL.email
                );
              }

              if (await applicationFrame.$("input[name*='phone']")) {
                await applicationFrame.type(
                  "input[name*='phone']",
                  MEU_PERFIL.telefone
                );
              }

              console.log("✅ Candidatura enviada no Indeed (via frame)");
            } else {
              // Tenta no contexto da página principal
              if (await page.$("input#input-applicant\\.name")) {
                await page.type(
                  "input#input-applicant\\.name",
                  MEU_PERFIL.nome
                );
                await page.type(
                  "input#input-applicant\\.email",
                  MEU_PERFIL.email
                );
                await page.type(
                  "input#input-applicant\\.phoneNumber",
                  MEU_PERFIL.telefone
                );
                console.log("✅ Candidatura enviada no Indeed");
              } else {
                console.log("⚠️ Formulário de aplicação não encontrado");
              }
            }
          } catch (clickError) {
            console.log(
              "⚠️ Erro ao clicar no botão do Indeed:",
              clickError.message
            );
          }
        } else {
          console.log("⚠️ Botão do Indeed não encontrado");
        }
      }

      // Espera entre aplicações
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log(`⚠️ Erro ao aplicar para ${vaga.Empresa}: ${error.message}`);
    }
  }

  await browser.close();
}

// Configura agendamento diário
if (USER_CONFIG.buscaDiaria) {
  console.log("\n⏰ Agendando busca diária às 9h...");
  cron.schedule("0 9 * * *", () => {
    console.log("\n🔄 Executando busca diária...");
    buscarVagas();
  });
}

// Executa imediatamente na primeira vez
(async () => {
  await buscarVagas();
})();
