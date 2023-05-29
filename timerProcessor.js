const broadcastChannel = new BroadcastChannel("obs_tournament_broadcast_channel");
var timeRemaining = 0;
var timerEndTime = 0;
var timerIntervalId = undefined;

addEvent(document, "DOMContentLoaded", ()=>{
    broadcastChannel.addEventListener("message", (event)=>{
        console.log(event.data);
        if(event.data.command == "update_timer"){
            updateTimerContainerContent(event.data.value);
        }
    })
});

function timestampToString(ts){
    let tsRounded = Math.round(ts/1000)*1000;
    let hours = Math.floor(tsRounded/1000/60/60);
    let minutes = Math.floor((tsRounded-hours*1000*60*60)/1000/60);
    let seconds = Math.floor((tsRounded-hours*1000*60*60-minutes*1000*60)/1000);
    result = lZ(hours) + ":" + lZ(minutes) + ":" + lZ(seconds);
    return result;
}

function updateTimerContainerContent(value){
    content = timestampToString(parseInt(value));
    document.getElementById("timerContainer").textContent = content;
}

function startTimerUpdate(){
    clearInterval(timerIntervalId);
    timerIntervalId = setInterval(updateTimerContainerContent, 1000);
}

function stopTimerUpdate(){
    clearInterval(timerIntervalId);
}

function lZ(number){
    result = number;
    if(number < 10){
        result = "0" + number;
    }
    return result;
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
