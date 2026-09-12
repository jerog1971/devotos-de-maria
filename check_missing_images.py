import os

BLOG_DIR = os.path.join("src", "content", "blog")
missing_images = []

if not os.path.exists(BLOG_DIR):
    print(f"Erro: A pasta {BLOG_DIR} não foi encontrada.")
    exit(1)

for filename in os.listdir(BLOG_DIR):
    if not filename.endswith(".md"):
        continue
    filepath = os.path.join(BLOG_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "heroImage:" not in content:
        missing_images.append(filename)

print(f"Total de posts sem heroImage: {len(missing_images)}")
print("--- Lista dos arquivos ---")
for file in sorted(missing_images):
    print(file)
