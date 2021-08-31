import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { Mic } from "./component/Mic";
import { Navigation } from "./component/Navigation";
import { ContextProvider } from "./context";
import { Models } from "./pages/Models";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <ContextProvider>
      <Router>
        <div className="app__container">
          <Navigation />
          <Switch>
            <Route exact path="/">
              <h1>Home</h1>
              <Mic id="ff5" />
            </Route>
            <Route exact path="/settings">
              <Settings />
            </Route>
            <Route exact path="/models">
              <Models />
            </Route>
            <Route path="*">
              <Redirect to="/" />
            </Route>
          </Switch>
        </div>
      </Router>
    </ContextProvider>
  );
}

export default App;
