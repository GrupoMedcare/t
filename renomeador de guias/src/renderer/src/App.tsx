
import { useEffect, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");
  const [progress, setProgress] = useState("")
  useEffect(() => {
    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer!.dropEffect = "copy";
    };

    const handleDrop = (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          window.electron.showFilePath(file);
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(()=> {
    window.electron.ipcRenderer.on("file-parsed", (e, p)=> setProgress(p))
    return ()=> window.electron.ipcRenderer.removeAllListeners("file-parsed")
  }, [])


  return (
    <>
       <Header/>
       <main className="grid grid-cols-[.2fr_auto] h-[90vh]">
       <Sidebar/>
       </main>
    </>
  );
}

export default App;
