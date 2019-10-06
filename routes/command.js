var express = require('express');
var router = express.Router();
var {startDialog} = require('./common');

router.post('/config', function(req, res) {
    var data = req.body;
    console.log(data);
    var requestData = {
        "trigger_id": data.trigger_id,
        "dialog": {
            "callback_id": "config_callback",
            "title": "Upload a config file",
            "submit_label": "Request",
            "notify_on_cancel": true,
            "state": "Limo",
            "elements": [
                {
                    "label": "Key to authenticate your identity",
                    "name": "key",
                    "type": "text",
                    "placeholder": "key to upload the config file"
                },
                {
                    "label": "Config file of Json format",
                    "name": "configfile",
                    "type": "textarea",
                    "hint": `'report_message', 'daily_reminder_time'`,
                    "value": `{
                        "report_message":"report",
                        "daily_reminder_time":"07:30"
                    }`
                },
            ],
        },
    };
    startDialog(requestData);
    res.send();
});

module.exports = router;
