import MicOffIcon from "@material-ui/icons/MicOff";
import MicIcon from "@material-ui/icons/Mic";
import { useState, useEffect, useRef } from "react";
import { useContextProvider } from "../context";
import { TextField } from "@material-ui/core";

export const Mic = ({ id = "" }) => {
  const {
    isListening,
    setIsListening,
    activeRecognizer,
    setActiveRecognizer,
    recognizer,
    cachedModel,
    setCachedModel,
    setOpenDialog,
    setMicId,
    setAlert,
  } = useContextProvider();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem(id));
  const myInput = useRef();

  useEffect(() => {
    setModel(localStorage.getItem(id));
  }, [id, model]);

  const handleClick = async () => {
    if (recognizer === undefined) {
      setAlert({
        open: true,
        severity: "info",
        msg: `Veuillez réessayer dans quelque instant`,
      });
      return;
    }
    if (model === null) {
      if (localStorage.getItem(id) === null) {
        setOpenDialog(true);
        setMicId(id);
        return;
      } else {
        setModel(localStorage.getItem(id));
      }
    }
    if (!isListening && !open) {
      console.log("start mic");
      setIsListening(true);
      setOpen(true);
      try {
        const alreadyLoaded = cachedModel.filter((obj) => obj.name === model);
        let transfRec;
        if (alreadyLoaded.length > 0) {
          transfRec = alreadyLoaded[0].model;
          setActiveRecognizer(transfRec);
          console.log(`Model "${model}" loaded from cache`);
        } else {
          transfRec = recognizer.createTransfer(model);
          await transfRec.load();
          setActiveRecognizer(transfRec);
          setCachedModel([...cachedModel, { name: model, model: transfRec }]);
          console.log(`Model "${model}" loaded from indexedDb`);
        }
        const words = transfRec.wordLabels();
        transfRec.listen(
          ({ scores }) => {
            scores = Array.from(scores).map((s, i) => ({
              score: s,
              word: words[i],
            }));
            scores.sort((s1, s2) => s2.score - s1.score);
            console.log(`1:${scores[0]?.word}`);
            myInput.current.lastChild.lastChild.value = `${myInput.current.lastChild.lastChild.value} ${scores[0]?.word}`;
          },
          {
            includeSpectrogram: true,
            probabilityThreshold: 0.9,
            invokeCallbackOnNoiseAndUnknown: true,
          }
        );
      } catch (err) {
        console.log(err);
        setIsListening(false);
        setOpen(false);
      }
      return;
    }
    if (isListening && !open) {
      console.log("Le microphone est déja utilisé");
      setAlert({
        open: true,
        severity: "info",
        msg: `Le microphone est déja utilisé`,
      });
      return;
    }
    if (isListening && open) {
      try {
        activeRecognizer.stopListening();
      } catch (err) {
        console.log(err);
      }
      console.log("stop mic");
      setIsListening(false);
      setOpen(false);
      return;
    }
    if (!isListening && open) {
      console.log("Cas impossible 'bug'");
      setOpen(false);
      return;
    }
  };
  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div onClick={handleClick}>
          {open ? (
            <MicIcon className="micOn" />
          ) : (
            <MicOffIcon className="micOff" />
          )}
        </div>
        <TextField ref={myInput} />
      </div>
    </>
  );
};
