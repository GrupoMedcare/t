import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import os from "os";
import pdf from "pdf-poppler";
import { createWorker } from "tesseract.js";
import readline from "readline/promises";
import { stdin, stdout } from "node:process";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import sharp from "sharp";
import { BrowserWindow } from "electron";
dayjs.extend(duration);

export async function extractTextFromPDFsInFolder(folderPath:string, outputFolder:string, mainWindow:BrowserWindow):Promise<void> {
  
  const filesWithError:string[] = [];
  const initialTime = Date.now();
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".pdf"));
  let progress = 0;

  if (files.length === 0) {
    console.log("Nenhum PDF encontrado.");
    return;
  }

  await fsPromises.mkdir(outputFolder, { recursive: true });

  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "pdfocr-"));
  console.log("Pasta temporária criada:", tempDir);

  const worker = await createWorker("por");

  for (const file of files) {
    const originalPath = path.join(folderPath, file);
    const pdfTempPath = path.join(tempDir, file);
    await fsPromises.copyFile(originalPath, pdfTempPath);

    const imgOutDir = path.join(tempDir, path.basename(file, ".pdf"));
    await fsPromises.mkdir(imgOutDir);

    // Converter PDF em imagens
    await pdf.convert(pdfTempPath, {
      format: "jpeg",
      out_dir: imgOutDir,
      out_prefix: "page",
      page: null,
    });

    const images = fs.readdirSync(imgOutDir).filter((f) => f.endsWith(".jpg"));

    console.log(`Analisando arquivo - ${file}`);

    for (const image of images) {
      const imagePath = path.join(imgOutDir, image);
      const enhancedImagePath = path.join(imgOutDir, `enhanced-${image}`);

      // Processar imagem com Sharp e salvar na mesma pasta temporária
      await sharp(imagePath)
        .resize(1024)
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 75 })
        .toFile(enhancedImagePath);

      // OCR na imagem melhorada
      const {
        data: { text },
      } = await worker.recognize(enhancedImagePath);

      console.log(text.trim());

      const matches = text.trim().replace(/—/g, "¨").toLowerCase().match(/[Prestador ¨ ]\s*(9\d{7,8}|10\d{6,7})/g);

      progress++;
      mainWindow.webContents.send('file-parsed',`${progress} de ${files.length} analisados | ${filesWithError.length} falhas`);
      

      if (matches && matches.length > 0) {
        const newFileName = `${matches[0].replace(/[Prestador ¨ ]\s/g, "")}.pdf`;
        const destinationPath = path.resolve(outputFolder, newFileName);
        await fsPromises.copyFile(originalPath, destinationPath);
      } else {
        filesWithError.push(file);
        console.log(`Erro ao ler arquivo ${file}`);
      }
    }

 
  }

  await worker.terminate();
  if (filesWithError.length > 0) {
    const filePath = path.resolve(outputFolder, "falhas.txt");
    for (const file of filesWithError) {
      await fsPromises.appendFile(filePath, `${file}\n`);
    }
  }

  const finalTime = Date.now();
  const elapsedTime = dayjs.duration(finalTime - initialTime);

  await fsPromises.rm(tempDir, { recursive: true, force: true });

  console.log(`Duração do processo: ${elapsedTime.minutes()}:${elapsedTime.seconds()}`);
}

// const rl = readline.createInterface({ input: stdin, output: stdout });
// const inputDir = await rl.question("Qual o caminho da pasta com os PDFs? ");
// const outputDir = await rl.question("Qual o nome da pasta para os pdfs renomeados? ");
// const qualitySelected = await rl.question("Qual qualidade você quer? (quanto maior mais preciso, porém mais demorado) \n 1 - Qualidade baixa \n 2 - Qualidade média \n 3 - Qualidade alta \n ")
// rl.close();

