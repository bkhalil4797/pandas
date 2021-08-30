import { createContext, useContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";

import MuiAlert from "@material-ui/lab/Alert";
import { Snackbar } from "@material-ui/core";
import { ModalComponent } from "../component/ModalComponent";

const Context = createContext();
export const useContextProvider = () => useContext(Context);

export const ContextProvider = ({ children }) => {
  const [recognizer, setRecognizer] = useState();
  const [savedModelList, setSavedModelList] = useState([]);
  const [cachedModel, setCachedModel] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [activeRecognizer, setActiveRecognizer] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [alert, setAlert] = useState({
    open: false,
    severity: "error",
    msg: "",
  });

  const loadRecognizer = async () => {
    let recognizer = SpeechCommands.create("BROWSER_FFT");
    await recognizer.ensureModelLoaded();
    setRecognizer(recognizer);
    console.log(`Google Model Loaded`);
  };

  const loadSavedModels = async () => {
    const savedModelKeys = await SpeechCommands.listSavedTransferModels();
    setSavedModelList(savedModelKeys);
  };

  useEffect(() => {
    localforage.config({
      driver: localforage.INDEXEDDB,
      name: "SpeechCommand",
      storeName: "SavedWords",
      description: "Speech Command Serialized Exemples",
    });
    loadRecognizer();
    loadSavedModels();
  }, []);

  const value = {
    recognizer,
    savedModelList,
    loadSavedModels,
    cachedModel,
    setCachedModel,
    isListening,
    setIsListening,
    activeRecognizer,
    setActiveRecognizer,
    alert,
    setAlert,
    openModal,
    setOpenModal,
    setSelectedModel,
    selectedModel,
  };

  return (
    <Context.Provider value={value}>
      {children}

      {/* --------------------------------------------------- */}
      {/*          Partie snackbars pour les alerts           */}
      {/* --------------------------------------------------- */}
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
        >
          {alert.msg}
        </Alert>
      </Snackbar>

      {/* --------------------------------------------------- */}
      {/*        Partie modal pour modifier un modele         */}
      {/* --------------------------------------------------- */}
      {recognizer !== undefined && openModal && <ModalComponent />}
    </Context.Provider>
  );
};

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
