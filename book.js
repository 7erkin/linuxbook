var http = require('http');
var markdown = require('markdown').markdown;
var TurndownService = require('turndown');
var express = require('express');

var SHIFT = 87;
var URL_PREFIX = 'http://rus-linux.net';
var URL_MAINPAGE = 'http://rus-linux.net/MyLDP/BOOKS/Linux_Foundations/toc.html';
var HTML_HEAD_MAINPAGE = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Linux book</title></head>';
var PORT = 3579;

var chaptersHTMLs = [];
var chaptersContents = [];
/**
 * @description Создаёт из контента в формате markdown контент в формате html 
 * и присваивает каждому документу УРЛ, по которому этот документ будет отдаваться
 * @return {Array} Массив объектов, где объект это контент в html и УРЛ, который ему соответствует
 */
var createHTMLPages = function() {
    return chaptersContents.map(function (chapterContent, index) {
        return {
            content: markdown.toHTML(chapterContent),
            url: '/chapter' + index
        };
    });
};
/**
 * @description Из контента получает название Части книги, которой этот контент принадлежит
 * @param {String} chapterContent Контент в формате markdown 
 * @return {String} Название Части книги
 */
var getPartName = function(chapterContent) {
    var name = chapterContent.match(/Часть.+</)[0];
    return name.slice(0, name.length - 1);
};
/**
 * @description Из контента получает название Главы книги, которой этот контент принадлежит
 * @param {String} chapterContent Контент в формате markdown 
 * @return {String} Название Главы книги
 */
var getChapterName = function(chapterContent) {
    var name = chapterContent.match(/<h2>.+<\/h2>/)[0];
    return name.slice(4, name.length - 5);
};
/**
 * @description Создаёт главную страничку (оглавление книги)
 * @param {Array} pages Массив объектов, которые представляют контент страницы в формате html и соответствующий им url 
 * @return {String} Главная страничка в формате html
 */
var createMainPage = function (pages) {
    var bodyHTML = '<body style="text-align: center;"><h1>Welcome to LINUX book</h1>';
    var addedParts = [];
    pages.forEach(function(page, index) {
        var partName = getPartName(page.content);
        if(addedParts.indexOf(partName) === -1) {
            bodyHTML += '<h2>' + partName + '</h2>';
            addedParts.push(partName);
        }
        var chapterName = getChapterName(page.content);
        bodyHTML += '<h3> <a href=' + page.url + '>'  + chapterName + '</a></h3>';
    });
    return HTML_HEAD_MAINPAGE + bodyHTML + '</body></html>';
};
/**
 * @description Запускает сервер. Устанавливает MiddleWares.
 */
var startServer = function () {
    var pages = createHTMLPages();
    var mainPage = createMainPage(pages);
    var app = express();
    app.set('port', PORT);
    http.createServer(app).listen(app.get('port'), function () {
        console.log('Started on port ', app.get('port'));
    });
    app.use(function(req, res, next) {
        if(req.url === '/') {
            res.end(mainPage);
        } else {
            next();
        }
    });
    app.use(function(req, res, next) {
        var indexDemandedPage;
        pages.some(function(page, index) {
            if(req.url === page.url) {
                indexDemandedPage = index;
                return true;
            }
            return false;
        });
        if(indexDemandedPage === undefined) {
            next();
        }
        else {
            res.end(pages[indexDemandedPage].content);
        } 
    });
    app.use(function(req, res, next) {
        res.end('PAGE NOT FOUND');
    });
};
/**
 * @description Определяет начало контента в html документе
 * @param {String} htmlDoc
 * @return {Number} Индекс начала контента
 */
var getBeginContentIndex = function (htmlDoc) {
    return htmlDoc.match(/<h1>/).index;
};
/**
 * @description Определяет конец контента в html документе
 * @param {String} htmlDoc
 * @return {Number} Индекс конца документа
 */
var getEndContentIndex = function (htmlDoc) {
    return htmlDoc.match(/background: #ecedef/).index - SHIFT;
};
/**
 * @description Получает из целого html документа контент
 * @param {String} htmlDoc 
 * @return {String} Контент документа
 */
var getHTMLContent = function (htmlDoc) {
    var indexBegin = getBeginContentIndex(htmlDoc);
    var indexEnd = getEndContentIndex(htmlDoc);
    return htmlDoc.slice(indexBegin, indexEnd);
};
/**
 * @description Из главной страницы сайта linuxbook, извлекает УРЛы на главы книги
 * @param {String} mainPageHTML 
 * @return {Array} Массив УРЛов
 */
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
/**
 * @description Извлекает контент из глав, переводит контент из html в markdown, запускает сервер на отдачу контента
 */
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
    startServer();
};
/**
 * @description Скачивает сайт и извлекает контент
 * @param {String} mainPage Главная страница сайта
 */
var getHostContent = function(mainPage) {
    chaptersUrls = getChaptersUrls(mainPage);
    getChaptersContent(chaptersUrls);
};
/**
 * @description Колбэк на скачивание главной страницы сайта
 * @param {Object} res
 */
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