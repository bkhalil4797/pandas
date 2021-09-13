import { createContext, useContext, useState, useEffect } from "react";
import localforage from "localforage";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";
import { Button, Modal, TextField } from "@material-ui/core";
import LockIcon from "@material-ui/icons/Lock";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import SaveIcon from "@material-ui/icons/Save";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";

const RecognizerContext = createContext();
export const useRecognizer = () => useContext(RecognizerContext);

export const RecognizerContextProvider = ({ children }) => {
  const [recognizer, setRecognizer] = useState();
  const [savedModelList, setSavedModelList] = useState([]);
  const [cachedModel, setCachedModel] = useState([]);
  const [savedWords, setSavedWords] = useState([]);

  const loadRecognizer = async () => {
    let recognizer = SpeechCommands.create("BROWSER_FFT");
    await recognizer.ensureModelLoaded();
    setRecognizer(recognizer);
    console.log(`Google Model Loaded`);
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
    loadRecognizer();
    loadSavedModelsAndWords();
  }, []);

  const [modelName, setModelName] = useState("");
  const [activeRecognizer, setActiveRecognizer] = useState();
  const [unusedSavedWords, setUnusedSavedWords] = useState([]);
  const [modelWord, setModelWord] = useState([]);
  const [countExamples, setCountExamples] = useState([]);
  const [canModify, setCanModify] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const [inputWord, setInputWord] = useState("");
  const epochs = 50;

  const checkModelName = (modelName) => {
    modelName = modelName.trim().toLowerCase();
    if (modelName.length < 2) {
      console.log("must be more than 2 caractere");
      return null;
    }
    const addVersionToModelName = savedModelList.filter(
      (model) => model.substring(0, model.length - 5) === modelName
    );
    if (addVersionToModelName.length > 0) {
      return addVersionToModelName[0];
    }

    if (savedModelList.includes(modelName)) {
      return modelName;
    }

    return `${modelName} v001`;
  };

  const initialLoad = (modelName) => {
    setCanModify(false);
    let transfRec;
    const alreadyCached = cachedModel.filter(
      (model) => model.name === modelName
    );
    if (alreadyCached.length > 0) {
      transfRec = alreadyCached[0].model;
      console.log("model loaded from cache");
    } else if (savedModelList.includes(modelName)) {
      transfRec = recognizer
        .createTransfer(modelName)
        .then(transfRec.load())
        .then(() => {
          setCachedModel([
            ...cachedModel,
            { name: modelName, model: transfRec },
          ]);
          console.log("model loaded from indexedDb");
        });
    } else {
      transfRec = recognizer.createTransfer(modelName);
      setCachedModel([...cachedModel, { name: modelName, model: transfRec }]);
      console.log("model created");
      setModelWord(["_background_noise_"]);
      setUnusedSavedWords(
        savedWords.filter((words) => words !== "_background_noise_")
      );
      setCanModify(true);
      try {
        localforage.getItem("_background_noise_", (err, value) => {
          transfRec.loadExamples(value, false);
        });
      } catch (err) {
        console.log("can't load _background_noise_", err);
      }
    }
    setActiveRecognizer(transfRec);
    try {
      transfRec.wordLabels().then((words) => {
        setModelWord(words);
        setUnusedSavedWords(savedWords.filter((w) => !words.includes(w)));
      });
    } catch (err) {
      console.log("no words", err);
    }
  };

  const modifyModel = (modelName) => {
    if (recognizer === null) {
      console.log("attendez le chargement du modele de google");
      return;
    }
    modelName = checkModelName(modelName);
    if (modelName === null) {
      return;
    }
    initialLoad(modelName);
  };

  const value = {
    savedModelList,
    modifyModel,
  };

  return (
    <RecognizerContext.Provider value={value}>
      {children}
    </RecognizerContext.Provider>
  );
};
