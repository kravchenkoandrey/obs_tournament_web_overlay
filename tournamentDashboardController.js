const broadcastChannel = new BroadcastChannel("obs_tournament_broadcast_channel");
var timeRemaining = 0;
var timerEndTime = 0;
var timerIntervalId = undefined;
var players = new Object;
const counterConnectionTimeout = 2000;
const counterPingInterval = 500;
const counterPongCheckTimeout = 100;

addEvent(document, "DOMContentLoaded", ()=>{
    initializeOnContentLoad();
});

function initializeOnContentLoad(){
    loadCookies();

    addEvent(broadcastChannel, "message", (event)=>{
        if(event.data.command == "connect_player"){
            handlePlayerConnection(event.data.value);
        }
        else if(event.data.command == "pong_from_player"){
            handlePongFromPlayer(event.data.value);
        }
    });

    broadcastChannel.postMessage({command: "notify_dashboard_ready"});
    setInterval(pingPlayers, counterPingInterval);
}

function pausePlayTimer(){
    if(parseInt(timeRemaining) == 0){
        timeRemaining = stringToTimestamp(document.getElementById("timeRemaining").value);
    }
    if (timerIntervalId == undefined){
        timerEndTime = Date.now() + parseInt(timeRemaining);
        timerIntervalId = setInterval(updateTimer, 1000);
    }
    else{
        stopTimer();
    }
    updateTimerContainerContent();  
}

function endTimer(){ 
    stopTimer(); 
    timeRemaining = 0;
    updateTimerContainerContent();   
}

function stopTimer(){
    clearInterval(timerIntervalId);
    timerIntervalId = undefined;
}

function onTimeRemainingValueChange(event){
    timeRemaining = stringToTimestamp(event.target.value);
    broadcastChannel.postMessage({command: "update_timer", value: timeRemaining});
}

function stringToTimestamp(str){
    let result = 0;
    strElements = str.split(':');
    result += (strElements[2]*1000 + strElements[1] * 60 * 1000 + strElements[0] * 60 * 60 * 1000);
    return result;
}

function timestampToString(ts){
    let tsRounded = Math.round(ts/1000)*1000;
    let hours = Math.floor(tsRounded/1000/60/60);
    let minutes = Math.floor((tsRounded-hours*1000*60*60)/1000/60);
    let seconds = Math.floor((tsRounded-hours*1000*60*60-minutes*1000*60)/1000);
    result = lZ(hours) + ":" + lZ(minutes) + ":" + lZ(seconds);
    return result;
}

function updateTimer(){
    timeRemaining = timerEndTime - Date.now();
    if(parseInt(timeRemaining) < 0){
        endTimer();
    }
    else{
        updateTimerContainerContent();
    }
}

function updateTimerContainerContent(){
    value = timestampToString(parseInt(timeRemaining));
    document.getElementById("timeRemaining").value = value;
    broadcastChannel.postMessage({command: "update_timer", value: timeRemaining});
}

function lZ(number){
    result = number;
    if(number < 10){
        result = "0" + number;
    }
    return result;
}

function addTime(){
    additionalTime = stringToTimestamp(document.getElementById("addTime").value);
    timerEndTime = Date.now() + parseInt(timeRemaining) + additionalTime;
    updateTimer();
}

function handlePlayerConnection(playerId){ 
    if (!document.querySelector('[player_data_id=\"' + playerId + '\"]')){ 
        let playerSection = document.getElementById("playersSection");
        let playerSettingsElement = document.getElementById("playerSettingsTemplate").cloneNode(true);
        playerSettingsElement.removeAttribute('id');
        playerSettingsElement.setAttribute("player_data_id", playerId);
        playerSettingsElement.removeAttribute("hidden");
        
        let ids = playerSettingsElement.getElementsByClassName("playerIdInput");
        if (ids.length > 0){
            ids[0].value = "ID: " + playerId;
        }
        
        playerSection.appendChild(playerSettingsElement);
        sortChildsByAttributeValue(playerSection, "player_data_id");
        if(!players.hasOwnProperty(playerId)){
            players[playerId] = newPlayerDataObject();
        }
        else if(players[playerId]["hidden"]){
            players[playerId]["hidden"] = false;
        }
        updateCounterPresentation(playerId);
        updateNicknamePresentation(playerId);
    }
    updatePlayerRemoteOverlayData(playerId);
    updateCookies();
}

