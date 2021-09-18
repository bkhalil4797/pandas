import { createContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";
// import { Button, Modal, TextField } from "@material-ui/core";
// import LockIcon from "@material-ui/icons/Lock";
// import LockOpenIcon from "@material-ui/icons/LockOpen";
// import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
// import HighlightOffIcon from "@material-ui/icons/HighlightOff";
// import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
// import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
// import SaveIcon from "@material-ui/icons/Save";
// import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";

export const RecognizerContext = createContext();

// const epochs = 50;
// const probabilityThreshold = 0.9;

export default function RecognizerContextProvider({ children }) {
  const [recognizer, setRecognizer] = useState();
  const [savedModelList, setSavedModelList] = useState([]);
  const [cachedModel, setCachedModel] = useState([]);
  const [savedWords, setSavedWords] = useState([]);

  const offlineLoadRecognizer = async () => {
    try {
      const metadata = {
        words: [
          "_background_noise_",
          "_unknown_",
          "down",
          "eight",
          "five",
          "four",
          "go",
          "left",
          "nine",
          "no",
          "one",
          "right",
          "seven",
          "six",
          "stop",
          "three",
          "two",
          "up",
          "yes",
          "zero",
        ],
        frameSize: 232,
      };
      let recognizer = SpeechCommands.create(
        "BROWSER_FFT",
        null,
        "indexeddb://speechCommandBaseModel",
        metadata
      );
      await recognizer.ensureModelLoaded();
      setRecognizer(recognizer);
      console.log(`offline Load for speechCommandBaseModel`);
    } catch (err) {
      console.log(
        "offline speechCommandBaseModel not found trying to load it from google server"
      );
      loadRecognizer();
    }
  };

  const loadRecognizer = async () => {
    try {
      let recognizer = SpeechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      setRecognizer(recognizer);
      recognizer.model.save("indexeddb://speechCommandBaseModel");
      console.log(`online Load success`);
    } catch (err) {
      console.log("online Load fail");
    }
  };

  const loadSavedModelsAndWords = async () => {
    const savedModelKeys = await SpeechCommands.listSavedTransferModels();
    setSavedModelList(savedModelKeys);
    const savedWords = await localforage.keys();
    setSavedWords(savedWords);
  };

  useEffect(() => {
    localforage.config({
      driver: localforage.INDEXEDDB,
      name: "SpeechCommand", // db name
      storeName: "SavedWords", // table name
      description: "Speech Command Serialized Exemples", //table description
    });
    offlineLoadRecognizer();
    loadSavedModelsAndWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = { recognizer };
  return (
    <RecognizerContext.Provider value={value}>
      {children}
    </RecognizerContext.Provider>
  );
}
