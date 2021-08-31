import { useEffect } from "react";

export const Settings = () => {
  useEffect(() => {
    const voices = speechSynthesis.getVoices();
    console.log(voices);
    let msg = new SpeechSynthesisUtterance(
      "Vous étes sur la page des parametres"
    );
    console.log(msg);
    msg.rate = 1.1;
    msg.voice = voices[9];
    window.speechSynthesis.speak(msg);

    msg.text = "Merci d'avoir utilisé notre service";
    window.speechSynthesis.speak(msg);
  }, []);
  return (
    <>
      <h1>Settings</h1>
    </>
  );
};