function addEvent(elem = false, evType, fn, params) {
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, params);
	}
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evType, fn);
	}
	else {
		elem['on' + evType] = fn;
	}
}

function pingPlayers(){
    if (Object.keys(players).length){
        broadcastChannel.postMessage({command: "ping_players"}); 
        setTimeout(checkPongs, counterPongCheckTimeout); 
    }

}

function checkPongs(){
    let curTime = Date.now();
    let ids = Object.keys(players);
    ids.forEach(id => {
        let element = players[id];
        if (!element['hidden'] && element.hasOwnProperty("lastPongTime")){
            if (curTime - element["lastPongTime"] > counterConnectionTimeout){
                hidePlayer(id);
            }
        }
    });
}

function handlePongFromPlayer(playerId){
    if (!players.hasOwnProperty(playerId) || players[playerId]["hidden"]){
        handlePlayerConnection(playerId);
    }
    players[playerId]["lastPongTime"] = Date.now();
}

function newPlayerDataObject(){
    return {value: 0, lastPongTime: Date.now(), nickname: "", hidden: false};
}

function deletePlayer(playerId){ 
    hidePlayer(playerId);
    delete players[playerId];  
}

function hidePlayer(playerId){
    let playerData = players[playerId];
    playerData["hidden"] = true;
    let element = document.querySelector('[player_data_id=\"' + playerId + '\"]');;
    element.parentNode.removeChild(element);
} 

function counterPlus(event){
    setCounterValueByEvent(event, 1, true);
}

function counterMinus(event){
    setCounterValueByEvent(event, -1, true);
}

function counterValueInputChange(event){
    let value = parseInt(event.target.value);
    setCounterValueByEvent(event, value);
}

function setCounterValueByEvent(event, value, isValueDelta = false){
    let playerId = getPlayerIdByValueChangeEvent(event);
    if (!playerId){
        console.log("Can't find player id by value change event");
        return;
    }
    let currentValue = isValueDelta ? tryGetPlayerPropertyValue(playerId, "value") : 0;
    if (currentValue === false){
        console.log("Can't get value of counter " + playerId);
        return;        
    }
    if (trySetPlayerPropertyValue(playerId, "value", currentValue + value)){
        updateCounterPresentation(playerId);
        updatePlayerRemoteOverlayData(playerId);
        updateCookies();
    }
    else{
        console.log("Can't set value of counter " + playerId);
    }
}

function tryGetPlayer(playerId){
    let result = undefined;
    if (players.hasOwnProperty(playerId)){
        result = players[playerId];
    }
    else{
        console.log("Can't find player by id " + playerId);    
    }
    return result;
}

function tryGetPlayerPropertyValue(playerId, valueName){
    let result = undefined;
    let player = tryGetPlayer(playerId);
    if (player){
        if(player.hasOwnProperty(valueName)){
            result = player[valueName];
        }
        else{
            console.log("Can't find property " + valueName + " of counter " + playerId);    
        }
    }
    else{
        console.log("Can't find counter by id " + playerId);
    }
    return result;
}

function trySetPlayerPropertyValue(playerId, property, value){
    let result = false;
    let player = tryGetPlayer(playerId);
    if (player){
        player[property] = (value);
        result = true;
    }
    else{
        console.log("Can't find counter by id " + playerId);
    }
    return result;
}

