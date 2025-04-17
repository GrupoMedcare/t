# renomear_guias.py
import os
import re
import pytesseract
import shutil
from pdf2image import convert_from_path
from PIL import Image
from datetime import datetime
# CAMINHO PARA O EXECUTÁVEL DO TESSERACT (Windows)
# Ajuste se necessário no ambiente de destino
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = tesseract_path

# Entrada de dados do usuário
input_folder = input("Digite o caminho da pasta com os PDFs digitalizados: ").strip().strip('"')
output_folder = input("Digite o nome da pasta onde os arquivos renomeados devem ser salvos: ").strip().strip('"')
dpi = input("Digite a DPI de 100 a 400 (quanto menor mais rápido, porém mais impreciso): ").strip() 

# Cria a pasta de saída, se não existir
os.makedirs(output_folder, exist_ok=True)

# Contadores e lista de falhas
total_scanned = 0
failure_scanned = 0
failed_files = []

# Função para extrair número da guia
# Mesma lógica que você já usa
initialTime = datetime.now()
def extrair_codigo(texto: str):
    linhas = texto.lower().splitlines()

    # 1. Tenta encontrar próximo de "guia de serv"
    for i, linha in enumerate(linhas):
        if "uia de serv" in linha and "profiss" in linha:
            possiveis = [linha]
            if i + 1 < len(linhas):
                possiveis.append(linhas[i + 1])
            for l in possiveis:
                codigo = buscar_codigo_em_linha(l)
                if codigo:
                    return codigo

    # 2. Fallback: tenta nos primeiros 3 blocos de texto
    for linha in linhas[:3]:
        codigo = buscar_codigo_em_linha(linha)
        if codigo:
            return codigo

    return None

# Função auxiliar para procurar código em uma linha

def buscar_codigo_em_linha(linha: str):
    # Remove espaços internos em números
    linha = re.sub(r'(\d)\s+(\d)', r'\1\2', linha)
    match = re.search(r'\b(4\d{7,8}|9\d{7,8}|10\d{7,8})\b', linha)
    if match:
        codigo = match.group(0)
        # Se começar com '4', corrige para '1'
        if codigo.startswith('4'):
            codigo = '1' + codigo[1:]
        return codigo
    return None

# Processamento de PDFs
total_files = [f for f in os.listdir(input_folder) if f.lower().endswith('.pdf')]
for arquivo in total_files:
    caminho_pdf = os.path.join(input_folder, arquivo)
    try:
        total_scanned += 1
        imagens = convert_from_path(caminho_pdf, dpi=int(dpi), first_page=1, last_page=1)
        imagem = imagens[0]
        texto = pytesseract.image_to_string(imagem)

        codigo = extrair_codigo(texto)
        if codigo:
            novo_nome = f"{codigo}.pdf"
            destino = os.path.join(output_folder, novo_nome)
            shutil.copy(caminho_pdf, destino)
            print(f"✅ {arquivo} → {novo_nome}")
        else:
            failure_scanned += 1
            failed_files.append(arquivo)
            print(f"❌ Código não encontrado em {arquivo}")

        print(f"📊 Total processados: {total_scanned}/{len(total_files)} | Falhas: {failure_scanned}")

    except Exception as e:
        failure_scanned += 1
        failed_files.append(arquivo)
        print(f"⚠️ Erro ao processar {arquivo}: {e}")

# Gera relatório de falhas se houver
if failed_files:
    log_path = os.path.join(output_folder, 'falhas.txt')
    with open(log_path, 'w', encoding='utf-8') as log_file:
        log_file.write("Arquivos sem código reconhecido:\n")
        for nome in failed_files:
            log_file.write(nome + "\n")
    print(f"📝 Relatório de falhas salvo em: {log_path}")
else:
    print("🎉 Todos os arquivos tiveram código extraído com sucesso!")
finalTime = datetime.now()
totalTime = (finalTime.replace(microsecond=0) - initialTime.replace(microsecond=0))
print(f"⌚ Tempo decorrido: {totalTime}")