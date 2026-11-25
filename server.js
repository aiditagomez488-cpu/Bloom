
const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Estilos
app.get("/styles.css", (req, res) => {
    res.sendFile(path.join(__dirname, "styles.css"));
});

// JavaScript de Bloom
app.get("/app.js", (req, res) => {
    res.sendFile(path.join(__dirname, "app.js"));
});

// Comprobación del servidor
app.get("/health", (req, res) => {
    res.status(200).send("Bloom is alive!");
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bloom funcionando en el puerto ${PORT}`);
});
