import os
import re

BLOG_DIR = os.path.join("src", "content", "blog")

# Expressões regulares para encontrar imagens HTML (<img ... src="...">) e Markdown (![...](url))
html_img_regex = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
md_img_regex = re.compile(r'!\[.*?\]\((https?://[^\s\)]+|\/[^\s\)]+)\)')

updated_count = 0
no_image_count = 0

for filename in os.listdir(BLOG_DIR):
    if not filename.endswith(".md"):
        continue

    filepath = os.path.join(BLOG_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Ignora se já tiver heroImage preenchido
    if "heroImage:" in content:
        continue

    # Separa o frontmatter do corpo do texto
    parts = content.split("---", 2)
    if len(parts) < 3:
        continue

    frontmatter = parts[1]
    body = parts[2]

    # Procura a primeira imagem (HTML ou Markdown)
    img_match = html_img_regex.search(body) or md_img_regex.search(body)

    if img_match:
        img_url = img_match.group(1)
        # Insere o heroImage no frontmatter
        new_frontmatter = frontmatter.rstrip() + f'\nheroImage: "{img_url}"\n'
        new_content = f"---{new_frontmatter}---{body}"
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        
        updated_count += 1
    else:
        no_image_count += 1

print(f"Concluído!")
print(f"Posts atualizados com heroImage: {updated_count}")
print(f"Posts sem imagem encontrada: {no_image_count}")
