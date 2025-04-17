"use strict";

var _fs = _interopRequireDefault(require("fs"));
var _promises = _interopRequireDefault(require("fs/promises"));
var _path = _interopRequireDefault(require("path"));
var _os = _interopRequireDefault(require("os"));
var _pdfPoppler = _interopRequireDefault(require("pdf-poppler"));
var _tesseract = require("tesseract.js");
var _promises2 = _interopRequireDefault(require("readline/promises"));
var _nodeProcess = require("node:process");
var _dayjs = _interopRequireDefault(require("dayjs"));
var _duration = _interopRequireDefault(require("dayjs/plugin/duration.js"));
var _sharp = _interopRequireDefault(require("sharp"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
_dayjs.default.extend(_duration.default);
async function extractTextFromPDFsInFolder(folderPath, outputFolder) {
  const filesWithError = [];
  const initialTime = Date.now();
  const files = _fs.default
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".pdf"));
  let progress = 0;
  if (files.length === 0) {
    console.log("Nenhum PDF encontrado.");
    return;
  }
  await _promises.default.mkdir(outputFolder, {
    recursive: true
  });
  const tempDir = await _promises.default.mkdtemp(
    _path.default.join(_os.default.tmpdir(), "pdfocr-")
  );
  console.log("Pasta temporária criada:", tempDir);
  const worker = await (0, _tesseract.createWorker)("por");
  for (const file of files) {
    const originalPath = _path.default.join(folderPath, file);
    const pdfTempPath = _path.default.join(tempDir, file);
    await _promises.default.copyFile(originalPath, pdfTempPath);
    const imgOutDir = _path.default.join(
      tempDir,
      _path.default.basename(file, ".pdf")
    );
    await _promises.default.mkdir(imgOutDir);

    // Converter PDF em imagens
    await _pdfPoppler.default.convert(pdfTempPath, {
      format: "jpeg",
      out_dir: imgOutDir,
      out_prefix: "page",
      page: null
    });
    const images = _fs.default
      .readdirSync(imgOutDir)
      .filter((f) => f.endsWith(".jpg"));
    console.log(`Analisando arquivo - ${file}`);
    for (const image of images) {
      const imagePath = _path.default.join(imgOutDir, image);
      const enhancedImagePath = _path.default.join(
        imgOutDir,
        `enhanced-${image}`
      );

      // Processar imagem com Sharp e salvar na mesma pasta temporária
      await (0, _sharp.default)(imagePath)
        .resize(4096)
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({
          quality: 75
        })
        .toFile(enhancedImagePath);

      // OCR na imagem melhorada
      const {
        data: { text }
      } = await worker.recognize(enhancedImagePath);
      console.log(text.trim());
      const matches = text
        .trim()
        .replace(/—/g, "¨")
        .toLowerCase()
        .match(/[Prestador ¨ ]\s*(9\d{7,8}|10\d{6,7})/g);
      progress++;
      console.log(
        `${progress} de ${files.length} analisados | ${filesWithError.length} falhas`
      );
      if (matches && matches.length > 0) {
        const newFileName = `${matches[0].replace(
          /[Prestador ¨ ]\s/g,
          ""
        )}.pdf`;
        const destinationPath = _path.default.resolve(
          outputFolder,
          newFileName
        );
        await _promises.default.copyFile(originalPath, destinationPath);
      } else {
        filesWithError.push(file);
        console.log(`Erro ao ler arquivo ${file}`);
      }
    }
    if (filesWithError.length > 0) {
      const filePath = _path.default.resolve(outputFolder, "falhas.txt");
      for (const file of filesWithError) {
        await _promises.default.appendFile(filePath, `${file}\n`);
      }
    }
  }
  await worker.terminate();
  const finalTime = Date.now();
  const elapsedTime = _dayjs.default.duration(finalTime - initialTime);
  await _promises.default.rm(tempDir, {
    recursive: true,
    force: true
  });
  console.log(
    `Duração do processo: ${elapsedTime.minutes()}:${elapsedTime.seconds()}`
  );
}
const rl = _promises2.default.createInterface({
  input: _nodeProcess.stdin,
  output: _nodeProcess.stdout
});
const inputDir = await rl.question("Qual o caminho da pasta com os PDFs? ");
const outputDir = await rl.question(
  "Qual o nome da pasta para os pdfs renomeados? "
);
rl.close();
extractTextFromPDFsInFolder(
  _path.default.resolve(inputDir),
  _path.default.resolve(outputDir)
);