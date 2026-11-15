const express = require("express");
const { createVercelApp } = require("./server/index");

const app = express();
app.use(createVercelApp());

module.exports = app;
