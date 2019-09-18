var logger = require('morgan');
var mongoose = require('mongoose');
var _ = require('underscore');
var {bot} = require('./bot');

var https = require("https");
setInterval(function() {
    https.get(process.env.DOMAIN);
    console.log("keepwake");
}, 300000); // every 5 minutes (300000)
//This is for the wake process, mongthly quoto limited

mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true });
mongoose.Promise = global.Promise;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Nudgebot is working! Path Hit: ' + req.url);
});

app.listen(process.env.PORT || 3000);

