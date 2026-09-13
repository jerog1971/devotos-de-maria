import fs from 'fs';
import path from 'path';

const imagesDir = './public/images';
const postsDir = './src/content/blog';

console.log('1. Mapeando imagens locais e arquivos JSON...');
const urlToLocalMap = new Map();
const nameToLocalMap = new Map();

const files = fs.readdirSync(imagesDir);

// Função auxiliar para extrair todas as strings de URL de um objeto JSON
function extractUrls(obj, urls = []) {
  if (!obj) return urls;
  if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) {
    urls.push(obj);
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      extractUrls(obj[key], urls);
    }
  }
  return urls;
}

for (const file of files) {
  if (file.endsWith('.json')) {
    const jsonPath = path.join(imagesDir, file);
    const imageFileName = file.slice(0, -5); 
    const imageFilePath = path.join(imagesDir, imageFileName);

    if (fs.existsSync(imageFilePath)) {
      // Mapeia por nome de arquivo limpo (sem extensão)
      const cleanName = path.parse(imageFileName).name.toLowerCase().trim();
      nameToLocalMap.set(cleanName, `/images/${imageFileName}`);

      try {
        const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const extracted = extractUrls(content);
        for (const url of extracted) {
          urlToLocalMap.set(url, `/images/${imageFileName}`);
        }
      } catch (e) {}
    }
  }
}

console.log(`Mapeadas ${urlToLocalMap.size} URLs extraídas dos arquivos JSON.`);

console.log('2. Atualizando posts Markdown restantes...');
const posts = fs.readdirSync(postsDir);
let totalUpdated = 0;
let totalPosts = 0;

for (const postFile of posts) {
  if (!postFile.endsWith('.md')) continue;
  totalPosts++;

  const postPath = path.join(postsDir, postFile);
  let content = fs.readFileSync(postPath, 'utf-8');
  let originalContent = content;

  // 1. Substituição direta via URLs extraídas do JSON
  for (const [googleUrl, localPath] of urlToLocalMap.entries()) {
    if (content.includes(googleUrl)) {
      content = content.replaceAll(googleUrl, localPath);
    }
  }

  // 2. Busca flexível por nome de arquivo no heroImage
  const heroMatch = content.match(/heroImage:\s*['"]?([^'"\n\r]+)['"]?/);
  if (heroMatch) {
    const currentHero = heroMatch[1];
    
    // Se ainda apontar para servidor do Google ou URL externa
    if (currentHero.includes('googleusercontent.com') || currentHero.includes('blogspot.com') || currentHero.startsWith('http')) {
      const urlBaseName = path.basename(currentHero.split('?')[0]);
      const cleanUrlName = decodeURIComponent(urlBaseName).split('.')[0].toLowerCase().trim();

      // Tenta casamento direto por nome de arquivo local
      const matchFile = files.find(f => {
        if (f.endsWith('.json')) return false;
        const fClean = path.parse(f).name.toLowerCase().trim();
        return fClean === cleanUrlName || cleanUrlName.includes(fClean) || fClean.includes(cleanUrlName);
      });

      if (matchFile) {
        content = content.replace(currentHero, `/images/${matchFile}`);
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(postPath, content, 'utf-8');
    totalUpdated++;
  }
}

console.log(`\nResultado final: ${totalUpdated} de ${totalPosts} posts estão usando imagens locais!`);
