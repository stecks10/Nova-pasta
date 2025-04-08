import puppeteer, { Page, Frame } from "puppeteer";
import { JobListing, UserProfile } from "../types";
import { getRandomUserAgent, delay } from "../utils/helpers";
import { waitFor } from "../utils/puppeteerUtils";

export async function applyToJobs(
  vagas: JobListing[],
  perfil: UserProfile,
  maxApps = 5
): Promise<void> {
  console.log("\n⚡ Iniciando candidaturas automáticas...");

  const browser = await puppeteer.launch({
    headless: false, // Mantendo visível para debug
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  let sucessos = 0;
  let falhas = 0;

  for (const vaga of vagas.slice(0, maxApps)) {
    try {
      console.log(`\n📝 Aplicando para: ${vaga.Título} na ${vaga.Empresa}`);

      await page.goto(vaga.Link, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      await delay(5000);

      if (vaga.Fonte === "LinkedIn") {
        const success = await applyLinkedIn(page, perfil);
        if (success) sucessos++;
        else falhas++;
      } else if (vaga.Fonte === "Indeed") {
        const success = await applyIndeed(page, perfil);
        if (success) sucessos++;
        else falhas++;
      }

      // Espera entre aplicações
      await delay(3000);
    } catch (error) {
      console.log(
        `⚠️ Erro ao aplicar para ${vaga.Empresa}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      falhas++;
    }
  }

  console.log(
    `\n✅ Candidaturas finalizadas: ${sucessos} com sucesso, ${falhas} com falha`
  );
  await browser.close();
}

async function applyLinkedIn(
  page: Page,
  perfil: UserProfile
): Promise<boolean> {
  try {
    // Verifica se o botão existe com seletores mais abrangentes
    const applyButtonSelectors = [
      "button.jobs-apply-button",
      "button[data-control-name='jobs_apply_button']",
      "button[aria-label*='candidatar']",
      "button.artdeco-button--primary",
    ];

    let applyButton = null;
    for (const selector of applyButtonSelectors) {
      applyButton = await page.$(selector);
      if (applyButton) break;
    }

    if (!applyButton) {
      console.log("⚠️ Botão de aplicação não encontrado no LinkedIn");
      return false;
    }

    // Verifica se o botão está visível e clicável antes de clicar
    const isVisible: boolean = await applyButton.evaluate((el: HTMLElement) => {
      const style: CSSStyleDeclaration = window.getComputedStyle(el);
      return (
        style &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    });

    if (!isVisible) {
      console.log("⚠️ Botão de aplicação não está visível no LinkedIn");
      return false;
    }

    // Clica com retry
    await applyButton.click();
    await waitFor(page, 5000); // Aumenta o tempo de espera após clicar no botão

    // Verifica se o modal de aplicação abriu com seletores mais abrangentes
    const formExists = await page.$(
      "form.jobs-easy-apply-form, div[data-test-modal-id='easy-apply-modal'], div[aria-label*='candidatura']"
    );

    if (!formExists) {
      console.log("⚠️ Modal de aplicação não encontrado no LinkedIn");
      return false;
    }

    // Tenta encontrar e preencher os campos com espera adicional
    await waitFor(page, 2000); // Espera para garantir que o formulário carregou completamente

    // Preenche informações básicas com melhor tratamento de erro
    const firstNameInput = await page.$(
      "input#first-name, input[name='firstName']"
    );
    if (firstNameInput) {
      await firstNameInput.type(perfil.nome.split(" ")[0]);
    }

    const lastNameInput = await page.$(
      "input#last-name, input[name='lastName']"
    );
    if (lastNameInput) {
      await lastNameInput.type(perfil.nome.split(" ").slice(1).join(" "));
    }

    const emailInput = await page.$("input#email, input[name='email']");
    if (emailInput) {
      await emailInput.type(perfil.email);
    }

    const phoneInput = await page.$(
      "input#phone, input[name='phone'], input[name='phoneNumber']"
    );
    if (phoneInput) {
      await phoneInput.type(perfil.telefone);
    }

    // Enviar candidatura (comentado para evitar envios não intencionais)
    // const enviarButton = await page.$("button[aria-label='Enviar candidatura'], button[data-control-name='submit_application']");
    // if (enviarButton) {
    //   await enviarButton.click();
    //   await delay(2000);
    // }

    console.log("✅ Formulário preenchido com sucesso no LinkedIn");
    return true;
  } catch (error) {
    console.log(
      `⚠️ Erro ao aplicar no LinkedIn: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

async function applyIndeed(page: Page, perfil: UserProfile): Promise<boolean> {
  try {
    // Verifica se o botão existe
    const applyButton = await page.$(
      "button#indeedApplyButton, a.jobsearch-apply-button"
    );
    if (!applyButton) {
      console.log("⚠️ Botão de aplicação não encontrado no Indeed");
      return false;
    }

    await applyButton.click();
    await delay(5000);

    // Indeed geralmente abre em um iframe ou nova janela
    // Verifica se há novos frames
    const frames = page.frames();
    const applicationFrame = frames.find(
      (frame) => frame.url().includes("apply") || frame.url().includes("form")
    );

    // Tenta preencher no frame
    if (applicationFrame) {
      const nameInput = await applicationFrame.$("input[name*='name']");
      if (nameInput) {
        await nameInput.type(perfil.nome);
      }

      const emailInput = await applicationFrame.$("input[name*='email']");
      if (emailInput) {
        await emailInput.type(perfil.email);
      }

      const phoneInput = await applicationFrame.$("input[name*='phone']");
      if (phoneInput) {
        await phoneInput.type(perfil.telefone);
      }

      console.log("✅ Formulário preenchido com sucesso no Indeed (via frame)");
      return true;
    } else {
      // Tenta no contexto da página principal
      const nameInput = await page.$("input#input-applicant\\.name");
      if (nameInput) {
        await nameInput.type(perfil.nome);

        const emailInput = await page.$("input#input-applicant\\.email");
        if (emailInput) {
          await emailInput.type(perfil.email);
        }

        const phoneInput = await page.$("input#input-applicant\\.phoneNumber");
        if (phoneInput) {
          await phoneInput.type(perfil.telefone);
        }

        console.log("✅ Formulário preenchido com sucesso no Indeed");
        return true;
      } else {
        console.log("⚠️ Formulário de aplicação não encontrado no Indeed");
        return false;
      }
    }
  } catch (error) {
    console.log(
      `⚠️ Erro ao aplicar no Indeed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}
