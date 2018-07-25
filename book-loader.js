var http = require('http');
var markdown = require('markdown');
var TurndownService = require('turndown');
var turndownService = new TurndownService();

var SHIFT = 87;
var URL_PREFIX = 'http://rus-linux.net';
var URL_MAINPAGE = 'http://rus-linux.net/MyLDP/BOOKS/Linux_Foundations/toc.html';

var chaptersHTMLs = [];
var chaptersContents = [];
var contentLoaded = false;

var getBeginContentIndex = function (htmlDoc) {
    return htmlDoc.match(/<h1>/).index;
};
var getEndContentIndex = function (htmlDoc) {
    return htmlDoc.match(/background: #ecedef/).index - SHIFT;
};
var getHTMLContent = function (htmlDoc) {
    var indexBegin = getBeginContentIndex(htmlDoc);
    var indexEnd = getEndContentIndex(htmlDoc);
    return htmlDoc.slice(indexBegin, indexEnd);
};
var getChaptersUrls = function (mainPageHTML) {
    var wholeChaptersUrls = mainPageHTML.match(/\/MyLDP\/BOOKS\/Linux_Foundations\/[0-9]+\/ch[0-9]+.html/g);
    var uniqueChaptersUrls = [];
    wholeChaptersUrls.forEach((url) => {
      var wholeUrl = URL_PREFIX + url
        if(uniqueChaptersUrls.indexOf(wholeUrl) === -1) {
            uniqueChaptersUrls.push(wholeUrl);
        }
    });
    return uniqueChaptersUrls;
};

var getChaptersContent = function() {
    if(chaptersUrls.length !== 0) {
        http.get(chaptersUrls[0], (res) => {
            var chapterHTML = '';
            res.on('data', (dataChunk) => {
                chapterHTML += dataChunk;
            });
            res.on('end', () => {
                chaptersHTMLs.push(chapterHTML);
                getChaptersContent();
            });
        }).on('error', (e) => {
            console.log(e.message);
        });

        chaptersUrls.splice(0, 1);
        return;
    }
    chaptersContents = chaptersHTMLs.map((chapterHTML) => {
        return getHTMLContent(chapterHTML);
    }).map((chapterContentHTML) => {
        return turndownService.turndown(chapterContentHTML);
    });
    contentLoaded = true;
};
var getHostContent = function(mainPage) {
    chaptersUrls = getChaptersUrls(mainPage);
    getChaptersContent(chaptersUrls);
};
var onMainPageLoading= function (res) {
    var mainPage = '';
    res.on('data', (dataChunk) => {
        mainPage += dataChunk;
    });
    res.on('end', () => {
        getHostContent(mainPage);
    });
};

http.get(URL_MAINPAGE, onMainPageLoading).on('error', (e) => {
    console.error(e.message);
});