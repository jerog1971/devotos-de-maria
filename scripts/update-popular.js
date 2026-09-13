import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';

// Configuração do cliente da API do Google Analytics
// (Utilizará credenciais seguras injetadas pelo GitHub Actions)
const analyticsDataClient = new BetaAnalyticsDataClient();

// Substitua pelo seu ID de Propriedade do Google Analytics 4 (ex: '123456789')
const PROPERTY_ID = process.env.GA_PROPERTY_ID;

async function runReport() {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'CONTAINS',
              value: '/posts/', // Filtra apenas as páginas de artigos
            },
          },
          name: 'pagePath',
        },
        { name: 'pageTitle' },
      ],
      metrics: [
        { name: 'screenPageViews' },
      ],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 10,
    });

    const popularPosts = response.rows.map(row => ({
      slug: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      views: row.metricValues[0].value,
    }));

    // Salva os dados em um arquivo JSON local que o Astro vai ler
    const outputPath = path.join(process.cwd(), 'src/data/popular-posts.json');
    fs.writeFileSync(outputPath, JSON.stringify(popularPosts, null, 2));
    console.log('Postagens mais visitadas atualizadas com sucesso!');
  } catch (error) {
    console.error('Erro ao buscar dados do Google Analytics:', error);
    process.exit(1);
  }
}

runReport();
