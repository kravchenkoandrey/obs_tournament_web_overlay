const broadcastChannel = new BroadcastChannel("obs_tournament_broadcast_channel");
var timeRemaining = 0;
var timerEndTime = 0;
var timerIntervalId = undefined;
var counters = new Object;
const counterPingTimeout = 2000;
const counterPingInterval = 500;

addEvent(document, "load", ()=>{
    initializeOnLoad();
});

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
    
    //
    broadcastChannel.postMessage({command: "update_timer", value: timeRemaining});
    //
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

function handleCounterConnectionCommand(timerId){
    if (!counters.hasOwnProperty(timerId)){
        let counterSection = document.getElementById("countersSection");
        let counterSettingsElement = document.getElementById("counterSettingsTemplate").cloneNode(true);
        counterSettingsElement.id = timerId;
        counterSettingsElement.removeAttribute("hidden");
        
        let ids = counterSettingsElement.getElementsByClassName("counterIdInput");
        if (ids.length > 0){
            ids[0].value = timerId;
        }
        
        counterSection.appendChild(counterSettingsElement);
        counters[timerId] = newCounterDataObject();
    }
}

function addEvent(elem, evType, fn) {
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, {"once": true, "capture": true});
	}
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evType, fn);
	}
	else {
		elem['on' + evType] = fn;
	}
}

function initializeOnLoad(){
    broadcastChannel.addEventListener("message", (event)=>{
        if(event.data.command == "connect_counter"){
            handleCounterConnectionCommand(event.data.value);
        }
        else if(event.data.command == "pong_from_counter"){
            handlePongFromCounter(event.data.value);
        }
    });

    broadcastChannel.postMessage({command: "notify_dashboard_ready"});
    setInterval(pingCounters, counterPingInterval);
    setInterval(checkPongs, counterPingInterval);
}

function pingCounters(){
    broadcastChannel.postMessage({command: "ping_counters"});    
}

function handlePongFromCounter(counterId){
    if (counters.hasOwnProperty(counterId)){
        counters[counterId]["lastPongTime"] = Date.now();
    }
}

function newCounterDataObject(){
    return {value: 0, lastPongTime: Date.now()};
}

function checkPongs(){
    let curTime = Date.now();
    let ids = Object.keys(counters);
    ids.forEach(id => {
        let element = counters[id];
        if (element.hasOwnProperty("lastPongTime")){
            if (curTime - element["lastPongTime"] > counterPingTimeout){
                deleteCounter(id);
            }
        }
    });
}

function deleteCounter(counterId){
    let element = document.getElementById(counterId);
    element.parentNode.removeChild(element);  
    delete counters[counterId];  
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
    let counterId = getCounterIdByValueChangeEvent(event);
    if (!counterId){
        console.log("Can't find counter id by value change event");
        return;
    }
    let currentValue = isValueDelta ? tryGetCounterValue(counterId, "value") : 0;
    if (currentValue === false){
        console.log("Can't get value of counter " + counterId);
        return;        
    }
    if (trySetCounterValue(counterId, "value", currentValue + value)){
        updateCounterValue(counterId);
    }
    else{
        console.log("Can't set value of counter " + counterId);
    }
}

function tryGetCounter(counterId){
    let result = undefined;
    if (counters.hasOwnProperty(counterId)){
        result = counters[counterId];
    }
    else{
        console.log("Can't find counter by id " + counterId);    
    }
    return result;
}

function tryGetCounterValue(counterId, valueName){
    let result = undefined;
    let counter = tryGetCounter(counterId);
    if (counter){
        if(counter.hasOwnProperty(valueName)){
            result = counter[valueName];
        }
        else{
            console.log("Can't find property " + valueName + " of counter " + counterId);    
        }
    }
    else{
        console.log("Can't find counter by id " + counterId);
    }
    return result;
}

function trySetCounterValue(counterId, valueName, value){
    let result = false;
    let counter = tryGetCounter(counterId);
    if (counter){
        counter[valueName] = value;
        result = true;
    }
    else{
        console.log("Can't find counter by id " + counterId);
    }
    return result;
}

function getCounterIdByValueChangeEvent(event){
    let counterNode = event.target.parentNode.parentNode;
    return counterNode.getAttribute('id');
}

function updateCounterValue(id){    
    let value = tryGetCounterValue(id, "value");
    if (value === false){
        console.log("Can't get value of counter " + counterId);
        return;
    }
    
    let counterNode = document.getElementById(id);
    let valueInputs = counterNode.getElementsByClassName("counterValueInput");

    if (valueInputs.length > 0){
        valueInputs[0].value = (value===NaN, 0, value);
        updateRemoteCounterValue(id, value);
    }
    else{
        console.log("Can't find node by class name counterValueInput for counter " + counterId);
    }
}

function updateRemoteCounterValue(counterId, value){
    let messageData = new Object;
    messageData.command = "update_counter";
    messageData.value = value;
    messageData.id = counterId;
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