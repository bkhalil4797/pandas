import { Breadcrumbs, Typography } from "@material-ui/core";
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  let location = useLocation();
  location = location.pathname.split("/");
  location[0] = "localhost";
  return (
    <div className="navbar">
      <Breadcrumbs>
        <Link to="/">Home</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/models">Models</Link>
      </Breadcrumbs>
      <Breadcrumbs>
        {location.map((path) => (
          <Typography key={path}>{path}</Typography>
        ))}
      </Breadcrumbs>
    </div>
  );
};
