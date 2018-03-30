'use strict';

const hiddenTextareaId = 'hidden-clipboard-text-element';
const requestUrlBasePath = 'https://www.tomatoid.com/';

waitForPopupDomToLoad(function () {
    canClearAndSaveNotes(function (enabled) {
        setButtonDisabledState(saveAndClearNotes, !enabled);
    });

    canRestoreNotes(function(enabled) {
        setButtonDisabledState(restoreSavedNotes, !enabled);
    });

    setButtonDisabledState(restoreNotesFromClipboard, !canRestoreNotesFromClipboard());
});

saveAndClearNotes.onclick = function (element) {
    getNotes(function (notes) {
        copyNotesToClipboard(notes);
        saveNotesToStorage(notes, function () {
            deleteNotes(notes);
            refreshMainPage();
            window.close();
        });
    });
}

restoreSavedNotes.onclick = function (element) {
    getNotesFromStorage(function (notes) {
        const notesAsText = notes.map(function (note) {
            return note.text;
        });

        addNotes(notesAsText);
        refreshMainPage();
        window.close();
    });
}

restoreNotesFromClipboard.onclick = function () {
    const lines = getTrimmedLinesFromClipboard();

    addNotes(lines);
    refreshMainPage();
    window.close();
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
            useNotes(response && response.notes);
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

    hiddenTextarea.value = text;
    selectElementAndExecCommand(hiddenTextarea, 'copy');
    removeElement(hiddenTextarea);
}

function getTextFromClipboard() {
    const hiddenTextarea = createHiddenTextarea();

    selectElementAndExecCommand(hiddenTextarea, 'paste');

    const result = hiddenTextarea.value;

    removeElement(hiddenTextarea);

    return result;
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

    return hiddenTextarea;
}

function selectElementAndExecCommand(element, command) {
    const errorMessage = 'Failed to copy text from clipboard.';

    element.select();

    try {
        const status = document.execCommand(command);

        if (!status) {
            console.error(errorMessage, status);
        }
    } catch (err) {
        console.error(errorMessage, err);
    }
}

function removeElement(element) {
    document.body.removeChild(element);
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
        addNewNoteToPage(note);
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

function getTrimmedLinesFromClipboard(useNotes) {
    const rawClipboardText = getTextFromClipboard();

    const trimmedLines = rawClipboardText.split('\n').map(function (line) {
        return line.trim();
    }).filter(function (line) {
        return line.length > 0;
    });

    return trimmedLines;
}

function refreshMainPage() {
    getCurrentTab(function (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, {
            request: 'refreshPage'
        });
    });
}

function setButtonDisabledState(buttonElement, disabled) {
    buttonElement.disabled = disabled;

    if (disabled) {
        buttonElement.classList.add('disabled-button');
    } else {
        buttonElement.classList.remove('disabled-button');
    }
}

function canClearAndSaveNotes(useValue) {
    getNotes(function (notes) {
        useValue(!!(notes && notes.length > 0));
    });
}

function canRestoreNotes(useValue) {
    getNotesFromStorage(function(notes) {
        useValue(!!(notes && notes.length > 0));
    });
}

function canRestoreNotesFromClipboard() {
    const trimmedLines = getTrimmedLinesFromClipboard();
    return !!(trimmedLines && trimmedLines.length > 0);
}
