import { render } from "react-dom";
import { Test } from "./pages/Test";
import "./index.css";
import "./materialUI.css";
import { RecognizerContextProvider } from "./context/speechCommand";
render(
  <RecognizerContextProvider>
    <Test />
  </RecognizerContextProvider>,
  document.getElementById("root")
);
