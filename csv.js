const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var { ShareLink} = require('./models/models');
var request = require('request');
var fs = require('fs');

const progressCSVWriter = createCsvWriter({
    path: process.env.PROGRESS_REPORT_LOCATION, // example: '../progressReport2.csv'
    header: [
        {id: 'slackid', title: 'USER'},
        {id: 'document', title: 'DOCUMENT NUMBER'},
        {id: 'time', title: 'TIME'},
        {id: 'progress', title: 'PROGRESS'}
    ]
});

function sendFile(channel, file_title, file_name, file_location) {
    request.post({
        url: 'https://slack.com/api/files.upload',
        formData: {
            token: process.env.NUDGE_BOT_TOKEN,
            title: file_title,
            filename: file_name,
            filetype: "auto",
            channels: channel,
            file: fs.createReadStream(file_location),
        }
    }, function(err, response) {
        console.log("----- sending file to slack");
        console.log(err);
        console.log(JSON.parse(response.body));
    });
}

function generateProgressReportCSV(channel) {
    ShareLink.find({}, function (err, users) {
        if(err) {
            console.log("Error occurs when getting all the data from db");
        } else {
            var users_map = {};
            for(var i=0;i<users.length;i++){
                users_map[users[i].slackID] = users_map[users[i].slackID]||[];
                users_map[users[i].slackID].push(users[i]);
            }
            
            progress_records = [];
            for(var user in users_map) {
                for(var i=0; i<users_map[user].length; i++) {
                    // document i
                    var msg = "";
                    if(users_map[user][i].updated_times.length>0 && users_map[user][i].progress_list.length>0) {
                        msg = msg + "*Document "+i+" for "+user+":* \n";
                        time_list = users_map[user][i].updated_times;
                        progress_list = users_map[user][i].progress_list
                        for(var j=0; j<time_list.length; j++) {
                            var date = time_list[j].toDateString();
                            var time = time_list[j].toLocaleTimeString('en-US');
                            progress_records.push({
                                slackid: user,
                                document: i,
                                time: date+" "+time,
                                progress: progress_list[j]
                            })
                        }
                    } else {
                        console.log("progress list not exist!!!");
                    }
                }
            }
            progressCSVWriter.writeRecords(progress_records)       // returns a promise
            .then(() => {
                console.log('store progress csv file Done');
                sendFile(channel, "Document Progress Report", process.env.PROGRESS_REPORT_NAME, process.env.PROGRESS_REPORT_LOCATION);
            })
            .catch(err => {
                console.log("store csv file error");
                console.log(err);
            }); 
        }
    });
}

module.exports = {
    generateProgressReportCSV: generateProgressReportCSV,
    sendFile: sendFile
}