function getParentPlayerSettingsDiv(element){
    let currentElement = element.parentElement;
    while (currentElement && currentElement.tagName.toUpperCase() == "DIV"){
        if (currentElement.getAttribute("class") == "playerSettings"){
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }
    return undefined;
}

function getPlayerIdByValueChangeEvent(event){
    let playerNode = getParentPlayerSettingsDiv(event.target);
    return playerNode.getAttribute('player_data_id');
}

function updateNicknamePresentation(playerId){    
    let nickname = tryGetPlayerPropertyValue(playerId, "nickname");
    if (nickname === false){
        console.log("Can't get nickname of player " + playerId);
        return;
    }

    let playerDataNode = document.querySelector('[player_data_id=\"' + playerId + '\"]');

    if(playerDataNode == null){
        console.log("Can't find player data node " + playerId);
        return;
    }

    let nicknameInputs = playerDataNode.getElementsByClassName("nicknameInput");

    if (nicknameInputs.length > 0){
        nicknameInputs[0].value = nickname;
    }
    else{
        console.log("Can't find node by class name nicknameInput for player " + playerId);
    }

}

function updateCounterPresentation(playerId){    
    let value = tryGetPlayerPropertyValue(playerId, "value");
    if (value === false){
        console.log("Can't get value of counter " + playerId);
        return;
    }
    
    let playerDataNode = document.querySelector('[player_data_id=\"' + playerId + '\"]');

    if(playerDataNode == null){
        console.log("Can't find player data node " + playerId);
        return;
    }

    let valueInputs = playerDataNode.getElementsByClassName("counterValueInput");

    if (valueInputs.length > 0){
        valueInputs[0].value = value;
    }
    else{
        console.log("Can't find node by class name counterValueInput for player " + playerId);
    }
}

function updatePlayerRemoteOverlayData(playerId){
    let messageData = new Object;
    messageData.command = "update_player";
    messageData.value = players[playerId].value;
    messageData.nickname = players[playerId].nickname;
    messageData.id = playerId;
    broadcastChannel.postMessage(messageData);
}

function handleKeyDownEvent(event){
    if (event.keyCode === 13){
        event.target.blur();
    }
}

function handleCounterValueClickEvent(event){
    event.target.select();
}

function nicknameValueInputChange(event){
    let playerId = getPlayerIdByValueChangeEvent(event);
    if (!playerId){
        console.log("Can't find player id by value change event");
        return;
    }
    trySetPlayerPropertyValue(playerId, "nickname", event.target.value); 
    updatePlayerRemoteOverlayData(playerId);
    updateCookies(); 
}

function updateCookies(){
    if (!document.cookie){
        document.cookie = "path=/";
    }
    let jsonValue = JSON.stringify(players);
    let uriEncodedValue = encodeURIComponent(jsonValue);
    document.cookie = "players=" + uriEncodedValue;
}

function loadCookies(){
    let cookies = document.cookie.replace(" ", "").split(";");
    cookies.forEach((el)=>{
        let keyValue = el.split("="); 
        if(keyValue[0] == "players"){
            players = JSON.parse(decodeURIComponent(keyValue[1]));
            console.log(players);
        }
    });
}

function sortChildsByAttributeValue(parentElement, attributeName, ignoreHidden = true){
    var attrValues = [];
    let childArray = Array.prototype.slice.call(parentElement.childNodes);
    
    
    for(let index = 0; index < childArray.length; index++){
        let child = childArray[index];
        if (child.nodeType != Node.TEXT_NODE && child.hasAttribute(attributeName) && (!child.hidden || !ignoreHidden)){
            attrValues.push(child.getAttribute(attributeName));
        }
    };
    let sortedAttrValues = quicksort(attrValues);
    for(let index = 0; index < sortedAttrValues.length; index++){
        let attrValue = sortedAttrValues[index];
        var curElement = parentElement.querySelector('[' + attributeName + '=\"' + attrValue + '\"]');
        parentElement.removeChild(curElement);
        parentElement.appendChild(curElement);
    }
}

function quicksort(array, ascending = true) {
    if (array.length <= 1) {
      return array;
    }
  
    var pivot = array[0];
    
    var left = []; 
    var right = [];
  
    for (var i = 1; i < array.length; i++) {
      array[i] < pivot && ascending || array[i] > pivot && !ascending ? left.push(array[i]) : right.push(array[i]);
    }
  
    return quicksort(left).concat(pivot, quicksort(right));
  };