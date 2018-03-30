'use strict';

const noteTextRegex = /\s*(.*)@\s\d\d?:\d{2}\s[a|p]m.*/;

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.request === 'getNotes') {
        sendResponse({
            notes: getNotesFromPage()
        });
    }else if (msg.request === 'refreshPage') {
        console.log('reloading...');
        window.location.reload();
    } else {
        sendResponse({});
    }
});

function getNotesFromPage() {
    const addNoteElements = document.getElementsByClassName('note-add');

    if (!addNoteElements) {
        return [];
    }

    const noteTextElements = addNoteElements[0].getElementsByClassName('notetext');
    let notes = [];

    for (let i = 0; i < noteTextElements.length; ++i) {
        const noteTextElement = noteTextElements.item(i);
        const noteId = getNoteIdFromNoteTextElement(noteTextElement);
        const noteText = getTextFromNoteTextElement(noteTextElement);

        if (noteText && noteId) {
            notes.push({
                id: noteId,
                text: noteText
            });
        }
    }

    return notes;
}

function getNoteIdFromNoteTextElement(noteTextElement) {
    return noteTextElement.parentElement.getAttribute('data-id');
}

function getTextFromNoteTextElement(noteTextElement) {
    const rawNoteText = noteTextElement.getElementsByTagName('p')[0].textContent;
    const matchedText = noteTextRegex.exec(rawNoteText);

    return matchedText && matchedText.length >= 2
        ? matchedText[1].trim()
        : undefined;
}
