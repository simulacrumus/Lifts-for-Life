const mongoose = require('mongoose')
const config = require('config')
const cosmosDB = config.get('cosmosURI')

const connectDB = async () => {
    try {
        await mongoose.connect(cosmosDB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            retryWrites: false,
            useFindAndModify:false
        })
        
        console.log('CosmosDB Connected!')
    } catch (error) {
        console.log(error.message)
        process.exit(1)
    }
}

module.exports = connectDB;