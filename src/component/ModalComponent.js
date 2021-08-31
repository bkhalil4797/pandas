import { useState, useEffect, useCallback } from "react";
import { useContextProvider } from "../context";
// eslint-disable-next-line no-unused-vars
import * as tf from "@tensorflow/tfjs";
import * as SpeechCommands from "@tensorflow-models/speech-commands";
import localforage from "localforage";
import { Button, Modal, TextField } from "@material-ui/core";
import LockIcon from "@material-ui/icons/Lock";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import SaveIcon from "@material-ui/icons/Save";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";

const epochs = 50;
export const ModalComponent = () => {
  const {
    selectedModel,
    setAlert,
    openModal,
    setOpenModal,
    setCachedModel,
    cachedModel,
    savedModelList,
    recognizer,
    setSelectedModel,
    loadSavedModels,
  } = useContextProvider();

  const [addWord, setAddWord] = useState("");
  const [words, setWords] = useState([]);
  const [savedWords, setSavedWords] = useState([]);
  const [modify, setModify] = useState(false);
  const [countExamples, setCountExamples] = useState({});
  const [currentRecognizer, setCurrentRecognizer] = useState();

  const initialLoad = useCallback(async () => {
    const alreadyLoaded = cachedModel.filter(
      (model) => model.name === selectedModel
    );
    if (alreadyLoaded.length > 0) {
      setCurrentRecognizer(alreadyLoaded[0].model);
      console.log("Model loaded from cache");
      const transfWord = await alreadyLoaded[0].model.wordLabels();
      // In case where we CREATE (it mean it is not saved)
      // a model for the second time with the same name
      // in case the model doesn't have any word
      if (transfWord !== null) {
        setWords(transfWord);
        try {
          setCountExamples(await alreadyLoaded[0].model.countExamples());
        } catch (err) {
          console.log("initial load cout exemple error 'nothing to worry'");
        }
      }
    } else if (savedModelList.includes(selectedModel)) {
      const transfRec = recognizer.createTransfer(selectedModel);
      await transfRec.load();
      setCurrentRecognizer(transfRec);
      setCachedModel([
        ...cachedModel,
        { name: selectedModel, model: transfRec },
      ]);
      console.log("Model loaded from indexeddb");
      const transfWord = await transfRec.wordLabels();
      setWords(transfWord);
    } else {
      const transfRec = recognizer.createTransfer(selectedModel);
      setCurrentRecognizer(transfRec);
      setCachedModel([
        ...cachedModel,
        { name: selectedModel, model: transfRec },
      ]);
      setAlert({
        open: true,
        severity: "success",
        msg: `Le modele ${selectedModel
          .substring(0, 1)
          .toUpperCase()}${selectedModel.substring(
          1,
          selectedModel.length - 5
        )} a été créer`,
      });
      console.log("Model created");
    }
    const savedWord = await localforage.keys();
    setSavedWords(savedWord);
    if (!savedModelList.includes(selectedModel)) {
      setModify(true);
    }
  }, [
    cachedModel,
    recognizer,
    savedModelList,
    selectedModel,
    setAlert,
    setCachedModel,
  ]);

  const handleCancel = useCallback(() => {
    setOpenModal(false);
    setSelectedModel("");
  }, [setOpenModal, setSelectedModel]);

  useEffect(() => {
    initialLoad();
    return () => handleCancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const myWord = addWord.trim().toLowerCase();
    if (!modify) {
      return;
    }
    if (myWord.length === 0) {
      setAlert({
        open: true,
        severity: "error",
        msg: "Le mot doit en moins contenir une lettre",
      });
      return;
    }
    if (words.includes(myWord)) {
      setAlert({
        open: true,
        severity: "warning",
        msg: "Le mot existe deja ",
      });
      setAddWord("");
      return;
    }
    if (savedWords.includes(myWord)) {
      await localforage.getItem(myWord, (err, value) => {
        if (err) {
          console.log(err);
        }
        currentRecognizer.loadExamples(value, false);
      });
      setSavedWords(savedWords.filter((saved) => saved !== myWord));
      setWords([...words, myWord]);
      setCountExamples(await currentRecognizer.countExamples());
      setAddWord("");
      return;
    }

    setWords([...words, myWord]);
    setAddWord("");
  };

  const handleModify = async () => {
    if (modify) {
      return;
    }
    setModify(!modify);
    let version = Number(
      selectedModel.substring(selectedModel.length - 3, selectedModel.length)
    );
    version = version + 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const newModelName = `${selectedModel.substring(
      0,
      selectedModel.length - 5
    )} v${version}`;
    setSelectedModel(newModelName);

    // the real deal to create a new transfert
    try {
      const alreadyLoaded = cachedModel.filter(
        (model) => model.name === newModelName
      );
      let transfRec;
      if (alreadyLoaded.length > 0) {
        transfRec = alreadyLoaded[0].model;
        setCurrentRecognizer(alreadyLoaded[0].model);
        await transfRec.clearExamples();
        console.log("Model loaded from cache");
      } else {
        transfRec = recognizer.createTransfer(newModelName);
        setCurrentRecognizer(transfRec);
        setCachedModel([
          ...cachedModel,
          { name: newModelName, model: transfRec },
        ]);
      }
      const transfWord = await currentRecognizer.wordLabels();
      setWords(transfWord);
      // this variable is here because state are asynchronous
      // so we can't use savedWords
      let savedWord = savedWords;
      for (let word of transfWord) {
        savedWord = savedWord.filter((saved) => saved !== word);
        await localforage.getItem(word, (err, value) => {
          if (err) {
            console.log(err);
          }
          console.log(`${word} loaded`);
          transfRec.loadExamples(value, false);
        });
      }
      setSavedWords(savedWord);
      setCountExamples(await transfRec.countExamples());
    } catch (err) {
      console.log(err);
      console.log("modify error");
    }
  };

  const handleDelete = async () => {
    if (!modify) {
      return;
    }
    let version = Number(
      selectedModel.substring(selectedModel.length - 3, selectedModel.length)
    );
    version = version - 1;
    version = String(version);
    for (let i = version.length; i < 3; i++) {
      version = "0" + version;
    }
    const oldModelName = `${selectedModel.substring(
      0,
      selectedModel.length - 5
    )} v${version}`;
    if (savedModelList.includes(oldModelName)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(oldModelName);
        handleCancel(); //exit modal
        loadSavedModels();
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
    if (savedModelList.includes(selectedModel)) {
      try {
        await SpeechCommands.deleteSavedTransferModel(selectedModel);
        handleCancel(); //exit modal
        loadSavedModels();
      } catch (err) {
        console.log(err);
        console.log("Delete model error");
      }
    }
  };

  const handleSave = async () => {
    if (!modify) {
      return;
    }
    try {
      await currentRecognizer.train({
        epochs,
        callback: {
          onEpochEnd: async (epoch, logs) => {
            console.log(
              `Epoch ${epoch}: loss=${logs.loss}, accuracy=${logs.acc}`
            );
          },
        },
      });
      await currentRecognizer.save();
      console.log(`saved ${selectedModel}`);
      let realWods = [];
      for (let word in countExamples) {
        realWods = [...realWods, word];
      }
      setWords(realWods);
      for (let word of realWods) {
        const serialized = currentRecognizer.serializeExamples(word);
        localforage.setItem(word, serialized).then(console.log(`${word} done`));
      }
    } catch (err) {
      setAlert({
        open: true,
        severity: "error",
        msg: "Vous devais en moins avoir 2 mot avec des exemples par modele",
      });
      console.log(err);
      return;
    }
    let version = Number(
      selectedModel.substring(selectedModel.length - 3, selectedModel.length)
    );
    if (version === 1) {
      // do nothing
    } else {
      // delete old version to not have multiple version of the same model
      version = version - 1;
      version = String(version);
      for (let i = version.length; i < 3; i++) {
        version = "0" + version;
      }
      const oldModelName = `${selectedModel.substring(
        0,
        selectedModel.length - 5
      )} v${version}`;
      if (savedModelList.includes(oldModelName)) {
        try {
          await SpeechCommands.deleteSavedTransferModel(oldModelName);
          console.log(`delete ${oldModelName}`);
        } catch (err) {
          console.log(err);
          console.log("Delete model error");
        }
      }
    }
    loadSavedModels();
  };

  const handleTransfertWord = async (savedWord) => {
    if (!modify) {
      return;
    }
    await localforage.getItem(savedWord, (err, value) => {
      if (err) {
        console.log(err);
      }
      currentRecognizer.loadExamples(value, false);
    });
    setSavedWords(savedWords.filter((word) => word !== savedWord));
    setWords([...words, savedWord]);
    setCountExamples(await currentRecognizer.countExamples());
  };

  const handleDeleteWord = async (selectedWord) => {
    if (!modify) {
      return;
    }
    try {
      const exemples = currentRecognizer.getExamples(selectedWord);
      for (let index in exemples) {
        await currentRecognizer.removeExample(exemples[index].uid);
      }
    } catch (err) {
      setAlert({
        open: true,
        severity: "error",
        msg: `Une erreur est survenue`,
      });
      console.log(err);
    }
    setWords(words.filter((word) => word !== selectedWord));
    setSavedWords([...savedWords, selectedWord]);
  };

  const handleAddWord = async (selectedWord) => {
    if (!modify) {
      return;
    }
    try {
      await currentRecognizer.collectExample(selectedWord);
      setCountExamples(await currentRecognizer.countExamples());
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Modal
      open={openModal}
      onClose={() => handleCancel()}
      className="modal__Container"
    >
      <div className="modal__visible">
        <div>
          <h1>
            Modele :
            {`${selectedModel
              .substring(0, 1)
              .toUpperCase()}${selectedModel.substring(
              1,
              selectedModel.length - 5
            )}`}
            {modify ? <LockOpenIcon /> : <LockIcon />}
          </h1>
          <p>Version : {selectedModel}</p>
        </div>

        <div className="modifymodel__main">
          <div>
            <TextField
              label="Ajouter un mot"
              value={addWord}
              onChange={(e) => setAddWord(e.target.value)}
              disabled={!modify}
            />
            <Button variant="outlined" disabled={!modify} onClick={handleAdd}>
              <AddCircleOutlineOutlinedIcon />
              Ajouter
            </Button>
          </div>

          <div className="modifymodel__words">
            <div>
              <p>Mot du modele</p>
              {words.length > 0 ? (
                words.map((word) => (
                  <div key={word}>
                    <Button
                      variant="outlined"
                      onClick={() => handleAddWord(word)}
                      disabled={!modify}
                    >
                      {word} ({countExamples[word] ? countExamples[word] : 0})
                    </Button>
                    <Button
                      onClick={() => handleDeleteWord(word)}
                      disabled={!modify}
                    >
                      <HighlightOffIcon />
                    </Button>
                  </div>
                ))
              ) : (
                <p>Aucun mot existant</p>
              )}
            </div>
            {modify && (
              <div>
                <p>Ajouter un mot déja utilisé</p>
                {savedWords.length > 0 ? (
                  savedWords.map((word) => (
                    <div key={word}>
                      <Button
                        variant="outlined"
                        onClick={() => handleTransfertWord(word)}
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
          <Button variant="outlined" disabled={modify} onClick={handleModify}>
            <AssignmentTurnedInOutlinedIcon />
            Modifier
          </Button>
          <Button variant="outlined" disabled={!modify} onClick={handleDelete}>
            <DeleteForeverIcon />
            Supprimer
          </Button>
          <Button variant="outlined" disabled={!modify} onClick={handleSave}>
            <SaveIcon />
            Enregistrer
          </Button>
          <Button variant="outlined" disabled={!modify} onClick={handleCancel}>
            <CancelOutlinedIcon />
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
