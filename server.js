const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const connectDB = require('./config/db')
const path = require('path')
const cors = require('cors');
const app = express()


connectDB();

app.use(cors());
app.use(express.json());

app.use(express.static('./client/public'));
app.use(express.static('./client/src/imgs/uploads'));

app.use('/api/admins', require('./routes/api/admins'));
app.use('/api/clients', require('./routes/api/clients'));
app.use('/api/equipments', require('./routes/api/equipments'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/newsletters', require('./routes/api/newsletters'));
app.use('/api/messages', require('./routes/api/messages'));
app.use('/api/donations', require('./routes/api/donations'));
app.use('/api/orders', require('./routes/api/orders'));

if(process.env.PORT === 'production'){
    app.use(express.static('frontend/build'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server started on PORT ${PORT}`));