import { Page } from "puppeteer";

/**
 * Função de espera segura para Puppeteer que funciona com ou sem o waitForTimeout nativo
 */
export async function waitFor(page: Page, ms: number): Promise<void> {
  // Implementação segura que não depende diretamente do waitForTimeout
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Função auxiliar para scroll automático em páginas
 */
export async function autoScroll(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  } catch (error) {
    console.log(
      `⚠️ Erro durante o scroll: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
