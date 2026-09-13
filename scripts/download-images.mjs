import fs from 'fs';
import path from 'path';
import https from 'https';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');
const OUTPUT_IMG_DIR = path.join(process.cwd(), 'public/images/posts');

if (!fs.existsSync(OUTPUT_IMG_DIR)) {
  fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Status HTTP ${response.statusCode}`));
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

// Limpa e sanitiza o nome da imagem, decodificando caracteres de URL e cortando nomes longos
function getSanitizedFilename(url) {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch (e) {
    // Caso a URL tenha caracteres malformados para o decode
  }

  const urlPath = new URL(url).pathname;
  let basename = path.basename(urlPath);
  
  if (!path.extname(basename)) {
    basename += '.jpg';
  }

  // Se o nome vindo da URL for uma hash gigante do Google (maior que 40 caracteres), simplifica para hash simples
  const ext = path.extname(basename);
  let nameOnly = path.basename(basename, ext);
  if (nameOnly.length > 30) {
    nameOnly = 'img-' + Math.abs(hashCode(url));
  }

  // Remove caracteres especiais mantendo padrão legível
  const cleanName = nameOnly
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_');

  return `${cleanName}${ext}`;
}

// Helper simples para gerar hash curto em URLs muito longas
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function processFiles() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  console.log(`Encontrados ${files.length} arquivos para processar...`);

  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    const googleImgRegex = /(https?:\/\/(?:lh\d+\.googleusercontent\.com|bp\.blogspot\.com|blogger\.googleusercontent\.com)[^\s"'>\)]+)/g;
    const matches = [...new Set(content.match(googleImgRegex) || [])];

    if (matches.length === 0) continue;

    let firstLocalImgPath = null;

    for (const imgUrl of matches) {
      // Limita o prefixo do nome do arquivo a 40 caracteres para evitar estouro de nome no sistema de arquivos
      const fileSlug = path.basename(file, '.md').substring(0, 40);
      const cleanImgName = getSanitizedFilename(imgUrl);
      const filename = `${fileSlug}-${cleanImgName}`;
      
      const localFilePath = path.join(OUTPUT_IMG_DIR, filename);
      const publicUrlPath = `/images/posts/${filename}`;

      if (!firstLocalImgPath) {
        firstLocalImgPath = publicUrlPath;
      }

      if (!fs.existsSync(localFilePath)) {
        try {
          await downloadImage(imgUrl, localFilePath);
          console.log(`Baixada: ${filename}`);
        } catch (err) {
          console.error(`Aviso: Falha ao baixar ${imgUrl} (${err.message})`);
          continue;
        }
      }

      content = content.replaceAll(imgUrl, publicUrlPath);
    }

    if (firstLocalImgPath) {
      content = content.replace(/heroImage:\s*["'].*?["']/g, `heroImage: "${firstLocalImgPath}"`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  }

  console.log(`Processamento concluído com sucesso! ${updatedCount} arquivos atualizados.`);
}

processFiles();
