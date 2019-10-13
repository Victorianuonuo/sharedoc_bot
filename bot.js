var SlackBot = require('slackbots');
var mongoose = require('mongoose');
//mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true }); // only when test bot.js
var { ShareLink, ConfigUser } = require('./models/models');
var _ = require('underscore')
var CronJob = require('cron').CronJob;
var request = require('request');
const envKey = process.env.NUDGE_BOT_TOKEN;
var superagent = require('superagent');
var mammoth = require('mammoth');
var word_count = require('word-count');
const pdf_parse = require('pdf-parse');
mongoose.Promise = global.Promise;

var configs;
var daily_report_job;

// create a bot
var bot = new SlackBot({
    token: envKey,
    name: 'nudgebot'
});

const loadConfigs = function () {
    console.log('loadConfigs');
    ConfigUser.findOne({ slackID: 'all' }).exec(function (err, config_user) {
        if (err) {
            console.log(err);
        } else {
            configs = JSON.parse(config_user.configJson);
            console.log('------------');
            console.log('load config finished');
            console.log(configs);
            console.log('------------');
        }
    });
}

const startLoadConfigs = function () {
    var job = new CronJob({
        cronTime: '0 */5 * * * *',
        onTick: function () {
            console.log('startLoadConfigs tick!');
            loadConfigs();
        }
    });
    job.start();
}

const startShareLinksDaily = function () {
    console.log('startShareLinksDaily');
    var job = new CronJob({
        cronTime: '00 00 00 * * *',
        onTick: function () {
            console.log('startShareLinksDaily tick!');
            shareLinksDaily();
            startShareLinksDailyReport();
        }
    });
    job.start();
}

const startShareLinksDailyReport = function () {
    var time = configs.daily_reminder_time.split(":");
    daily_report_job.stop();
    daily_report_job = new CronJob({
        cronTime: '00 ' + time[1] + ' ' + time[0] + ' * * *',
        onTick: function () {
            console.log('startShareLinksDailyReport tick!');
            shareLinksDailyReport();
        }
    });
    daily_report_job.start();
}

// const startShareLinksDailyReport = function(){
//     var time = configs.daily_reminder_time.split(":");
//     var job = new CronJob({
//         cronTime: '00 '+time[1]+' '+time[0]+' * * *',
//         onTick: function() {
//             console.log('startShareLinksDailyReport tick!');
//             shareLinksDailyReport();
//         }
//     });
//     job.start();
// }

function shareLinksDailyReport(trigger = null) {
    ShareLink.find({}, function (err, users) {
        if (err) {
            console.log(err);
        } else {
            var users_map = {};
            for (var i = 0; i < users.length; i++) {
                if (!trigger || trigger == users[i].slackID) {
                    users_map[users[i].slackID] = users_map[users[i].slackID] || [];
                    users_map[users[i].slackID].push(users[i]);
                }
            }
            for (var user in users_map) {
                shareLinksDailyReport_users(users_map[user]);
            }
        }
    });
}

function shareLinksDaily(trigger = null) {
    ShareLink.find({}, function (err, users) {
        if (err) {
            console.log(err);
        } else {
            var users_map = {};
            for (var i = 0; i < users.length; i++) {
                if (!trigger || trigger == users[i].slackID) {
                    users_map[users[i].slackID] = users_map[users[i].slackID] || [];
                    users_map[users[i].slackID].push(users[i]);
                }
            }
            //console.log("users_map", users_map);
            for (var user in users_map) {
                shareLinksDaily_users(users_map[user]);
            }
        }
    });
}

