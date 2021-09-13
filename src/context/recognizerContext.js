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
  const [recognizerResult, setRecognizerResult] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const [inputWord, setInputWord] = useState("");
  const epochs = 50;

  const initialLoad = async (modelName) => {
    if (modelName === "") {
      return;
    }
    console.log(modelName);

    // if bad model name we correct it or if it doesn't exist we create it
    // bad name mean incorrect version or the version is ommited
    if (!savedModelList.includes(modelName)) {
      const savedModelListWithoutVersion = savedModelList.map((w) =>
        w.substring(0, w.length - 5)
      );
      console.log(savedModelListWithoutVersion);

      // wrong version so we auto update version if we got the wrong version exemple like when we get an old version
      // when the version is omitted we get it
      if (savedModelListWithoutVersion.includes(modelName)) {
        setModelName(
          savedModelList.filter(
            (models) => models.substring(0, models.length - 5) === modelName
          )[0]
        );
        modelName = savedModelList.filter(
          (models) => models.substring(0, models.length - 5) === modelName
        )[0];
        console.log(modelName);

        initialLoad(modelName);
        return;
      }
      // we load the model since it exist in indexedDb
      else {
        let transfRec;
        const newName = `${modelName} v001`;
        setModelName(newName);
        const alreadyInCache = cachedModel.filter(
          (model) => model.name === newName
        );
        if (alreadyInCache.length > 0) {
          transfRec = alreadyInCache[0].model;
          console.log("model created from cache");
        } else {
          transfRec = recognizer.createTransfer(newName);
          setCachedModel([...cachedModel, { name: newName, model: transfRec }]);
          console.log("model created from scratch");
        }
        setModelWord(["_background_noise_"]);
        setUnusedSavedWords(savedWords);
        setActiveRecognizer(transfRec);
        setCanModify(true);
        if (savedWords.includes("_background_noise_")) {
          await localforage.getItem("_background_noise_", (err, value) => {
            if (err) {
              throw new Error("can't add the word");
            }
            transfRec.loadExamples(value, false);
          });
        }
        return transfRec;
      }
    } // if the model is already saved
    else {
      let transfRec;
      const alreadyInCache = cachedModel.filter(
        (model) => model.name === modelName
      );
      if (alreadyInCache.length > 0) {
        transfRec = alreadyInCache[0].model;
        console.log("model loaded from cache");
      } else {
        transfRec = recognizer.createTransfer(modelName);
        await transfRec.load();
        setCachedModel([...cachedModel, { name: modelName, model: transfRec }]);
        console.log("model loaded from indexedDb");
      }
      setActiveRecognizer(transfRec);
      const words = await transfRec.wordLabels();
      setModelWord(words);
      setUnusedSavedWords(savedWords.filter((w) => !words.includes(w)));
      setCanModify(false);
      return transfRec;
    }
  };

  const stopRecognize = async () => {
    if (activeRecognizer && activeRecognizer.isListening()) {
      await activeRecognizer.stopListening();
    }
  };

  // healper fct
  const loadModel = async (modelName) => {
    // dans le cas ou il y  a une mauvaise version ou qu'on oublie de mettre une version
    if (!savedModelList.includes(modelName)) {
      const savedModelListWithoutVersion = savedModelList.map((w) =>
        w.substring(0, modelName.length - 5)
      );
      const modelNameWithoutVersion = modelName.substring(
        0,
        modelName.length - 5
      );
      if (savedModelListWithoutVersion.includes(modelNameWithoutVersion)) {
        modelName = savedModelList.filter(
          (models) =>
            models.substring(0, models.length - 5) ===
            modelName.substring(0, models.length - 5)
        )[0];
      }
      // when the version is omitted we get it
      else if (savedModelListWithoutVersion.includes(modelName)) {
        modelName = savedModelList.filter(
          (models) => models.substring(0, models.length - 5) === modelName
        )[0];
      } else {
        console.log("Le modele n'existe pas ");
        return;
      }
    }
    let transfRec;
    const alreadyInCache = cachedModel.filter(
      (model) => model.name === modelName
    );
    if (alreadyInCache.length > 0) {
      transfRec = alreadyInCache[0].model;
      console.log("model loaded from cache");
    } else {
      transfRec = recognizer.createTransfer(modelName);
      await transfRec.load();
      setCachedModel([...cachedModel, { name: modelName, model: transfRec }]);
      console.log("model loaded from indexedDb");
    }
    setActiveRecognizer(transfRec);
    const words = await transfRec.wordLabels();
    return { transfRec, words };
  };

  const startRecognize = async (
    modelName,
    recognizeOneWord = false,
    duree = 0,
    frameSize = 500
  ) => {
    const overlap = 1 - frameSize / 1000;
    if (overlap > 1 || overlap < 0) {
      console.log("La valeur du paramettre frameSize est incorrect");
      return;
    }
    if (duree < 0) {
      console.log("La durée ne doit pas etre negatif");
      return;
    }
    const { transfRec, words } = await loadModel(modelName);
    if (words.length === 0) {
      console.log("ce modele ne peut pas etre utilisé il ne possede aucun mot");
      return;
    }

    transfRec.listen(
      ({ scores }) => {
        const words = transfRec.wordLabels();
        scores = Array.from(scores).map((s, i) => ({
          score: s,
          word: words[i],
        }));
        scores.sort((s1, s2) => s2.score - s1.score);
        setRecognizerResult([...recognizerResult, scores]);
        if (recognizeOneWord) {
          transfRec.stopListening(); //state are async so we can't use activeRecognizer
        }
      },
      {
        overlapFactor: overlap,
        includeSpectrogram: true,
        probabilityThreshold: 0.9,
        invokeCallbackOnNoiseAndUnknown: true,
      }
    );
    if (duree > 0 && !recognizeOneWord) {
      setTimeout(() => {
        stopRecognize();
      }, duree * 1000);
    }
  };

  const modifyModel = (name) => {
    if (recognizer === null) {
      console.log("attendez le chargement du modele de google");
      return;
    }
    name = name.trim().toLowerCase();
    setCanModify(false);
    setModelName(name);
    initialLoad(name);
    setOpenModal(true);
  };

  const closeModifyModel = () => {
    setModelName("");
    setOpenModal(false);
    setCanModify(false);
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
        console.log("Delete model error");
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
      // dans le cas ou il y a des mot sans exemple il seront enlever
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

  const addWord = async () => {
    if (!canModify) {
      return;
    }
    const word = inputWord.trim().toLowerCase();
    setInputWord("");
    if (word.length === 0) {
      throw new Error("a word can't be empty string");
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
        throw new Error("can't add the word");
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
    const transfRec = await initialLoad(newModelName);
    setUnusedSavedWords(unusedSavedWords.filter((w) => !wordsList.includes(w)));
    for (let word of wordsList) {
      await localforage.getItem(word, (err, value) => {
        if (err) {
          console.log(err);
        }
        console.log(`${word} loaded`);
        transfRec.loadExamples(value, false);
      });
    }
    setModelWord(await transfRec.wordLabels());
    setCountExamples(await transfRec.countExamples());
  };

  const value = {
    startRecognize,
    stopRecognize,
    recognizerResult,
    savedModelList,
    modifyModel,
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
