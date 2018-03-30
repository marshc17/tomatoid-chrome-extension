'use strict';

const hiddenTextareaId = 'hidden-clipboard-text-element';
const requestUrlBasePath = 'https://www.tomatoid.com/';

waitForPopupDomToLoad(function () {
    getNotes(function (notes) {
        saveAndClearNotes.disabled = !(notes && notes.length > 0);
    });
});

saveAndClearNotes.onclick = function (element) {
    getNotes(function (notes) {
        copyNotesToClipboard(notes);
        saveNotesToStorage(notes, function() {
            deleteNotes(notes);
            refreshMainPage();
            window.close();
        });
    });
}

restoreNotes.onclick = function (element) {
    getNotesFromStorage(function (notes) {
        addNotes(notes);
        refreshMainPage();
        window.close();
    });
}

function waitForPopupDomToLoad(afterLoaded) {
    window.addEventListener('DOMContentLoaded', function () {
        afterLoaded();
    });
}

function getNotes(useNotes) {
    getCurrentTab(function (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, {
            request: 'getNotes'
        }, function (response) {
            useNotes(response.notes);
        });
    });
}

function getCurrentTab(useCurrentTab) {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        useCurrentTab(tabs[0]);
    });
}

function copyTextToClipboard(text) {
    const hiddenTextarea = createHiddenTextarea();
    const errorMessage = 'Failed to copy text to clipboard.';

    hiddenTextarea.value = text;
    hiddenTextarea.select();

    try {
        const status = document.execCommand('copy');

        if (!status) {
            console.error(errorMessage);
        }
    } catch (err) {
        console.error(errorMessage, err);
    }

    removeHiddenTextarea();
}

function createHiddenTextarea() {
    const hiddenTextarea = document.createElement('textarea');
    hiddenTextarea.id = hiddenTextareaId;

    // Place in top-left corner of screen regardless of scroll position.
    hiddenTextarea.style.position = 'fixed';
    hiddenTextarea.style.top = 0;
    hiddenTextarea.style.left = 0;

    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    hiddenTextarea.style.width = '1px';
    hiddenTextarea.style.height = '1px';

    // We don't need padding, reducing the size if it does flash render.
    hiddenTextarea.style.padding = 0;

    // Clean up any borders.
    hiddenTextarea.style.border = 'none';
    hiddenTextarea.style.outline = 'none';
    hiddenTextarea.style.boxShadow = 'none';

    // Avoid flash of white box if rendered for any reason.
    hiddenTextarea.style.background = 'transparent';
    document.querySelector('body').appendChild(hiddenTextarea);

    return document.getElementById(hiddenTextareaId);
}

function removeHiddenTextarea() {
    const hiddenTextarea = document.getElementById(hiddenTextareaId);
    document.body.removeChild(hiddenTextarea);
}

function copyNotesToClipboard(notes) {
    const textForClipoard = notes.map(function (note) {
        return note.text;
    }).reduce(function (prev, next) {
        return prev + '\n' + next;
    });

    copyTextToClipboard(textForClipoard);
}

function addNotes(notes) {
    notes.reverse().forEach(function (note) {
        addNewNoteToPage(note.text);
    });
}

function deleteNotes(notes) {
    notes.forEach(function (note) {
        deleteNoteFromPage(note.id);
    });
}

function sendRequest(queryParams) {
    const requestUrl = `${requestUrlBasePath}?${queryParams}`;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", requestUrl, false);
    xhr.send();
}

function addNewNoteToPage(noteText) {
    const queryParams = `ajax=1&method=addNote&text=${encodeURIComponent(noteText)}&id=0`;

    sendRequest(queryParams);
}

function deleteNoteFromPage(noteId) {
    const queryParams = `ajax=1&method=deleteNote&id=${noteId}`;

    console.log('deleting note: ', noteId);
    sendRequest(queryParams);
}

function saveNotesToStorage(notes, onCompleted) {
    chrome.storage.sync.set({
        notes: notes
    }, onCompleted);
}

function getNotesFromStorage(useNotes) {
    chrome.storage.sync.get(['notes'], function (result) {
        useNotes(result.notes);
    });
}

function refreshMainPage() {
    getCurrentTab(function (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, {
            request: 'refreshPage'
        });
    });
}