const bot_function = function () {
    console.log('start bot!');
    startShareLinksDaily();

    bot.on('start', function () {
        console.log('start!');
    });


    bot.on("message", message => {
        var slackID = message.user;
        if (message.type != 'error') {
            console.log('-----------------');
            console.log(message);
            console.log("Timenow: " + (new Date()).toISOString());
            console.log("Timenow: " + (new Date()));
            console.log('-----------------');
        }
        const helpString = 'Tell me *I want to write more* to let me help you keep on track\nI will send daily report on the progress you made on those docs on ' + configs.daily_reminder_time + ' am.';
        switch (message.type) {
            case "message":
                if (message.channel[0] === "D" && message.bot_id === undefined) {
                    if (message.text.includes("I want to write more")) {
                        getShareLink(slackID);
                    } else if (message.text.includes("remove")) {
                        removeShareLink(slackID, message.text);
                    } else if (message.text.includes("docs.google.com") || message.text.includes("www.dropbox.com") || message.text.includes("www.overleaf.com")) {
                        storeShareLink(slackID, message.text);
                    } else if (message.text.includes("shareLinksDailyReport")) {
                        shareLinksDailyReport(slackID);
                    } else if (message.text.includes("shareLinksDaily")) {
                        shareLinksDaily(slackID);
                    } else if (message.text == configs.report_message) {
                        console.log("READY to get report");
                        getReport4Research(message.user);
                        //bot.postMessage(message.user, "reportttttt", {as_user:true});
                    } else if (message.text == 'refreshConfigs') {
                        loadConfigs();
                    }else if(message.text.includes("progressReport")){
                        getProgressReport4Research(slackID);
                    }
                    else {
                        bot.postMessage(message.user, helpString, { as_user: true });
                        //displayShareLink(slackID);
                    }
                }
                break;
        }
    });
}

loadConfigs();
startLoadConfigs();
setTimeout(bot_function, 5000);

function getProgressReport4Research(slackID) {
    ShareLink.find({}, function (err, users){
        if(err) {
            console.log("Error occurs when getting all the data from db");
        } else {
            var report = [];
            report.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "_*Research Report*_"
                }
            });
            var report = [];
            report.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "_*Document Progress Report*_"
                }
            });
            report.push({
                "type": "divider"
            });
            var users_map = {};
            for(var i=0;i<users.length;i++){
                users_map[users[i].slackID] = users_map[users[i].slackID]||[];
                users_map[users[i].slackID].push(users[i]);
            }
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
                            var msg_tmp = date+" "+time+": "+progress_list[j]+" words.\n";
                            msg = msg+msg_tmp;
                        }
                        //bot.postMessage(slackID, msg, {as_user:true});
                        report.push({
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": msg
                            }
                        });
                        report.push({
                            "type": "divider"
                        });
                    } else {
                        console.log("progress list not exist!!!");
                    }
                }
            }
            bot.postMessage(slackID, "", { as_user: true, blocks: report });
        }
    });
}

function getReport4Research(slackID) {
    ShareLink.find({}, function (err, users) {
        if (err) {
            console.log("Error occurs when getting all the data from db");
        } else {
            var report = [];
            report.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "_*Research Report*_"
                }
            });
            var users_map = {};
            for (var i = 0; i < users.length; i++) {
                users_map[users[i].slackID] = users_map[users[i].slackID] || [];
                users_map[users[i].slackID].push(users[i]);
            }
            report.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Total number of users: " + Object.keys(users_map).length
                }
            });
            report.push({
                "type": "divider"
            });
            report.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*User Activity*"
                }
            });
            console.log("in get report 4 reserch function!!");
            console.log(users_map);
            var idx = 1;
            for (var user in users_map) {
                report.push({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": idx + ". User: " + user
                    }
                });
                user_field = [];
                user_field.push({
                    "type": "plain_text",
                    "text": "Number of documents: " + users_map[user].length,
                    "emoji": true
                });
                var docs = { 'google': [], 'overleaf': [], 'dropbox': [] };
                for (var i = 0; i < users_map[user].length; i++) {
                    var link = users_map[user][i].original_link;
                    var number = users_map[user][i].number;
                    if (link.includes("docs.google.com")) {
                        docs['google'].push(number);
                    } else if (link.includes("www.dropbox.com")) {
                        docs['dropbox'].push(number);
                    } else if (link.includes("www.overleaf.com")) {
                        docs['overleaf'].push(number);
                    }
                }
                var doc_msgs = ["#Google Docs: " + docs['google'].length, "#Dropbox Docs: " + docs['dropbox'].length, "#Overleaf Docs: " + docs['overleaf'].length];
                for (var i = 0; i < doc_msgs.length; i++) {
                    var key = '';
                    if (i == 0) {
                        key = 'google';
                    } else if (i == 1) {
                        key = 'dropbox';
                    } else if (i == 2) {
                        key = 'overleaf';
                    }
                    if (docs[key].length != 0) {
                        var tmp_msg = "(" + docs[key][0];
                        for (var j = 1; j < docs[key].length; j++) {
                            tmp_msg = tmp_msg + "/" + docs[key][j];
                        }
                        tmp_msg = tmp_msg + ")";
                        doc_msgs[i] = doc_msgs[i] + " " + tmp_msg;
                    }
                    user_field.push({
                        "type": "plain_text",
                        "text": doc_msgs[i],
                        "emoji": true
                    });
                }

                report.push({
                    "type": "section",
                    "fields": user_field
                })

                idx++;
                report.push({
                    "type": "divider"
                });
            }
            bot.postMessage(slackID, "", { as_user: true, blocks: report });
        }
    });
}

