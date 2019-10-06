var express = require('express');
var router = express.Router();
var {bot} = require('../bot');
var {verifyJson} = require('./common');
var {updateConfig} = require('../config');

router.post('/', async function(req, res){
    var data = JSON.parse(req.body.payload);
    var slackID = data.user.id;
    console.log("post apikey:", data);
    if(data.type=="dialog_submission"){
        if(data.callback_id=="config_callback"){
            var submission = data.submission;
            console.log("submission: ", submission);
            var configkey = process.env.configkey || 233;
            if(submission.key!=configkey){
                res.status(200).json({"errors":[{"name": "key", "error": "Ooops!!! Invalid key. Please input the right key to change the config file"}]});
                return;
            }
            var verification = verifyJson(submission.configfile);
            if(verification.errors){
                res.status(200).json({"errors":[{"name": "configfile", "error": verification.errors}]});
                return;
            }

            updateConfig(submission.configfile);
            res.send();
        }
    } else if(data.type == "dialog_cancellation") {
        console.log("!!!!! user has cancel the dialog!!");
        console.log(data);
    } 
})

module.exports = router;
