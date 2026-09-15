import fs from 'fs';
import path from 'path';

// Ajuste para a pasta onde ficam seus arquivos .md
const POSTS_DIR = './src/content/blog';

function limparMarkdown(conteudo) {
  let limpo = conteudo;

  // 1. Remove parágrafos vazios (<p>&nbsp;</p> ou parágrafos só com espaços)
  limpo = limpo.replace(/<p>(&nbsp;|\s)*<\/p>/gi, '');

  // 2. Converte imagens HTML em div.separator para Markdown puro
  limpo = limpo.replace(/<div class="separator"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi, (match, src) => {
    return `\n\n![](${src})\n\n`;
  });

  // 3. Converte tags de parágrafo <p>conteudo</p> em quebras de linha Markdown
  limpo = limpo.replace(/<p>(.*?)<\/p>/gis, (match, p1) => {
    return `\n\n${p1.trim()}\n\n`;
  });

  // 4. Remove qualquer &nbsp; restante no texto
  limpo = limpo.replace(/&nbsp;/g, ' ');

  // 5. Remove múltiplos saltos de linha excessivos (mais de 2 linhas em branco seguidas)
  limpo = limpo.replace(/\n{3,}/g, '\n\n');

  return limpo;
}

function processarPasta() {
  const arquivos = fs.readdirSync(POSTS_DIR);
  let alterados = 0;

  arquivos.forEach((arquivo) => {
    if (path.extname(arquivo) === '.md') {
      const caminhoCompleto = path.join(POSTS_DIR, arquivo);
      const conteudoOriginal = fs.readFileSync(caminhoCompleto, 'utf8');
      
      const conteudoLimpo = limparMarkdown(conteudoOriginal);

      if (conteudoOriginal !== conteudoLimpo) {
        fs.writeFileSync(caminhoCompleto, conteudoLimpo, 'utf8');
        console.log(`✅ Limpo: ${arquivo}`);
        alterados++;
      }
    }
  });

  console.log(`\n🎉 Concluído! Total de posts higienizados: ${alterados}`);
}

processarPasta();
