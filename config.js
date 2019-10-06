const fileName = './resources/config.json';
var configfile = JSON.parse(require(fileName));
var fs = require('fs');


function json2func(configfile){
    return {
        get_report_message: function() {
            return configfile.report_message;
        },
        get_daily_reminder_time: function() {
            return configfile.daily_reminder_time;
        }
    }
}

var updateConfig = function(newConfig){
    fs.writeFile(fileName, JSON.stringify(newConfig), function (err) {
        if (err) return console.log(err);
        console.log(JSON.stringify(newConfig));
        console.log('writing to ' + fileName);
    });
    configfile = newConfig;
}

module.exports = {
    configfile: configfile,
    updateConfig: updateConfig,
}