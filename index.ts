// requrie express

import express from 'express';
import mongoose from 'mongoose';
import axios, { AxiosResponse } from 'axios';
var obj:any={
    useNewUrlParser: true,
    useUnifiedTopology: true

}

mongoose.connect('mongodb://localhost:27017/dragdrop', obj, (err) => {
     console.log(err);
      console.log('connected to mongodb');
})
// express app
const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('.'))
// cors requests
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})



app.post("/post", async (req, res) => {
    var { size, Location } = req.body;
    var db = mongoose.connection.db;
    var bulk = db.collection("data").initializeOrderedBulkOp();
    bulk.find({ rows: { $gt: 0 } }).upsert().updateOne({ $set: size });
    var weather: AxiosResponse = null
    try {
        let temp = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=oslo&appid=dd0698c50cd384f826f54c0bff963688`, { headers: { 'Content-Type': 'application/json' } })
        weather = temp.data
    } catch (e) {
        console.log("Can't get weather!")
        weather = null;
    }
    bulk.find({ "Location.cardno": Location.cardno, weather: (weather) ? weather : {} }).upsert().updateOne({ $set: { Location } })
    var data = await bulk.execute();
    console.log(data)
    res.json({ success: true })
})

// clear database
app.get("/clear", async (req, res) => {
    var db = mongoose.connection.db;
    await db.collection("data").drop();
    res.json({ success: true })
})

app.get("/delete", async (req, res) => {
    var db = mongoose.connection.db;
    var { rows, cols } = req.query;
    var bulk = db.collection("data").initializeOrderedBulkOp();
    bulk.find({ rows: { $gt: 0 } }).upsert().updateOne({ $set: { rows: Number(rows), cols: Number(cols) } });
    bulk.find({ "Location.cardno": Number(req.query.cardno) }).deleteOne();
    await bulk.execute()
    res.json({ success: true })
})

app.get("/get", async (req, res) => {
    var db = mongoose.connection.db;
    try {
        var mongo_resp = await db.collection('data').find().toArray()
        var data = { size: mongo_resp[0], data: mongo_resp.slice(1) }
    } catch (error) {
        data['message'] = "error occured"
    }
    res.json(data)
})

app.listen(3000)