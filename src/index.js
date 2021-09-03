import { render } from "react-dom";
import { Test } from "./pages/Test";
import "./index.css";
import "./materialUI.css";
import { RecognizerContextProvider } from "./context/recognizerContext";
render(
  <RecognizerContextProvider>
    <Test />
  </RecognizerContextProvider>,
  document.getElementById("root")
);
