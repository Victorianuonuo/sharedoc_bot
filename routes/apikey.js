var express = require('express');
var router = express.Router();
var { bot } = require('../bot');
var { verifyJson } = require('./common');
var { ConfigUser } = require('../models/models');

router.post('/', function (req, res) {
    var data = JSON.parse(req.body.payload);
    var slackID = data.user.id;
    console.log("post apikey:", data);
    if (data.type == "dialog_submission") {
        if (data.callback_id == "config_callback") {
            var submission = data.submission;
            console.log("submission: ", submission);
            var configkey = process.env.configkey || 233;
            if (submission.key != configkey) {
                res.status(200).json({ "errors": [{ "name": "key", "error": "Ooops!!! Invalid key. Please input the right key to change the config file" }] });
                return;
            }
            var verification = verifyJson(submission.configfile);
            if (verification.errors) {
                res.status(200).json({ "errors": [{ "name": "configfile", "error": verification.errors }] });
                return;
            }

            ConfigUser.findOne({ slackID: 'all' }).exec(function (err, user) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(user);
                    if (user) {
                        console.log("ConfigUser slackID" + user.slackID + " exist, set by ", user.auth_id);
                        var newConfigFile = user;
                        newConfigFile.configJson = submission.configfile;
                        newConfigFile.auth_id = 'all';
                    } else {
                        var newConfigFile = new ConfigUser({
                            slackID: 'all',
                            configJson: submission.configfile,
                            auth_id: slackID
                        });
                    }
                    newConfigFile.save()
                        .then(() => {
                            bot.postMessage(slackID, "Congratulations! You successfully change configfile for all", { as_user: true });
                        })
                        .catch((err) => {
                            console.log('error in new newConfigFile api');
                            console.log(err.errmsg);
                            bot.postMessage(slackID, "Ooops!!! Error occurs! Please try again by type slack command config", { as_user: true });
                        });
                    res.send();
                }
            });
            res.send();
        }
    } else if (data.type == "dialog_cancellation") {
        console.log("!!!!! user has cancel the dialog!!");
        console.log(data);
    }
})

module.exports = router;
