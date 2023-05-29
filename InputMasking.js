addEvent(document, "DOMContentLoaded", ()=>{
    bypassDomRecursive(document.childNodes[0], isMaskable, processMaskable);
});

function bypassDomRecursive(root, checkingCallback, processingCallback){
    if (checkingCallback(root)){
        processingCallback(root);
    }
    else{
        let childNodes = root.childNodes;        
        childNodes.forEach(element => {
            bypassDomRecursive(element, checkingCallback, processingCallback);
        });

    }
}

function isMaskable(element){
    if (!(element.tagName != undefined && element.tagName.toLowerCase() == "input")){
        return false;
    }
    if (!(hasAttribute(element, "masking-data") && hasAttribute(element, "value"))){
        return false;
    }
    let maskingData = JSON.parse(element.getAttribute("masking-data"));
    if (!(maskingData.hasOwnProperty("valid") && maskingData.hasOwnProperty("editable"))){
        return false;
    }
    let regex = new RegExp(maskingData.valid);
    if (!(regex.test(element.getAttribute("value")) && new String(element.getAttribute("value")).length == maskingData.editable.length)){
        return false;
    }
    return true;
}

function hasAttribute(element, attributeName){
    return element.attributes.getNamedItem(attributeName);
}

function processMaskable(element){
    addEvent(element, "beforeinput", processBeforeInputEvent, false);
}

function processBeforeInputEvent(event){
    event.preventDefault();
    let maskingData = JSON.parse(event.target.getAttribute("masking-data"));
    let selection = getInputSelection(event.target);
    let newStr = "";
    let caretDirection = 1;
    switch(event.inputType){
        case("insertText"):
        case("insertFromPaste"):
            newStr = event.target.value.substring(0, selection.start) + event.data 
                + event.target.value.substring((selection.end == selection.start ? selection.end + 1 : selection.end));
            break;
        case("deleteContentBackward"):
            newStr = event.target.value.substring(0, (selection.end == selection.start ? selection.start - 1 : selection.start)) 
                + "0".repeat(selection.end == selection.start ? 1 : selection.end - selection.start) 
                + event.target.value.substring(selection.end);
            caretDirection = -1;
            break;
        case("deleteContentForward"):
            newStr = event.target.value.substring(0, selection.start) + 
            + "0".repeat(selection.end == selection.start ? 1 : selection.end - selection.start)
            + event.target.value.substring((selection.end == selection.start ? selection.end + 1 : selection.end));
            break;
    }

    if (isNewInputValueValid(event.target, newStr, maskingData)){
        event.target.value = newStr;
    }
    else{
        selection.start += caretDirection;
    }
    setCaretPositionToClosestEditable(event.target, maskingData, selection, caretDirection);
}

function isNewInputValueValid(element, value, maskingData = undefined){
    if (maskingData == undefined){
        maskingData = JSON.parse(element.getAttribute("masking-data"));
    }
    let regex = new RegExp(maskingData.valid);
    return regex.test(value);
}

function addEvent(elem, evType, fn, once = true) {
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, {"once": once, "capture": true});
	}
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evType, fn);
	}
	else {
		elem['on' + evType] = fn;
	}
}

function setCaretPositionToClosestEditable(element, maskingData, selectionData, direction = 1){
    if (direction != 1 && direction != -1){
        return;
    }
    let basePosition = direction > 0 ? selectionData.end : selectionData.start;
    let expectedPosition = selectionData.end == selectionData.start ? basePosition + direction : basePosition;
    let resultPosition = expectedPosition;
    for (let index = resultPosition; index < maskingData.editable.length && index >= 0; index += direction){
        if(maskingData.editable.substring(index, index + direction) != "0"){
            resultPosition = index;
            break;
        }
    }
    setCaretPosition(element, resultPosition);
}

function getInputSelection(el) {
    var start = 0, end = 0, normalizedValue, range,
        textInputRange, len, endRange;

    if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
        start = el.selectionStart;
        end = el.selectionEnd;
    } else {
        range = document.selection.createRange();

        if (range && range.parentElement() == el) {
            len = el.value.length;
            normalizedValue = el.value.replace(/\r\n/g, "\n");

            // Create a working TextRange that lives only in the input
            textInputRange = el.createTextRange();
            textInputRange.moveToBookmark(range.getBookmark());

            // Check if the start and end of the selection are at the very end
            // of the input, since moveStart/moveEnd doesn't return what we want
            // in those cases
            endRange = el.createTextRange();
            endRange.collapse(false);

            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                start = end = len;
            } else {
                start = -textInputRange.moveStart("character", -len);
                start += normalizedValue.slice(0, start).split("\n").length - 1;

                if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                    end = len;
                } else {
                    end = -textInputRange.moveEnd("character", -len);
                    end += normalizedValue.slice(0, end).split("\n").length - 1;
                }
            }
        }
    }

    return {
        start: start,
        end: end
    };
}

function setCaretPosition(element, caretPos) {
    if(element != null) {
        if(element.createTextRange) {
            var range = element.createTextRange();
            range.move('character', caretPos);
            console.log(caretPos);
            range.select();
        }
        else {
            element.focus();
            element.setSelectionRange(caretPos, caretPos);
        }
    }
}

