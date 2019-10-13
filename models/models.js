var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var shareLinkSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true
    },
    original_link: {
        type: String,
        required: true,
        index: true
    },
    link: String,
    number: String,
    isDocx: Number,
    progress: Number,
});
shareLinkSchema.index({ slackID: 1, original_link: 1 }, { unique: true });

var configUserSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    configJson: {
        type: String,
        required: true
    },
    auth_id: {
        type: String,
        required: true
    }
});

var ShareLink = mongoose.model('ShareLink', shareLinkSchema);
var ConfigUser = mongoose.model('ConfigUser', configUserSchema);

module.exports = {
    ShareLink: ShareLink,
    ConfigUser: ConfigUser,
};
