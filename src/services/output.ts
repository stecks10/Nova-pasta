import fs from "fs";
import path from "path";
import { JobListing } from "../types";
import { formatCSVText } from "../utils/helpers";

export function saveToCSV(
  jobs: JobListing[],
  filePath: string = "vagas.csv"
): void {
  try {
    // Cabeçalho do CSV
    const header = "Fonte;Título;Empresa;Local;Link;Data;CargoAlvo";

    // Conteúdo com dados formatados
    const content = jobs
      .map(
        (job) =>
          `${job.Fonte};"${formatCSVText(job.Título)}";"${formatCSVText(
            job.Empresa
          )}";` +
          `"${formatCSVText(job.Local)}";${job.Link};${job.Data};"${
            job.CargoAlvo
          }"`
      )
      .join("\n");

    fs.writeFileSync(filePath, `${header}\n${content}`);
    console.log(`✅ Vagas salvas em CSV: ${filePath}`);
  } catch (error) {
    console.error(
      `❌ Erro ao salvar arquivo CSV: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function saveToHTML(
  jobs: JobListing[],
  filePath: string = "vagas.html"
): void {
  try {
    // Agrupamento por cargo alvo
    const jobsByRole: Record<string, JobListing[]> = {};

    jobs.forEach((job) => {
      if (!jobsByRole[job.CargoAlvo]) {
        jobsByRole[job.CargoAlvo] = [];
      }
      jobsByRole[job.CargoAlvo].push(job);
    });

    // Criar conteúdo HTML
    let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vagas Encontradas - ${new Date().toLocaleDateString(
        "pt-BR"
      )}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 30px;
        }
        h2 {
          color: #3498db;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          margin-top: 40px;
        }
        .job-card {
          background-color: #f9f9f9;
          border-left: 4px solid #3498db;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 0 4px 4px 0;
          transition: transform 0.2s;
        }
        .job-card:hover {
          transform: translateX(5px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .job-title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 5px 0;
          color: #2c3e50;
        }
        .job-company {
          font-weight: bold;
          color: #34495e;
        }
        .job-location {
          color: #7f8c8d;
          font-size: 14px;
        }
        .job-date {
          color: #95a5a6;
          font-size: 14px;
        }
        .job-source {
          display: inline-block;
          padding: 3px 6px;
          background-color: #e74c3c;
          color: white;
          border-radius: 3px;
          font-size: 12px;
          margin-right: 5px;
        }
        .job-link {
          display: inline-block;
          margin-top: 10px;
          background-color: #3498db;
          color: white;
          padding: 5px 10px;
          text-decoration: none;
          border-radius: 3px;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .job-link:hover {
          background-color: #2980b9;
        }
        .summary {
          background-color: #2ecc71;
          color: white;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 30px;
          text-align: center;
          font-size: 18px;
        }
        .date-generated {
          text-align: center;
          color: #7f8c8d;
          margin-top: 40px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Vagas Encontradas</h1>
        <div class="summary">
          Encontradas ${jobs.length} vagas em ${
      Object.keys(jobsByRole).length
    } categorias diferentes.
        </div>
    `;

    // Adicionar cada seção por cargo
    Object.keys(jobsByRole).forEach((role) => {
      const jobsInRole = jobsByRole[role];
      html += `
        <h2>${role} (${jobsInRole.length})</h2>
      `;

      // Adicionar cada vaga
      jobsInRole.forEach((job) => {
        html += `
          <div class="job-card">
            <span class="job-source">${job.Fonte}</span>
            <div class="job-title">${job.Título}</div>
            <div class="job-company">${job.Empresa}</div>
            <div class="job-location">📍 ${job.Local}</div>
            <div class="job-date">📅 Data: ${job.Data}</div>
            <a href="${job.Link}" target="_blank" class="job-link">Ver Vaga</a>
          </div>
        `;
      });
    });

    // Fechar HTML
    html += `
        <div class="date-generated">
          Gerado em ${new Date().toLocaleString("pt-BR")}
        </div>
      </div>
    </body>
    </html>
    `;

    fs.writeFileSync(filePath, html);
    console.log(`✅ Relatório HTML salvo em: ${filePath}`);
  } catch (error) {
    console.error(
      `❌ Erro ao salvar arquivo HTML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function saveToReadme(
  jobs: JobListing[],
  filePath: string = "README.md"
): void {
  try {
    // Agrupar por cargo alvo para estatísticas
    const jobsByRole: Record<string, JobListing[]> = {};
    const jobsBySource: Record<string, number> = {};

    jobs.forEach((job) => {
      // Agrupar por cargo
      if (!jobsByRole[job.CargoAlvo]) {
        jobsByRole[job.CargoAlvo] = [];
      }
      jobsByRole[job.CargoAlvo].push(job);

      // Contabilizar por fonte
      if (!jobsBySource[job.Fonte]) {
        jobsBySource[job.Fonte] = 0;
      }
      jobsBySource[job.Fonte]++;
    });

    // Criando conteúdo do README
    let content = `# Relatório de Vagas de Emprego\n\n`;
    content += `## Resumo\n\n`;
    content += `- **Total de vagas encontradas:** ${jobs.length}\n`;
    content += `- **Categorias de cargo:** ${Object.keys(jobsByRole).length}\n`;
    content += `- **Data da geração:** ${new Date().toLocaleDateString(
      "pt-BR"
    )}\n\n`;

    content += `## Distribuição por Categoria\n\n`;
    Object.keys(jobsByRole).forEach((role) => {
      content += `- **${role}:** ${jobsByRole[role].length} vagas\n`;
    });

    content += `\n## Distribuição por Fonte\n\n`;
    Object.keys(jobsBySource).forEach((source) => {
      content += `- **${source}:** ${jobsBySource[source]} vagas\n`;
    });

    content += `\n## Arquivos Gerados\n\n`;
    content += `- [Lista de Vagas em CSV](./vagas.csv)\n`;
    content += `- [Lista de Vagas em HTML](./vagas.html)\n`;

    content += `\n## Como Utilizar\n\n`;
    content += `Este relatório foi gerado automaticamente pelo rastreador de vagas. `;
    content += `Para visualizar os detalhes completos, abra o arquivo HTML para uma experiência interativa `;
    content += `ou o arquivo CSV para manipulação em planilhas eletrônicas.\n`;

    fs.writeFileSync(filePath, content);
    console.log(`✅ README.md gerado com sucesso: ${filePath}`);
  } catch (error) {
    console.error(
      `❌ Erro ao gerar README.md: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface SaveOptions {
  format: "csv" | "html" | "markdown" | "all";
  outputDir?: string;
}

export function saveResults(jobs: JobListing[], options: SaveOptions): void {
  const outputDir = options.outputDir || "./resultados";

  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}_${String(
    now.getHours()
  ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

  // Salvar em Markdown
  if (options.format === "markdown" || options.format === "all") {
    const mdContent = generateMarkdown(jobs);
    const mdFilePath = path.join(outputDir, `vagas_remotas_${timestamp}.md`);
    fs.writeFileSync(mdFilePath, mdContent, "utf8");
    console.log(`✅ Lista de vagas salva em Markdown: ${mdFilePath}`);
  }

  // Salvar em CSV
  if (options.format === "csv" || options.format === "all") {
    saveToCSV(jobs, path.join(outputDir, `vagas_${timestamp}.csv`));
    // Também salvar na raiz para compatibilidade com o código anterior
    saveToCSV(jobs);
  }

  // Salvar em HTML
  if (options.format === "html" || options.format === "all") {
    saveToHTML(jobs, path.join(outputDir, `vagas_${timestamp}.html`));
    // Também salvar na raiz
    saveToHTML(jobs);
  }

  // Gerar README.md
  saveToReadme(jobs, path.join(outputDir, `README.md`));
  // Também salvar na raiz
  saveToReadme(jobs);
}

function generateMarkdown(jobs: JobListing[]): string {
  let markdown = "# 🔍 Vagas Remotas Encontradas\n\n";
  markdown += `*Atualizado em: ${new Date().toLocaleString("pt-BR")}*\n\n`;

  // Adicionar estatísticas
  markdown += "## 📊 Resumo\n\n";
  markdown += `- **Total de vagas encontradas:** ${jobs.length}\n`;

  // Contagem por fonte
  const fontes = jobs.reduce((acc, job) => {
    acc[job.Fonte] = (acc[job.Fonte] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  markdown += "- **Vagas por fonte:**\n";
  for (const [fonte, count] of Object.entries(fontes)) {
    markdown += `  - ${fonte}: ${count}\n`;
  }

  markdown += "\n## 💼 Lista de Vagas\n\n";

  jobs.forEach((job, index) => {
    const dataFormatada = job.DataPublicacao
      ? new Date(job.DataPublicacao).toLocaleDateString("pt-BR")
      : job.Data;

    markdown += `### ${index + 1}. ${job.Título}\n\n`;
    markdown += `- **Empresa:** ${job.Empresa}\n`;
    markdown += `- **Local:** ${job.Local}\n`;
    markdown += `- **Data de Publicação:** ${dataFormatada}\n`;
    markdown += `- **Fonte:** ${job.Fonte}\n`;
    markdown += `- **Link:** [Acessar vaga](${job.Link})\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}
