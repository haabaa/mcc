import React from "react";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import "./styles.css";

export default function App() {
  const [authed, setAuthed] = React.useState(!!localStorage.getItem("accessToken"));
  return authed ? <Dashboard /> : <Login onLoggedIn={() => setAuthed(true)} />;
}