function removeShareLink(slackID, msg) {
    console.log(msg.split(" "));
    const links = msg.split(" ");
    var link = links[links.length - 1];
    if (link.startsWith("<") && link.endsWith(">")) {
        link = link.substring(1, link.length - 1);
        console.log("removeShareLink", slackID, link);
    }
    console.log("removeShareLink,", link);
    ShareLink.findOne({ slackID: slackID, original_link: link }).exec(function (err, user) {
        if (err) {
            console.log(err);
        } else {
            if (user) {
                user.remove().then(() => {
                    bot.postMessage(slackID, "successfully remove the link!", { as_user: true });
                }).catch(err => {
                    bot.postMessage(slackID, "Something wrong when remove the link! Please try again later!", { as_user: true });
                    console.log("removeShareLink save error", err);
                });
            } else {
                bot.postMessage(slackID, "Ooops! You haven't added the link so you cannot remove it.", { as_user: true });
            }

        }
    });
}

function updateProgress(number, params) {
    console.log("updateProgress params", params);
    var user = params.user, i = params.i;
    console.log("updateProgress", user.link + " ", user.isDocx + " ", user.number + " ", number + " ");
    user.progress = parseInt(number, 10) - parseInt(user.number, 10);
    user.number = number;
    progress_list_tmp = user.progress_list;
    progress_list_tmp.push(user.progress);
    user.progress_list = progress_list_tmp; 
    time_list_tmp = user.updated_times;
    time_list_tmp.push(params.time);
    user.updated_times = time_list_tmp;
    user.save()
        .then(() => {
            console.log(number + " words now", user.original_link);
        })
        .catch((err) => {
            console.log("newShareLink save erro in updateProgress", err);
        })
}

function shareLinksDaily_users(users){
    var time = Date.now();
    users.forEach(function(user){
        countWord({user:user, link:user.link, isDocx:user.isDocx, time:time}, updateProgress);
    });

    // var all_count_words = users.map(function(link, i){
    //     console.log("shareLinksDaily_users",user.isDocxs[i],user.isDocxs[i]==2);
    //     return 
    //     // return countWord(user.links[i], user.isDocxs[i]).then(function(number){
    //     //     console.log("countWord", user.links[i]+" ", user.isDocxs[i]+" ", user.numbers[i]+" ", number+" ");
    //     //     user.progresses[i] = parseInt(number, 10) - parseInt(user.numbers[i], 10);
    //     //     user.numbers[i] = number;
    //     // });
    // });

    // Promise.all(all_count_words).then(data=>{
    //     console.log("shareLinksDaily_users,,",user);
    //     console.log(data);
    //     user.markModified("progresses");
    //     user.markModified("numbers");
    //     user.save()
    //         .then(() => {
    //             console.log("shareLinksDaily_users successfully save ",user);
    //         })
    //         .catch((err) => {
    //             console.log("newShareLink save error", err, user.slackID);
    //         });
    // });
}

function shareLinksDailyReport_users(users) {
    var message = users.map(function (user, idx) {
        return user.original_link + " " + user.progress;
    });
    bot.postMessage(users[0].slackID, "Your progress on your writing yesterday:\n" + message.join("\n"), { as_user: true });
}

async function countWord(params, callback) {
    var url = params.link,
        isDocx = params.isDocx;
    console.log("params", params);
    if (isDocx == 2) {
        var headers = {
            "connection": "keep-alive",
            "cache-control": "max-age=0",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36",
            "DNT": "1",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "Cookie": "_ga=GA1.2.959972475.1549510933; SERVERID=sl-lin-prod-web-19; sixpack-clientId=5c099c8390a3462b80c6c291; _gid=GA1.2.1088277405.1554592988; overleaf_session=s%3AvFLgsC1QBnwkQhexfwL1kru3kDgjBNiC.1iU%2FI8RIGypXop4uETgvxGpPpTNxOTqGcnwy%2BICWpKc",
        };

        var options = {
            url: url,
            headers: headers,
            followRedirects: true,
            encoding: null,
        };
        request.get(options, (err, res, body) => {
            if (err) {
                console.log(err);
            } else {
                pdf_parse(body).then(function (data) {
                    text = data.text;
                    callback(word_count(text), params);
                }).catch((err) => {
                    console.log('countWord error', err);
                    console.log(url);
                    console.log(res);
                    console.log(body);
                });
            }
        });

    } else {
        const response = await superagent.get(url)
            .parse(superagent.parse.image)
            .buffer();
        var buffer = response.body;
        var text;
        if (isDocx == 1) {
            text = (await mammoth.extractRawText({ buffer })).value;
        } else if (isDocx == 0) {
            text = buffer.toString('utf8');
        }
        callback(word_count(text), params);
    }
}

