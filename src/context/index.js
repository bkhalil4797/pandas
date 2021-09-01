import { createContext, useContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";

import MuiAlert from "@material-ui/lab/Alert";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  Snackbar,
} from "@material-ui/core";
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
  const [openDialog, setOpenDialog] = useState(false);
  const [micId, setMicId] = useState("");
  const [selectDialog, setSelectDialog] = useState("null");
  const [recResult, setRecResult] = useState("");

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

  const closeDialog = () => {
    setOpenDialog(false);
    setMicId("");
    setSelectDialog("null");
  };
  const confirmDialog = () => {
    console.log(selectDialog);
    if (selectDialog === "null" || selectDialog === null) {
      setAlert({
        open: true,
        severity: "warning",
        msg: "veuillez selectionnez un modele",
      });
    } else {
      localStorage.setItem(micId, selectDialog);
      closeDialog();
    }
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
    openDialog,
    setOpenDialog,
    micId,
    setMicId,
    setSelectDialog,
    recResult,
    setRecResult,
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

      {/* --------------------------------------------------- */}
      {/*        Partie mettre un model pour un mic           */}
      {/* --------------------------------------------------- */}
      {openDialog && (
        <Dialog
          open={openDialog}
          onClose={closeDialog}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle>Creation d'un modele</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Veuillez choisir un modele l'imnput "{micId}"
            </DialogContentText>
            <Select
              fullWidth
              displayEmpty
              defaultValue="null"
              value={selectDialog}
              onChange={(e) => setSelectDialog(e.target.value)}
            >
              <MenuItem value="null">
                <em>None</em>
              </MenuItem>
              {savedModelList.map((model) => (
                <MenuItem value={model} key={model}>
                  {model.substring(0, model.length - 5)}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button color="primary" onClick={closeDialog}>
              Annuler
            </Button>
            <Button color="primary" onClick={confirmDialog}>
              valider
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Context.Provider>
  );
};

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
