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

var ShareLink = mongoose.model('ShareLink', shareLinkSchema);

module.exports = {
    ShareLink: ShareLink,
};