function addToDB(number, params) {
    var newShareLink = params.newShareLink, slackID = params.slackID, msg = params.msg;
    newShareLink.number = number;
    newShareLink.progress = 0;
    newShareLink.save()
        .then(() => {
            bot.postMessage(slackID, "You've got " + number + " words now, keep writing! Will notify you about your progress every day!\nIf you don't want me to keep track of the doc, just type remove " + msg, { as_user: true });
        })
        .catch((err) => {
            console.log("newShareLink save erro", err);
            bot.postMessage(slackID, "Sorry! Couldn't read the link. Try again and make sure you paste all the link! If it still couldn't work, try to contact the researchers!", { as_user: true });
        })
}

function addShareLink(slackID, link, msg, isDocx) {
    console.log("addShareLink", slackID, link, isDocx);
    ShareLink.findOne({ slackID: slackID, original_link: msg }).exec(function (err, user) {
        if (err) {
            console.log(err);
        } else {
            if (user) {
                bot.postMessage(slackID, "Links already exists!", { as_user: true });
            } else {
                var newShareLink = new ShareLink({
                    slackID: slackID,
                    original_link: msg,
                    link: link,
                    isDocx: isDocx
                });
                countWord({ newShareLink: newShareLink, slackID: slackID, link: link, msg: msg, isDocx: isDocx }, addToDB).catch(function (error) {
                    console.log("countWord error", error);
                    bot.postMessage(slackID, "Sorry! Couldn't read the link. Try again and make sure you paste all the link! If it still couldn't work, try to contact the researchers!", { as_user: true });
                });
            }
        }
    });
}

function storeShareLink(slackID, msg) {
    console.log("storeShareLink", slackID, msg);
    if (msg.startsWith("<") && msg.endsWith(">")) {
        msg = msg.substring(1, msg.length - 1);
        console.log("storeShareLink", slackID, msg);
    }
    if (msg.includes("docs.google.com")) {
        var indexOf = msg.indexOf('/edit?usp=sharing');
        var link = msg.substring(0, indexOf) + '/export?hl=en&exportFormat=txt';
        addShareLink(slackID, link, msg, 0);
    } else if (msg.includes('www.overleaf.com')) {
        var link = msg + '/output/output.pdf?compileGroup=standard&clsiserverid=clsi-pre-emp-w4bt&popupDownload=true';
        addShareLink(slackID, link, msg, 2);
    }
    else if (msg.endsWith(".txt?dl=0")) {
        var link = msg.substring(0, msg.length - 1) + '1';
        addShareLink(slackID, link, msg, 0);
    } else if (msg.endsWith(".docx?dl=0")) {
        var link = msg.substring(0, msg.length - 1) + '1';
        addShareLink(slackID, link, msg, 1);
    } else {
        console.log("match failed", msg);
        bot.postMessage(slackID, "Sorry! Couldn't read the link. Try again and make sure you paste all the link! If it still couldn't work, try to contact the researchers!", { as_user: true });
    }
}

function displayShareLink(slackID) {
    ShareLink.find({ slackID: slackID }).exec(function (err, users) {
        if (err) {
            console.log(err);
        } else {
            //console.log("displayShareLink", user);
            if (users && users.length > 0) {
                const original_links = users.map(user => user.original_link);
                bot.postMessage(slackID, "You have set the following links!\n" + original_links.join("\n"), { as_user: true });
            } else {
                bot.postMessage(slackID, "You haven't set any share links yet!", { as_user: true });
            }
        }
    });
}

function getShareLink(slackID) {
    displayShareLink(slackID);
    bot.postMessage(slackID, "Send the share link to me which grants view access to everyone with the link if you want to add to the share docs I monitor", { as_user: true });
}

module.exports = {
    bot: bot,
}
