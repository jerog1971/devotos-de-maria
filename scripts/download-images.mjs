import fs from 'fs';
import path from 'path';
import https from 'https';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');
const OUTPUT_IMG_DIR = path.join(process.cwd(), 'public/images/posts');

// Garante que a pasta de destino exista
if (!fs.existsSync(OUTPUT_IMG_DIR)) {
  fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });
}

// Função para baixar uma imagem via HTTPS
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Falha ao baixar imagem (${response.statusCode}): ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Sanitiza o nome do arquivo baixado
function getSanitizedFilename(url) {
  const urlPath = new URL(url).pathname;
  let basename = path.basename(urlPath);
  if (!path.extname(basename)) {
    basename += '.jpg';
  }
  return basename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function processFiles() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  console.log(`Encontrados ${files.length} arquivos para processar...`);

  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex para capturar URLs do Google/Blogger
    const googleImgRegex = /(https?:\/\/(?:lh\d+\.googleusercontent\.com|bp\.blogspot\.com|blogger\.googleusercontent\.com)[^\s"'>\)]+)/g;
    const matches = [...new Set(content.match(googleImgRegex) || [])];

    if (matches.length === 0) continue;

    let firstLocalImgPath = null;

    for (const imgUrl of matches) {
      const filename = `${path.basename(file, '.md')}-${getSanitizedFilename(imgUrl)}`;
      const localFilePath = path.join(OUTPUT_IMG_DIR, filename);
      const publicUrlPath = `/images/posts/${filename}`;

      if (!firstLocalImgPath) {
        firstLocalImgPath = publicUrlPath;
      }

      // Baixa a imagem se ainda não existir localmente
      if (!fs.existsSync(localFilePath)) {
        try {
          await downloadImage(imgUrl, localFilePath);
          console.log(`Baixada: ${filename}`);
        } catch (err) {
          console.error(`Erro ao baixar ${imgUrl}:`, err.message);
          continue;
        }
      }

      // Substitui o link do Google pelo caminho local no conteúdo
      content = content.replaceAll(imgUrl, publicUrlPath);
    }

    // Atualiza o heroImage no frontmatter com a primeira imagem encontrada
    if (firstLocalImgPath) {
      content = content.replace(/heroImage:\s*["'].*?["']/g, `heroImage: "${firstLocalImgPath}"`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  }

  console.log(`Processamento concluído! ${updatedCount} arquivos foram atualizados.`);
}

processFiles();
