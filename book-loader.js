var http = require('http');
var markdown = require('markdown');
var TurndownService = require('turndown');
var express = require('express');

var SHIFT = 87;
var URL_PREFIX = 'http://rus-linux.net';
var URL_MAINPAGE = 'http://rus-linux.net/MyLDP/BOOKS/Linux_Foundations/toc.html';

var chaptersHTMLs = [];
var chaptersContents = [];
var contentLoaded = false;

var getPages = function() {
    return chaptersContents.map(function (chapterContent, index) {
        return {
            mdContent: chapterContent,
            url: '/' + index
        };
    });
};
var getPartName = function(chapterContent) {
    var name = chapterContent.match(/Часть.+</)[0];
    return name.slice(0, name.length - 2);
};
var getChapterName = function(chapterContent) {
    var name = chapterContent.match(/<h2>.+<\/h2>/)[0];
    return name.slice(4, name.length - 5);
};
var createMainPage = function () {
    var headHMTL = '<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Linux book</title><link rel="stylesheet"  href="static/style.css" /></head>';
    var bodyHTML = '<body><h1>Welcome to LINUX book</h1>';
    var addedParts = [];
    chaptersContents.forEach(function(chapterContent, index) {
        var partName = getPartName(chapterContent);
        if(addedParts.indexOf(partName) === -1) {
            bodyHTML += '<h2>' + partName + '</h2>';
        }
        var chapterName = getChapterName(chapterName);
        bodyHTML += '<h3> <a href=' + pages[index].url + '>'  + chapterContent + '</a></h3>';
    });
    return headHMTL + bodyHTML + '</body></html>';
};
var startServer = function () {
    var pages = getPages();
    var mainPage = createMainPage(pages);
    var app = express();
    app.set('port', 3579);
    http.createServer(app).listen(app.get('port'), function () {
        console.log('Started on port ', app.get('port'));
    });
    console.log(mainPage);
    // app.use(function(req, res, next) {
    //   if(req.url === '/') {
    //     res.end(mainPage);
    //     return;
    //   }
    //   var chapterNumber = req.url.match(/[0-9]+/)[0];
    //   console.log('The chapter number', chapterNumber);
    //   res.end(markdown.toHTML(chaptersContents[Number(chapterNumber)]));
    // });
};
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
    var turndownService = new TurndownService();
    chaptersContents = chaptersHTMLs.map((chapterHTML) => {
        return getHTMLContent(chapterHTML);
    }).map((chapterContentHTML) => {
        return turndownService.turndown(chapterContentHTML);
    });
    contentLoaded = true;
    startServer();
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