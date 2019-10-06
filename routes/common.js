var request = require('request');
var moment = require('moment');

function startDialog(requestData){
    var requestJson = {
        url: "https://api.slack.com/api/dialog.open",
        method: "POST",
        json: true,
        headers: {
            "content-type": "application/json",
            "Authorization": "Bearer "+process.env.NUDGE_BOT_TOKEN,
        },
        body: requestData,
    };
    console.log("requestJson", requestJson);
    request(requestJson, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    });
}

isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};

function verifyJson(jsonfile){
    var keys = {
        "report_message": "",
        "daily_reminder_time": "Time",
    };
    var errors;
    console.log(jsonfile);

    try {
        jsonfile = JSON.parse(jsonfile);
        console.log("jsonfile", jsonfile);
        if(isObject(jsonfile)){
            for (var key in keys){
                if(errors){
                    break;
                }
                if(key in jsonfile){
                    if (typeof jsonfile[key] === 'string' || jsonfile[key] instanceof String){
                        if(keys[key]!="" && !keys[key].includes(jsonfile[key])){
                            if(keys[key] != "Time" ){
                                errors = jsonfile[key]+" not defined!!! options: "+keys[key];
                                break;
                            }else if(!moment(jsonfile[key],"HH:mm").isValid()){
                                errors = "Please input time between 00:00 - 23:59";
                                break;
                            }
                    }
                    }else if(!Array.isArray(jsonfile[key])){
                        for(var subkey in jsonfile[key]){
                            console.log(jsonfile[key]+' '+subkey);
                            if(keys[key].length != 0 && !keys[key].includes(subkey)){
                                errors = subkey+" not defined!!!! options: "+keys[key];
                                break;
                            }
                        }
                    }else{
                        for(var subkey in jsonfile[key]){
                            console.log(jsonfile[key]+' '+jsonfile[key][subkey]);
                            if(keys[key].length != 0 && !keys[key].includes(jsonfile[key][subkey])){
                                errors = jsonfile[key][subkey]+" not defined!!! options: "+keys[key];
                                break;
                            }
                        }
                    }
                }else{
                    errors = key+" not in jsonfile!!!";
                    break;
                }
            }
        }else{
            errors = "cannot parse as Json";
        }
    } catch (e) {
        console.log("not JSON");
        console.log(e);
        errors = "not JSON";
    }

    return {"errors": errors};
}

module.exports = {
    startDialog: startDialog,
    verifyJson: verifyJson,
}
