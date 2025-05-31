require('dotenv').config(); // Load environment variables from .env file

const express = require('express'); // CommonJS syntax
// import express from 'express'; ---> ES6 syntax

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/about', (req, res) => {
    res.send('About Page');
});

app.get('/contact', (req, res) => {
    res.send('Contact Page');
});

app.listen(process.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});