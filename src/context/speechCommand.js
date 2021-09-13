import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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

const UNKNOWN_TAG = "_unknown_";
const epochs = 50;
const probabilityThreshold = 0.9;

export const RecognizerContextProvider = ({ children }) => {
  const [recognizer, setRecognizer] = useState();
  const [savedModelList, setSavedModelList] = useState([]);
  const [cachedModel, setCachedModel] = useState([]);
  const [savedWords, setSavedWords] = useState([]);

  const loadRecognizer = async () => {
    try {
      let recognizer = SpeechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      setRecognizer(recognizer);
      console.log(`Google Model Loaded`);
    } catch (err) {
      console.log("can't load google model", err);
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
  const [recognizerResult, setRecognizerResult] = useState([]);
  const [inputWord, setInputWord] = useState("");

  const [timer, setTimer] = useState(0);

  const checkName = (modelName) => {
    if (modelName.length < 3) {
      console.log("modelName must be at least 3 character length");
      return null;
    }
    const addVersionToModelName = savedModelList.filter(
      (models) => models.substring(0, models.length - 5) === modelName
    );
    if (addVersionToModelName.length > 0) {
      return addVersionToModelName[0];
    } else if (savedModelList.includes(modelName)) {
      return modelName;
    }
    const correctedVersion = savedModelList.filter(
      (models) =>
        models.substring(0, models.length - 5) ===
        modelName.substring(0, modelName.length - 5)
    );
    if (correctedVersion.length > 0) {
      return correctedVersion[0];
    }
    console.log("model does not exist");
    return null;
  };

  const loadModel = async (modelName) => {
    let transfRec;
    const alreadyCached = cachedModel.filter(
      (model) => model.name === modelName
    );
    if (alreadyCached.length > 0) {
      transfRec = alreadyCached[0].model;
      console.log("model loaded from cache");
    } else {
      transfRec = recognizer.createTransfer(modelName);
      await transfRec.load();
      setCachedModel([...cachedModel, { name: modelName, model: transfRec }]);
      console.log("model loaded from indexedDb");
    }
    setActiveRecognizer(transfRec);
    return transfRec;
  };

  // unfinished timer logic <--------------------------------------------------
  const recognize = async (
    modelName,
    duration = 10,
    stopAtOneWord = true,
    frameSize = 900
  ) => {
    const overlap = 1 - frameSize / 1000;
    if (overlap > 1 || overlap < 0) {
      console.log("bad value for frameSize");
      return;
    }
    if (duration < 3) {
      console.log("duration must be at least 3 second");
      return;
    }
    stopRecognize();
    modelName = modelName.trim().toLowerCase();
    modelName = checkName(modelName);
    if (modelName === null) {
      return;
    }
    const transfRec = await loadModel(modelName);
    const words = transfRec.wordLabels();
    setTimer(duration);
    transfRec.listen(
      ({ scores }) => {
        scores = Array.from(scores).map((s, i) => ({
          score: s,
          word: words[i],
        }));
        scores.sort((s1, s2) => s2.score - s1.score);
        console.log(scores[0].word);
        if (scores[0].word !== "_background_noise_") {
          setRecognizerResult([...recognizerResult, scores[0].word]);
        }
        if (stopAtOneWord && scores[0].word !== "_background_noise_") {
          transfRec.stopListening();
          setTimer(0);
        }
      },
      {
        overlapFactor: overlap,
        probabilityThreshold: probabilityThreshold,
        invokeCallbackOnNoiseAndUnknown: true,
      }
    );
  };

  const stopRecognize = useCallback(async () => {
    if (recognizer === undefined) {
      console.log("Google Model not loaded yet");
      return;
    }
    if (activeRecognizer && activeRecognizer.isListening()) {
      await activeRecognizer.stopListening();
      setTimer(0);
    }
  }, [activeRecognizer, recognizer]);

  //clearTimeOut <-------------------------------------------------
  useEffect(() => {
    if (timer === 0) {
      return;
    }
    const ref = setTimeout(() => {
      stopRecognize();
    }, timer * 1000);
    return () => {
      setTimer(0);
      clearTimeout(ref);
    };
  }, [timer, stopRecognize]);

  const createModel = async (modelName) => {
    let transfRec;
    modelName = `${modelName} v001`;

    const alreadyCached = cachedModel.filter(
      (model) => model.name === modelName
    );
    if (alreadyCached.length > 0) {
      transfRec = alreadyCached[0].model;
      console.log("model created from cache");
    } else {
      transfRec = recognizer.createTransfer(modelName);
      setCachedModel([...cachedModel, { name: modelName, model: transfRec }]);
      console.log("model created");
    }
    setActiveRecognizer(transfRec);
    setCanModify(true);
    setModelName(modelName);
    try {
      const words = transfRec.wordLabels();
      setModelWord(words);
      setCountExamples(await transfRec.countExamples());
      setUnusedSavedWords(savedWords.filter((word) => !words.includes(word)));
    } catch (err) {
      setModelWord(["_background_noise_"]);
      setUnusedSavedWords(
        savedWords.filter((word) => word !== "_background_noise_")
      );
      if (savedWords.includes("_background_noise_")) {
        await localforage.getItem("_background_noise_", (err, value) => {
          if (err) {
            console.log("can't load '_background_noise_'");
          }
          transfRec.loadExamples(value, false);
        });
        setCountExamples(await transfRec.countExamples());
      }
    }
  };

  const modifyModel = async (modelName) => {
    if (recognizer === undefined) {
      console.log("Google Model not loaded yet");
      return;
    }
    modelName = modelName.trim().toLowerCase();
    const alreadyExist = checkName(modelName);
    if (alreadyExist === null && modelName.length >= 3) {
      createModel(modelName);
    } else if (alreadyExist === null && modelName.length < 3) {
      console.log("Model Name too short");
      return;
    } else {
      const transfRec = await loadModel(alreadyExist);
      setCanModify(false);
      setModelName(alreadyExist);
      const words = await transfRec.wordLabels();
      setModelWord(words);
      setUnusedSavedWords(savedWords.filter((word) => !words.includes(word)));
    }
    setOpenModal(true);
  };

  const closeModifyModel = () => {
    setModelName("");
    setOpenModal(false);
    setCanModify(false);
    setModelWord([]);
    setCountExamples([]);
    setInputWord("");
  };

  const deleteModel = async () => {
    if (!canModify) {
      return;
    }
    if (savedModelList.includes(modelName)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(modelName);
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
    // le cas l'utilisateur click sur modify pour ensuite essayer de supprimer le model
    let version = Number(
      modelName.substring(modelName.length - 3, modelName.length)
    );
    version = version - 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const oldModelName = `${modelName.substring(
      0,
      modelName.length - 5
    )} v${version}`;
    if (savedModelList.includes(oldModelName)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(oldModelName);
      } catch (err) {
        console.log(err);
        console.log("Delete old model error");
      }
    }
    loadSavedModelsAndWords();
  };
  const collectExample = async (word) => {
    if (!canModify) {
      return;
    }
    try {
      await activeRecognizer.collectExample(word);
      setCountExamples(await activeRecognizer.countExamples());
    } catch (err) {
      console.log(err);
    }
  };
  const addWord = async () => {
    if (!canModify) {
      return;
    }
    const word = inputWord.trim().toLowerCase();
    setInputWord("");
    if (word.length === 0) {
      console.log("a word can't be empty string");
      return;
    } else if (modelWord.includes(word)) {
      return; // it already exist so do nothing
    } else if (savedWords.includes(word)) {
      await localforage.getItem(word, (err, value) => {
        if (err) {
          console.log(err);
        }
        activeRecognizer.loadExamples(value, false);
      });
      setUnusedSavedWords(unusedSavedWords.filter((w) => w !== word));
      setModelWord([...modelWord, word]);
      setCountExamples(await activeRecognizer.countExamples());
      return;
    } else {
      setModelWord([...modelWord, word]);
    }
  };
  const tranfertWord = async (word) => {
    if (!canModify) {
      return;
    }
    await localforage.getItem(word, (err, value) => {
      if (err) {
        console.log("can't add the word");
      }
      activeRecognizer.loadExamples(value, false);
    });
    setUnusedSavedWords(unusedSavedWords.filter((w) => w !== word));
    setModelWord([...modelWord, word]);
    setCountExamples(await activeRecognizer.countExamples());
  };
  const removeWord = async (word) => {
    if (!canModify) {
      return;
    }

    setModelWord(modelWord.filter((w) => w !== word));
    try {
      const datasetOfWord = activeRecognizer.getExamples(word);
      for (let index in datasetOfWord) {
        await activeRecognizer.removeExample(datasetOfWord[index].uid);
      }
      if (savedWords.includes(word)) {
        setUnusedSavedWords([...unusedSavedWords, word]);
      }
    } catch (err) {
      console.log(err);
      throw new Error("ERREUR delete word");
    }
  };
  const saveModel = async () => {
    if (!canModify) {
      return;
    }
    try {
      await activeRecognizer.train({
        epochs,
        callback: {
          onEpochEnd: async (epoch, logs) => {
            console.log(
              `Epoch ${epoch}: loss=${logs.loss}, accuracy=${logs.acc}`
            );
          },
        },
      });
      await activeRecognizer.save();
      // dans le cas ou il y a des mot sans exemple ils seront enlevé
      const wordList = activeRecognizer.wordLabels();
      setModelWord(wordList);
      for (let word of wordList) {
        const serialized = activeRecognizer.serializeExamples(word);
        localforage.setItem(word, serialized).then(console.log(`${word} done`));
      }
      // then if we modify a model we will delete the old since we have this now
      let version = Number(
        modelName.substring(modelName.length - 3, modelName.length)
      );
      if (version === 1) {
        return;
      } else {
        version = version - 1;
        version = String(version);
        for (let i = version.length; i < 3; i++) {
          version = "0" + version;
        }
        const oldModelName = `${modelName.substring(
          0,
          modelName.length - 5
        )} v${version}`;
        deleteModel(oldModelName);
      }
    } catch (err) {
      console.log(err);
    }
  };
  const enableModify = async () => {
    if (canModify) {
      return;
    }
    let version = Number(
      modelName.substring(modelName.length - 3, modelName.length)
    );
    version = version + 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const newModelName = `${modelName.substring(
      0,
      modelName.length - 5
    )} v${version}`;
    console.log(newModelName);
    const wordsList = modelWord;
    setModelName(newModelName);
    setCanModify(true);
    let transfRec;
    const alreadyCached = cachedModel.filter(
      (model) => model.name === newModelName
    );
    if (alreadyCached.length > 0) {
      transfRec = alreadyCached[0].model;
      console.log("model loaded from cache");
      const words = await transfRec.wordLabels();
      setModelWord(words);
      setCountExamples(await transfRec.countExamples());
      setUnusedSavedWords(savedWords.filter((w) => !words.includes(w)));
    } else {
      transfRec = recognizer.createTransfer(newModelName);
      setCachedModel([
        ...cachedModel,
        { name: newModelName, model: transfRec },
      ]);
      console.log("model created");
      setUnusedSavedWords(savedWords.filter((w) => !wordsList.includes(w)));
      for (let word of wordsList) {
        await localforage.getItem(word, (err, value) => {
          if (err) {
            console.log(err);
          }
          console.log(`${word} loaded`);
          transfRec.loadExamples(value, false);
        });
      }
      setActiveRecognizer(transfRec);
      setModelWord(await transfRec.wordLabels());
      setCountExamples(await transfRec.countExamples());
    }
  };

  const value = {
    recognize,
    modifyModel,
    savedModelList,
    recognizerResult,
    stopRecognize,
  };
  return (
    <RecognizerContext.Provider value={value}>
      {children}

      <Modal
        open={openModal}
        onClose={closeModifyModel}
        className="modal__Container"
      >
        <div className="modal__visible">
          <div>
            <h1>
              Modele :
              {`${modelName.substring(0, 1).toUpperCase()}${modelName.substring(
                1,
                modelName.length - 5
              )}`}
              {canModify ? <LockOpenIcon /> : <LockIcon />}
            </h1>
            <p>Version : {modelName}</p>
          </div>

          <div className="modifymodel__main">
            <div>
              <TextField
                label="Ajouter un mot"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                disabled={!canModify}
              />
              <Button
                variant="outlined"
                disabled={!canModify}
                onClick={addWord}
              >
                <AddCircleOutlineOutlinedIcon />
                Ajouter
              </Button>
            </div>

            <div className="modifymodel__words">
              <div>
                <p>Mot du modele</p>
                {modelWord.length > 0 ? (
                  modelWord.map((word) => (
                    <div key={word}>
                      <Button
                        variant="outlined"
                        onClick={() => collectExample(word)}
                        disabled={!canModify}
                      >
                        {word} ({countExamples[word] ? countExamples[word] : 0})
                      </Button>
                      <Button
                        onClick={() => removeWord(word)}
                        disabled={!canModify}
                      >
                        <HighlightOffIcon />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p>Aucun mot existant</p>
                )}
              </div>
              {canModify && (
                <div>
                  <p>Ajouter un mot déja utilisé</p>
                  {unusedSavedWords.length > 0 ? (
                    unusedSavedWords.map((word) => (
                      <div key={word}>
                        <Button
                          variant="outlined"
                          onClick={() => tranfertWord(word)}
                        >
                          {word}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p>Aucun mot enregistrer</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modifymodel__footer">
            <Button
              variant="outlined"
              disabled={canModify}
              onClick={enableModify}
            >
              <AssignmentTurnedInOutlinedIcon />
              Modifier
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={deleteModel}
            >
              <DeleteForeverIcon />
              Supprimer
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={saveModel}
            >
              <SaveIcon />
              Enregistrer
            </Button>
            <Button
              variant="outlined"
              disabled={!canModify}
              onClick={closeModifyModel}
            >
              <CancelOutlinedIcon />
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </RecognizerContext.Provider>
  );
};