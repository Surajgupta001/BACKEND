import express from 'express';

const app = express();

// get a list of 5 jokes
app.get('/api/jokes', (req, res) => {
    const jokes = [
        { id: 1, title:'joke1', joke: 'Why did the chicken cross the road? To get to the other side!' },
        { id: 2, title:'joke2', joke: 'Why do not scientists trust atoms? Because they make up everything!' },
        { id: 3, title:'joke3', joke: 'What do you call fake spaghetti? An impasta!' },
        { id: 4, title:'joke4', joke: 'Why did the scarecrow win an award? Because he was outstanding in his field!' },
        { id: 5, title:'joke5', joke: 'I told my wife she was drawing her eyebrows too high. She looked surprised!' }
    ];
    res.json(jokes);
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});