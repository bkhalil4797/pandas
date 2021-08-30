import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { Navigation } from "./component/Navigation";
import { ContextProvider } from "./context";
import { Models } from "./pages/Models";

function App() {
  return (
    <ContextProvider>
      <Router>
        <div className="app__container">
          <Navigation />
          <Switch>
            <Route exact path="/">
              <h1>Home</h1>
            </Route>
            <Route exact path="/settings">
              <h1>Settings</h1>
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
